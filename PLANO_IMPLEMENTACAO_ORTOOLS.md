# 🗺️ Plano de Implementação: Otimização Dinâmica de Rotas via Upload de CSVs (Google OR-Tools & Engenharia de Prompt)

Este documento define a arquitetura e o plano de implementação do sistema de roteirização logística, calibrado com:
- **Autenticação Administrativa Segura:** Login único de Admin com credenciais hardcoded via `.env`.
- **Persistência de Relatórios em SQLite:** Armazenamento do histórico de manifestos, métricas e trajetos calculados em banco local.
- **Matriz Oficial dos 5 Tipos de Entrega:** Incluindo regra de **`URGENTE` para fora da cidade com SLA acelerado de até 3 dias** (vs 11–15h em Crateús).
- **Frota Oficial Colorida com Emojis:** 🔵 Accelo Grande 1, 🔴 Accelo Grande 2, 🟢 Kia Pequeno, 🟠 HR Pequeno e 🟡 **Moto com capacidade ajustada para $300\text{ kg}$**.
- **Regra de Segurança de Carga:** 90% para trechos de serra e longas distâncias vs 95% para trajetos planos e urbanos.

---

## 1. 🔐 Autenticação Administrativa (Admin via `.env`)

O acesso ao sistema será restrito ao administrador/operador logístico da empresa, sem necessidade de banco de usuários complexo:

### A. Configuração no `.env` do Backend:
```env
# Credenciais do Administrador
ADMIN_USERNAME=admin
ADMIN_PASSWORD=hackathon_admin_2026
JWT_SECRET_KEY=chave_secreta_super_segura_hackathon_2026_jwt
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### B. Fluxo de Autenticação (`backend/app/api/v1/endpoints/auth.py`):
1. **Endpoint `POST /api/v1/auth/login`**:
   - Recebe `username` e `password`.
   - Compara diretamente com as variáveis `ADMIN_USERNAME` e `ADMIN_PASSWORD` definidas no `.env`.
   - Se válidas, gera um token JWT de sessão (ou Bearer Token).
   - Se inválidas, retorna `401 Unauthorized` (*"Usuário ou senha incorretos"*).
2. **Endpoint `GET /api/v1/auth/me`**:
   - Valida o token e confirma se a sessão está ativa.
3. **Frontend (React + Vite)**:
   - Tela de Login inicial limpa e responsiva.
   - Contexto de Autenticação (`AuthContext.tsx`) armazenando o token no `localStorage`.
   - Bloqueio de rotas: o usuário só acessa o upload de CSV, mapa e relatórios após login.

---

## 2. 🗄️ Persistência de Relatórios em Banco de Dados SQLite

Cada otimização de rota gerada gera um registro completo salvo automaticamente em um banco local **SQLite** (`backend/data/reports.db`), permitindo consulta de histórico, auditoria e reabertura de rotas no mapa:

### A. Estrutura da Tabela `reports` (SQLite):
```sql
CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    filename TEXT NOT NULL,
    user_prompt TEXT,
    total_orders INTEGER NOT NULL,
    total_weight_kg REAL NOT NULL,
    total_distance_km REAL NOT NULL,
    manifest_markdown TEXT NOT NULL,
    routes_json TEXT NOT NULL,
    vehicles_used TEXT NOT NULL
);
```

### B. Endpoints de Relatórios (`backend/app/api/v1/endpoints/reports.py`):
| Método | Rota | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/reports` | Lista o histórico com data, arquivo, quantidade de pedidos, km total e veículos usados. |
| `GET` | `/api/v1/reports/{id}` | Recupera o relatório completo com o manifesto Markdown e GeoJSON para renderizar no Leaflet. |
| `DELETE` | `/api/v1/reports/{id}` | Exclui um relatório do histórico. |

---

## 3. 📦 Matriz Oficial dos 5 Tipos de Entrega & Políticas de SLA

| Tipo de Entrega | Regra de Negócio & SLA | Destino Geográfico | Tratamento no Google OR-Tools |
| :--- | :--- | :--- | :--- |
| **`RETIRADA`** | O próprio cliente retira na loja/balcão. **Não necessita de frete ou caminhão.** | Nenhum (fora da rota). | **Filtrado no pré-processamento.** Não entra no grafo de veículos. Enviado diretamente para a lista de separação interna da loja. |
| **`URGENTE`** | Atendimento prioritário para **clientes fiéis VIP** ou **primeira compra de grande valor**. **É o tipo de pedido utilizado para completar a carga no custo mínimo da rota**: <br>• **Dentro de Crateús:** Entrega no mesmo dia em **11 a 15 horas**.<br>• **Fora da Cidade (Interior):** Prazo acelerado em **até 3 dias** (ao invés do normal que vai até 10 dias). | Endereço do cliente (Crateús ou Interior). | **Inclusão prioritária obrigatória e gatilho para completar carga.** Puxado estrategicamente para preencher a capacidade do veículo e viabilizar o custo do frete. Penalidade extrema de descarte (`penalidade = 1.000.000`). |
| **`NORMAL`** | Entrega padrão convencional. Segue o agrupamento semanal regular. | Endereço do cliente. | Roteamento por menor custo/distância com base nas capacidades efetivas de peso ($kg$) e volume ($m^3$). |
| **`TOPIC`** *(ou Topique / Carro Horário)* | Mercadoria despachada via vans intermunicipais. **O caminhão da empresa não viaja até o interior.** | **Ponto das Topics (Terminal de Crateús)**. | O destino é fixado nas coordenadas do **Terminal das Topics em Crateús**, com janela de tempo matutina (horário de saída das vans, ex: até as 10:00h). |
| **`PROGRAMADO`** | Entrega sem data fixa imediata (**Standby**). Aguarda consolidação de carga ou sinalização do cliente (seja na cidade ou no interior). | Endereço do cliente (**dentro da cidade em Crateús OU no interior**). | **Nó opcional com disjunção.** Só entra na rota se houver sobra de espaço no veículo (urbano ou de interior) e a rota passar perto da localidade sem desvio custoso. |

---

## 4. ⏱️ Prazos (SLAs), Custo Mínimo e Margens de Carga

### A. Tabela Geral de Prazos (SLAs):
- **Crateús (Urbano):**
  - `URGENTE` / `NORMAL`: Máximo de **11 a 15 horas** (mesmo dia / intradiário).
- **Interiores e Cidades Vizinhas (Ipaporanga, Poranga, Ararendá, Buriti dos Montes, etc.):**
  - `URGENTE`: **Até 3 dias** (SLA Acelerado Obrigatório).
  - `NORMAL`: Escala de eficiência logística:
    - ⭐⭐⭐ **Ótimo:** até **3 dias**
    - ⭐⭐ **Bom:** até **5 dias**
    - ⭐ **OK:** até **8 dias**
    - ⚠️ **Limite Máximo:** até **10 dias**

### B. Custo Mínimo e Viabilidade Econômica (Consolidação de Carga):
- Caminhões pesados (**Accelo Grande 1 e 2**) só devem partir para o interior se atingirem **taxa de ocupação mínima** ($\ge 60\%$ da capacidade) OU se o valor dos pedidos cobrir o combustível.
- **Papel do Pedido URGENTE no Custo Mínimo:** São os pedidos com status **`URGENTE`** que são utilizados estrategicamente para **completar a carga** do caminhão! A presença de pedidos urgentes atua como o gatilho econômico e operacional que viabiliza a saída do veículo para a rota, preenchendo a capacidade ociosa com prioridade de despacho.
- Se o pedido normal mais antigo na região atingir $\ge 8$ dias, o despacho torna-se obrigatório para não estourar o limite de 10 dias de SLA.

### C. ⚠️ Regra de Segurança de Carga: 90% (Serra / Longa Distância) vs 95% (Plano / Urbano):
- **Serras, Trechos Rurais e Longas Distâncias:** *Buriti dos Montes, Poranga, Ipaporanga, Monte Nebo, Ibiapaba* $\rightarrow$ **Máximo de 90%** da capacidade do veículo por segurança mecânica, frenagem e subidas acidentadas.
- **Rotas Urbanas, Planas e Proximidades:** *Crateús Urbano e distritos planos vizinhos* $\rightarrow$ **Até 95%** da capacidade do veículo.

### D. 📦 Ordem de Carregamento Físico no Caminhão (Precedência da Rota Total)
A montagem da carga no baú/carroceria do veículo segue uma regra física estrita após a rota ser calculada pelo Google OR-Tools:
1. **Cálculo Prévio da Rota Total:** Primeiro o sistema calcula a rota completa do início ao fim (Parada 1 $\rightarrow$ Parada 2 $\rightarrow$ ... $\rightarrow$ Parada $N$).
2. **Posicionamento por Precedência Reversa:**
   - **1º a ser colocado no caminhão (Fundo do Baú):** A entrega **mais distante** (última parada da rota: Parada $N$).
   - **Posições intermediárias (Meio do Baú):** As entregas intermediárias em ordem decrescente ($N-1$, $N-2$, ...).
   - **Último a ser colocado no caminhão (Porta / Saída do Baú):** A entrega **mais próxima** (primeira parada da rota: Parada 1).
3. **Benefício Operacional:** O motorista descarrega diretamente na porta sem necessidade de remanejamento de cargas pesadas durante o trajeto.

---

## 5. 🚛 Frota Oficial da Empresa: Veículos, Cores, Emojis e Capacidades

A frota oficial conta com **5 veículos**, cada um com nome e cor atribuídos para visualização nas rotas do mapa e relatórios:

| Emoji | Cor | Código Hex | Nome Oficial do Veículo | Perfil de Operação | Capacidade Nominal | Limite Serra (**90%**) | Limite Urbano (**95%**) |
| :---: | :---: | :---: | :--- | :--- | :---: | :---: | :---: |
| 🔵 | **Azul** | `#2563EB` | **Accelo Grande 1** | Pesado / Rotas de Interior (Eixo Oeste/Sul) | $4.800\text{ kg} \mid 2,45\text{ m}^3$ | **$4.320\text{ kg} \mid 2,20\text{ m}^3$** | **$4.560\text{ kg} \mid 2,33\text{ m}^3$** |
| 🔴 | **Vermelho** | `#DC2626` | **Accelo Grande 2** | Pesado / Rotas de Interior (Eixo Leste/Serra) | $4.800\text{ kg} \mid 2,45\text{ m}^3$ | **$4.320\text{ kg} \mid 2,20\text{ m}^3$** | **$4.560\text{ kg} \mid 2,33\text{ m}^3$** |
| 🟢 | **Verde** | `#16A34A` | **Kia Pequeno** | Médio / Cargas Intermediárias e Interior Próximo | $1.700\text{ kg} \mid 2,18\text{ m}^3$ | **$1.530\text{ kg} \mid 1,96\text{ m}^3$** | **$1.615\text{ kg} \mid 2,07\text{ m}^3$** |
| 🟠 | **Laranja** | `#EA580C` | **HR Pequeno** | Médio / Urgências e Cargas Médias Urbanas | $1.700\text{ kg} \mid 2,18\text{ m}^3$ | **$1.530\text{ kg} \mid 1,96\text{ m}^3$** | **$1.615\text{ kg} \mid 2,07\text{ m}^3$** |
| 🟡 | **Amarelo** | `#EAB308` | **Moto** | Expresso / Ponto das Topics & Urgências Urbanas | **$300\text{ kg} \mid 0,38\text{ m}^3$** | *(Não vai para serra)* | **$285\text{ kg} \mid 0,36\text{ m}^3$** |

---

## 6. 🏛️ Arquitetura do Sistema Atualizada

```mermaid
flowchart TD
    subgraph Auth ["Autenticação (.env)"]
        User["Admin"] -->|"Login (user/pass do .env)"| Token["Token JWT"]
    end

    subgraph Frontend ["Frontend (React + Vite)"]
        Token --> Dash["Dashboard do Administrador"]
        Dash --> Up["Upload de CSV e Prompt do Despachante"]
        Dash --> Hist["Aba: Histórico de Relatórios (SQLite)"]
    end

    subgraph Backend ["Backend (FastAPI)"]
        Up --> Parser["CSV Parser & Classificador dos 5 Tipos"]
        
        Parser -->|"Filtro 1: RETIRADA"| F1["Separação Interna de Balcão"]
        Parser -->|"Filtro 2: TOPIC"| F2["Destino -> Ponto das Topics em Crateús"]
        Parser -->|"Filtro 3: URGENTE"| F3["Aloca na Rota Prioritária (Crateús 11-15h / Interior 3d)"]
        Parser -->|"Filtro 4: PROGRAMADO"| F4["Fila de Standby"]
        Parser -->|"Filtro 5: NORMAL"| F5["Roteamento Regular"]
        
        F2 & F3 & F4 & F5 --> OSRM["OSRM: Matriz de Distâncias Reais"]
        F2 & F3 & F4 & F5 --> Demands["Vetor de Demandas (kg/m³)"]
        
        OSRM --> Safety["Fator de Segurança (90% Serra vs 95% Plano)"]
        Safety & Demands --> ORTools["Google OR-Tools: CVRPTW Multiveículo"]
        
        ORTools --> LLM["Prompt 3: Manifesto Operacional da Rota"]
        ORTools & LLM --> DB["Salva Relatório no SQLite (reports.db)"]
    end

    DB --> Hist
    ORTools & LLM --> Map["Mapa Leaflet com Rotas Coloridas (🔵 🔴 🟢 🟠 🟡)"]
```

---

## 7. 🧠 Engenharia de Prompt Atualizada

### Prompt 1: Extrator Semântico de Restrições e SLA de Urgência
```markdown
Você é o Especialista em Logística da Distribuidora em Crateús-CE.
Configure os parâmetros para o solucionador Google OR-Tools considerando:

1. Frota Disponível:
   - 🔵 Azul: Accelo Grande 1 (4.800 kg)
   - 🔴 Vermelho: Accelo Grande 2 (4.800 kg)
   - 🟢 Verde: Kia Pequeno (1.700 kg)
   - 🟠 Laranja: HR Pequeno (1.700 kg)
   - 🟡 Amarelo: Moto (300 kg | 0.38 m³)
2. Regras de SLA de Urgência:
   - URGENTE dentro de Crateús: prioridade no mesmo dia (11h-15h).
   - URGENTE para o interior: deve ser entregue em até 3 dias (prazo acelerado prioritário).
3. Fator de Segurança:
   - 90% para destinos de serra/longa distância (Buriti dos Montes, Poranga, Ipaporanga, Monte Nebo).
   - 95% para trajetos urbanos ou planos.

Entrada: "{{ USER_DISPATCH_PROMPT }}"
Cidades: {{ CITIES_IN_BATCH }}

Gere o JSON estrito com os veículos ativados e parâmetros do solver.
```

---

### Prompt 3: Manifesto Operacional com Cores e Alerta de SLA
```markdown
Você é o Chefe de Expedição do Centro de Distribuição em Crateús-CE.
Gere o Manifesto de Carga da frota para os veículos ativados (🔵 Accelo 1, 🔴 Accelo 2, 🟢 Kia, 🟠 HR, 🟡 Moto).

O documento DEVE conter:
1. 🚚 Identificação do Veículo: Emoji, Cor e Nome Oficial.
2. ⚖️ Medidor de Segurança de Carga: Percentual ocupado vs teto seguro (90% serra ou 95% plano). Para Moto: limite máximo de 300 kg.
3. 🚐 Paradas no Ponto das Topics de Crateús (com horário limite da van).
4. 🔴 Alertas de Pedidos URGENTES:
   - Crateús: entrega prevista em até 11-15 horas.
   - Interior: entrega urgente em até 3 dias.
5. 📦 Ordem de Carregamento na Carroceria (LIFO: primeira entrega na porta do baú).
6. 📊 Score de Prazo do Interior: Classificar entregas normais em ÓTIMA (até 3d), BOA (até 5d), OK (até 8d) ou LIMITE (até 10d).

Formate em Markdown executivo para compartilhamento no WhatsApp e arquivo no SQLite.
```

---

## 8. 💻 Interface no Frontend (React + Leaflet + Histórico)

1. **Tela de Login do Administrador:**
   - Formulário de acesso rápido (usuário e senha do `.env`).
2. **Dashboard de Otimização:**
   - Upload de CSV com prévia e tabela de conferência dos 5 tipos.
   - Botão para disparar o cálculo com barra de progresso.
   - Mapa Leaflet com traçados nas cores oficiais: 🔵 Azul, 🔴 Vermelho, 🟢 Verde, 🟠 Laranja e 🟡 Amarelo.
3. **Aba "Histórico de Relatórios" (SQLite):**
   - Tabela com todos os despachos calculados salvos no banco.
   - Botão `[Visualizar Rota no Mapa]` (recarrega os GeoJSONs antigos no mapa).
   - Botão `[Ver Manifesto Markdown]` e `[Baixar CSV da Rota]`.

---

## 9. 📅 Roteiro de Entrega Final Atualizado

- **Fase 1:** Configuração da autenticação Admin via `.env` (JWT) e criação do banco SQLite para relatórios.
- **Fase 2:** Parser de CSV com classificação dos 5 tipos (`RETIRADA`, `URGENTE`, `NORMAL`, `TOPIC`, `PROGRAMADO`) e regras de SLA (11-15h Crateús vs 3d urgente interior).
- **Fase 3:** Solver Google OR-Tools com a frota oficial: Accelo Grande 1 (🔵), Accelo Grande 2 (🔴), Kia Pequeno (🟢), HR Pequeno (🟠) e Moto 300 kg (🟡), com limites de 90% em serras e 95% no plano.
- **Fase 4:** Prompts LLM e persistência automática dos relatórios calculados no SQLite.
- **Fase 5:** Interface React interativa com tela de login, mapa Leaflet colorido e tela de histórico de relatórios salvos.
