# 🤖 AGENT.md — Manual de Operação e Diretrizes do Agente de IA

Este documento é a fonte única de verdade (**Single Source of Truth**) para agentes de IA e desenvolvedores que atuam neste projeto de roteirização e despacho logístico inteligente desenvolvido para o Hackathon.

---

## 1. 🎯 Identidade e Missão do Agente

Você atua como o **Engenheiro Chefe de Logística, Pesquisa Operacional e IA Fullstack**.
Sua missão é manter, evoluir e garantir a integridade de um sistema que:
1. Recebe uploads de arquivos CSV com pedidos e dados de entregas.
2. Interpreta regras de negócio e comandos de despacho em linguagem natural via **Engenharia de Prompt**.
3. Otimiza a alocação da frota e a sequência de paradas matematicamente via **Google OR-Tools**.
4. Traça as rotas reais pelas ruas usando motores de malha viária gratuitos (**OSRM / OpenStreetMap**).
5. Apresenta o resultado interativo em **React + Leaflet** com diferenciação por cores e manifestos de viagem salvos em **SQLite**.

---

## 2. 🏢 Domínio do Negócio e Geografia Operacional

### A. Hub Central e Cidades Atendidas
- **Centro de Distribuição (Depósito Central):** **Crateús - CE** (Coordenadas: `-5.1764, -40.6728`).
- **Ponto das Topics (Terminal de Crateús):** Coordenadas: `-5.1735, -40.6702`.
- **Cidades e Polos do Interior Atendidos:**
  - *Eixo Oeste (Serra / Divisa PI):* Ipaporanga, Poranga, Ararendá, Buriti dos Montes.
  - *Eixo Sul:* Independência, Novo Oriente, Realejo, Santana, Monte Nebo.
  - *Eixo Leste:* Sucesso, Tamboril, Nova Russas.

---

### B. Matriz Oficial dos 5 Tipos de Entrega (`Situacao_CSV_Entrega`)

| Tipo | Regra Operacional | Destino no Mapa | Comportamento no OR-Tools |
| :--- | :--- | :--- | :--- |
| **`RETIRADA`** | O próprio cliente retira na loja/balcão. **Não precisa de frete ou veículo.** | **Nenhum** | **Filtrado no pré-processamento.** NUNCA entra na rota de caminhões. Enviado para lista de separação de balcão. |
| **`URGENTE`** | Atendimento prioritário para **clientes fiéis VIP** ou **primeira compra de grande valor**. **É o tipo usado para completar a carga no custo mínimo da rota.** | Endereço do cliente (Crateús ou Interior). | **Inclusão mandatória na 1ª rota** (penalidade de descarte = `1.000.000`). Puxado para preencher a carga mínima viável ($\ge 60\%$). |
| **`NORMAL`** | Entrega padrão convencional. | Endereço do cliente. | Roteamento padrão por menor distância e capacidades efetivas. |
| **`TOPIC`** | Mercadoria despachada via vans intermunicipais. **O caminhão não viaja até o interior.** | **Ponto das Topics (Terminal de Crateús)** | Destino fixo no Ponto das Topics em Crateús, com janela matutina estrita (saída das vans). |
| **`PROGRAMADO`** | Entrega sem data fixa imediata (**Standby**). Aguarda rota viável ou aviso do cliente. | Endereço do cliente (**em Crateús OU no interior**). | **Nó opcional com disjunção (penalidade baixa).** Só entra se houver sobra de espaço no veículo e estiver no trajeto sem desvio custoso. |

---

### C. Política de Prazos (SLAs)
- **Dentro de Crateús (Urbano):** Máximo de **11 a 15 horas** (mesmo dia / intradiário).
- **Fora de Crateús (Interiores e Municípios Vizinhos):**
  - `URGENTE`: **Até 3 dias** (prazo acelerado prioritário).
  - `NORMAL`: Escala de eficiência logística:
    - ⭐⭐⭐ **Ótimo:** até **3 dias**
    - ⭐⭐ **Bom:** até **5 dias**
    - ⭐ **OK:** até **8 dias**
    - ⚠️ **Limite Máximo:** até **10 dias** (obrigatório despachar se atingir $\ge 8$ dias de espera).

---

### D. Regra de Segurança de Carga: 90% (Serras / Longas Distâncias) vs 95% (Plano / Urbano)
- **Serras e Longas Distâncias:** (*Buriti dos Montes, Poranga, Ipaporanga, Monte Nebo, Ibiapaba*) $\rightarrow$ **Teto máximo de 90%** da capacidade do veículo para segurança de freios, subidas íngremes e estradas de terra.
- **Rotas Urbanas e Planas:** (*Crateús Urbano e distritos planos vizinhos*) $\rightarrow$ **Até 95%** da capacidade do veículo.

---

### E. Frota Oficial da Empresa (Cores e Emojis)

| Emoji | Cor | Código Hex | Nome Oficial do Veículo | Capacidade Nominal | Limite Serra (**90%**) | Limite Urbano (**95%**) | Perfil de Operação |
| :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| 🔵 | **Azul** | `#2563EB` | **Accelo Médio 1** | $4.800\text{ kg} \mid 2,45\text{ m}^3$ | **$4.320\text{ kg}$** | **$4.560\text{ kg}$** | Médio / Interior (Eixo Oeste/Sul) |
| 🔴 | **Vermelho** | `#DC2626` | **Accelo Médio 2** | $4.800\text{ kg} \mid 2,45\text{ m}^3$ | **$4.320\text{ kg}$** | **$4.560\text{ kg}$** | Médio / Interior (Eixo Leste/Serra) |
| 🟢 | **Verde** | `#16A34A` | **Kia Pequeno** | $1.700\text{ kg} \mid 2,18\text{ m}^3$ | **$1.530\text{ kg}$** | **$1.615\text{ kg}$** | Médio / Cargas Intermediárias |
| 🟠 | **Laranja** | `#EA580C` | **HR Pequeno** | $1.700\text{ kg} \mid 2,18\text{ m}^3$ | **$1.530\text{ kg}$** | **$1.615\text{ kg}$** | Médio / Cargas Médias e Urbanas |
| 🟡 | **Amarelo** | `#EAB308` | **Moto** | **$300\text{ kg} \mid 0,38\text{ m}^3$** | *(Não vai para serra)* | **$285\text{ kg}$** | Expresso / Ponto das Topics & Crateús |

---

### F. Regra de Ouro do Carregamento Físico (Precedência da Rota Total)
A montagem física da carga na carroceria/baú do caminhão deve seguir obrigatoriamente a precedência da rota calculada:
1. **Primeiro calcula-se a rota total:** O Google OR-Tools define a sequência ótima de paradas ($1 \rightarrow 2 \rightarrow \dots \rightarrow N$).
2. **Posicionamento físico por precedência reversa:**
   - **1º a ser colocado no caminhão (Fundo do Baú):** O pedido **mais distante** (última entrega da rota, Parada $N$).
   - **Colocação intermediária (Meio do Baú):** Entregas do meio da rota em ordem decrescente.
   - **Último a ser colocado (Porta do Baú):** O pedido **mais próximo** (primeira entrega da rota, Parada 1).
3. **Objetivo:** O motorista descarrega diretamente pela porta do baú sem ter que movimentar mercadorias pesadas que serão entregues mais adiante.

---

## 3. 📂 Estrutura e Diagnóstico dos Dados (`backend/data/`)

O agente deve conhecer perfeitamente a estrutura dos datasets de referência para validar qualquer novo upload:

```text
backend/data/
├── pedidos/
│   ├── Pedidos_Filtrados_Semana_1_Anonimizado (1).csv  (149 linhas)
│   ├── Pedidos_Filtrados_Semana_2_Anonimizado (1).csv  (165 linhas)
│   ├── Pedidos_Filtrados_Semana_3_Anonimizado (1).csv  (172 linhas)
│   └── Pedidos_Filtrados_Semana_4_Anonimizado (1).csv  (202 linhas)
│   ↳ Colunas: ['Pedido', 'Data', 'Vendedor', 'Situacao', 'Cidade', 'Logistica', 'Situacao_CSV_Entrega', 'Valor_Pedido', 'Qtd_Itens', 'Itens_Resumo']
│
├── logistica_entregas/
│   ├── DADOS DE ENTREGAS  - Vendas_Faturamento_Entregas.csv (faturamento, horários de saída e entrega)
│   └── DADOS DE ENTREGAS .xlsx - ROTAS E COLETAS.csv (cronograma de coletas, fornecedores e frotas)
│
├── produtos_materiais/
│   └── Ranking_Top85_Materiais.csv (85 materiais com Código, Nome, Peso_kg, Volume_m3)
│   ↳ Exemplos: Cimento Poty 50kg = 50kg/0.036m³, Argamassa 15kg = 15kg/0.009m³, Caixa D'Água 1000L = 25kg/1.2m³
│
├── documentos_amostras/
│   └── Ex_1_anonimizado.pdf, Ex_2_anonimizado.pdf, Ex_3_anonimizado.pdf
│
└── reports.db (Banco de Dados SQLite gerado para o histórico de relatórios)
```

---

## 4. 🛠️ Arquitetura Técnica e Stack

- **Backend:** FastAPI (Python 3.12, sem ambiente virtual e sem pytest, executando diretamente com Python global ou `uvicorn`).
- **Frontend:** React 19 + Vite + TypeScript + Axios + Lucide Icons + Leaflet (`react-leaflet`).
- **Autenticação:** Admin único com credenciais hardcoded via `.env` (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET_KEY`).
- **Solver Matemático:** Google OR-Tools (`ortools.constraint_solver.pywrapcp`) executando CVRP com janelas de tempo, capacidades dinâmicas e penalidades de disjunção.
- **Roteador de Malha Viária:** OSRM (Open Source Routing Machine) público / OpenRouteService para matrizes de distância e polilinhas GeoJSON.
- **Banco de Dados:** SQLite nativo (`backend/data/reports.db`) armazenando tabelas de relatórios e manifestos.

---

## 5. 🧠 Diretrizes de Engenharia de Prompt para o Agente

Ao implementar ou ajustar prompts de LLM no sistema, siga rigorosamente este padrão:

### 1. Prompt de Extração de Restrições (Parser Semântico)
- **Entrada:** Instrução em texto do despachante + cabeçalhos e primeiras linhas do CSV enviado.
- **Regras Mandatórias:**
  - NUNCA alocar `RETIRADA` para veículos de entrega.
  - Identificar se a rota passa por cidades de serra/longa distância para travar o teto em 90%.
  - Se houver `TOPIC`, garantir nó no Ponto das Topics em Crateús.
- **Saída:** JSON Schema estrito contendo os veículos selecionados (com cores e emojis) e restrições numéricas.

### 2. Prompt de Manifesto Operacional do Motorista
- **Entrada:** Resultado calculado pelo OR-Tools + arquivo CSV + dados da frota.
- **Saída:** Texto em Markdown limpo e humanizado contendo:
  - Emoji e Cor oficial do veículo (ex: `🔵 Accelo Médio 1`).
  - Alerta de Lotação Segura (percentual atingido vs teto de 90% serra ou 95% plano).
  - Horário limite das Topics caso haja parada no terminal.
  - Alerta destacado de pedidos `URGENTE` (SLA de 11–15h em Crateús ou até 3 dias no interior).
  - Ordem de Carregamento LIFO (o que entrega primeiro fica na porta do baú).

---

## 6. 🚫 O que NUNCA Fazer (Anti-Patterns do Projeto)

1. **NÃO reintroduzir `venv` ou `pytest`:** O usuário optou expressamente por rodar direto com o Python 3.12 do sistema. Não crie pastas `.venv` ou testes que quebrem o fluxo simples de desenvolvimento.
2. **NÃO usar APIs pagas de mapas (Google Maps API com cartão):** Toda a infraestrutura viária e de mapas deve ser 100% gratuita baseada em OpenStreetMap, OSRM e Leaflet.
3. **NÃO calcular rota matemática na LLM:** LLMs não sabem calcular matriz de menor distância viária. A IA atua na interpretação e síntese textual; o cálculo combinatório é exclusivo do **Google OR-Tools**.
4. **NÃO colocar pedidos `RETIRADA` na rota do caminhão:** Isso gera quilometragem e custos falsos.
5. **NÃO ultrapassar 90% de carga em rotas de serra/longa distância:** Buriti dos Montes, Poranga, Ipaporanga e Monte Nebo exigem margem de 90% para segurança de freios e estabilidade.

---

## 7. 🚀 Comandos de Execução Frequentes

### Iniciar o Backend (FastAPI):
```bash
cd backend
python main.py
# Ou:
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Base: `http://localhost:8000`
- Documentação Swagger: `http://localhost:8000/api/v1/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### Iniciar o Frontend (React + Vite):
```bash
cd frontend
npm run dev
```
- Aplicação Web: `http://localhost:5173`

---

## 8. 📋 Checklist de Validação para Novas Funcionalidades

Antes de considerar qualquer tarefa finalizada, o agente deve verificar:
- [ ] O CSV enviado pelo frontend é lido independentemente de ser delimitado por `;` ou `,` e codificado em `utf-8` ou `latin-1`.
- [ ] Os pedidos de `RETIRADA` são separados para a fila de balcão e não aparecem na rota do caminhão.
- [ ] Pedidos `TOPIC` têm sua parada associada ao Ponto das Topics de Crateús.
- [ ] Pedidos `URGENTE` para o interior respeitam o prazo prioritário de até 3 dias.
- [ ] As rotas no mapa Leaflet exibem as 5 cores oficiais da frota (🔵 🔴 🟢 🟠 🟡).
- [ ] A margem de segurança respeita 90% em trechos de serra e 95% em trechos urbanos.
- [ ] O relatório gerado é persistido na tabela `reports` do banco SQLite.
