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

### E. Frota Oficial da Empresa (Cores, Emojis e Placas de Simulação)

Para evitar qualquer ambiguidade operacional no pátio e na expedição (especialmente entre os dois caminhões médios do mesmo modelo e entre os utilitários pequenos), cada veículo possui uma **placa de simulação padronizada** além de sua cor e emoji:

| Emoji | Cor | Código Hex | Placa Simulada | Nome Oficial do Veículo | Capacidade Nominal | Limite Serra (**90%**) | Limite Urbano (**95%**) | Perfil de Operação |
| :---: | :---: | :---: | :---: | :--- | :---: | :---: | :---: | :--- |
| 🔵 | **Azul** | `#2563EB` | `CRA-1A01` | **Accelo Médio 1** | $4.800\text{ kg} \mid 2,45\text{ m}^3$ | **$4.320\text{ kg}$** | **$4.560\text{ kg}$** | Médio / Interior (Eixo Oeste/Sul) |
| 🔴 | **Vermelho** | `#DC2626` | `CRA-2B02` | **Accelo Médio 2** | $4.800\text{ kg} \mid 2,45\text{ m}^3$ | **$4.320\text{ kg}$** | **$4.560\text{ kg}$** | Médio / Interior (Eixo Leste/Serra) |
| 🟢 | **Verde** | `#16A34A` | `CRA-3C03` | **Kia Pequeno** | $1.700\text{ kg} \mid 2,18\text{ m}^3$ | **$1.530\text{ kg}$** | **$1.615\text{ kg}$** | Médio / Cargas Intermediárias |
| 🟠 | **Laranja** | `#EA580C` | `CRA-4D04` | **HR Pequeno** | $1.700\text{ kg} \mid 2,18\text{ m}^3$ | **$1.530\text{ kg}$** | **$1.615\text{ kg}$** | Médio / Cargas Médias e Urbanas |
| 🟡 | **Amarelo** | `#EAB308` | `CRA-5E05` | **Moto Titan 160 Start** | **$300\text{ kg} \mid 0,3833\text{ m}^3$** | *(Não vai para serra)* | **$285\text{ kg}$** | Expresso / Ponto das Topics & Crateús urbano (Titan 160 Start) |

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

### G. Roteamento Inteligente: Entre-Localidades vs. Rota Detalhada Intra-Urbana
O motor de geocodificação e o solucionador OR-Tools aplicam inteligência espacial adaptativa aos dados de entrega:
1. **Caso 1: CSV contém apenas a cidade/localidade (ex: `CRATEUS`, `IPAPORANGA`, `SANTANA`):**
   - Os pedidos são consolidados diretamente no **polo central da localidade** (`is_intra_city = False`, `route_type = 'POLO_LOCALIDADE'`).
   - A distância entre paradas na mesma cidade sem endereço é tratada como **$0\text{ metros}$**, evitando deslocamentos fictícios no mapa.
   - O algoritmo calcula a rota estritamente **entre localidades** (rodoviária de polo a polo), otimizando a viagem intermunicipal.
2. **Caso 2: CSV contém endereço, bairro ou via dentro da cidade (ex: `CRATEUS - SAO VICENTE`, `VENANCIOS`, `RUA CEL ZEZE`):**
   - O pedido é identificado como endereço urbano específico (`is_intra_city = True`, `route_type = 'URBANO_DETALHADO'`).
   - As distâncias entre os nós da mesma cidade são calculadas pela **malha viária urbana real** (fator de quarteirões Manhattan de $1,414$ e velocidade média urbana de $25\text{ km/h}$, ou OSRM).
   - O Google OR-Tools faz **todo o cálculo da melhor rota DENTRO da cidade** (rua a rua / bairro a bairro), eliminando ziguezagues e percursos redundantes, **além do percurso entre as cidades**.

---

### H. As 5 Estratégias de Otimização e Despacho
O sistema resolve simultaneamente 5 variações operacionais para que a liderança de logística escolha a que melhor atende à necessidade do momento:
1. **`recomendada` (Melhor Rota / Equilibrada):** Balanço ótimo multiobjetivo entre menores distâncias, janelas prioritárias de SLA e limites seguros de carga.
2. **`menor_custo` (Mais Econômica):** Foco na minimização do custo financeiro total em R$ (soma do combustível gasto e depreciação/custo operacional por quilômetro rodado).
3. **`menor_tempo` (Mais Rápida):** Foco na máxima velocidade de ciclo, minimizando o tempo total em trânsito e equilibrando as jornadas entre motoristas.
4. **`menor_peso` (Carga Leve):** Distribuição equilibrada e suave de peso entre os veículos para minimizar o esforço mecânico em aclives, serras e estradas não pavimentadas.
5. **`menor_volume` (Mais Compacta):** Foco em densidade volumétrica ($m^3$) e compacidade da carga no baú.

---

### I. Fluxo de Decisão em 2 Etapas (Payload Leve e Zero Reprocessamento)
Para evitar que o despachante precise adivinhar qual estratégia deseja antes de ver o impacto nos custos e tempos, o sistema adota um fluxo de decisão em 2 etapas:
1. **Etapa 1 — `POST /api/v1/routing/optimize` (Sem campo `strategy`):**
   - Recebe apenas o arquivo CSV (`file`) e opcionalmente o prompt do operador (`user_prompt`), além de datas opcionais (`start_date`, `end_date`).
   - O Google OR-Tools calcula e resolve as 5 estratégias em lote uma única vez.
   - Os resultados completos de todas as 5 estratégias são serializados e persistidos no SQLite (`reports.db`).
   - O retorno HTTP é um **payload leve e enxuto** contendo o `report_id`, o objeto `recommended_truck`, os metadados do filtro de data e o array `strategies_summary` com os 5 cards comparativos.
2. **Etapa 2 — `GET /api/v1/routing/summary/{report_id}?strategy={strategy_id}` (Detalhamento Sob Demanda):**
   - O operador compara os 5 cards na tela e clica na estratégia de sua preferência (ex: *Menor Custo*).
   - O backend **não executa o OR-Tools novamente**: busca instantaneamente no SQLite os dados calculados da estratégia escolhida.
   - Retorna o JSON estruturado completo contendo:
     - Dados consolidados para geração e renderização do PDF no frontend (valor total, peso, volume, distância, ocupação segura e veículos).
     - Objeto `recommended_truck` com a indicação do veículo ideal.
     - Informações detalhadas de abastecimento e autonomia de combustível.
     - Sequência de paradas e tabela com a **ordem física de carregamento LIFO** (do fundo à porta do baú).
     - Traçado GeoJSON de cada rota para renderização no mapa Leaflet.

---

### J. Gestão de Autonomia e Consumo de Combustível
Cada veículo da frota possui especificações de capacidade de tanque, consumo médio (km/l) e tipo de combustível:
- O sistema calcula o consumo previsto em litros e o custo em R$ considerando o **percurso completo de ida e volta ao Centro de Distribuição em Crateús**.
- Retorna o status de autonomia:
  - `SUFICIENTE`: A rota consome menos de 80% da capacidade total do tanque.
  - `ALERTA_RESERVA`: O percurso consumirá entre 80% e 100% da autonomia máxima.
  - `NECESSITA_ABASTECIMENTO`: A distância excede a capacidade do tanque completo, exigindo parada para reabastecimento.

---

### K. 🚚 Recomendação Inteligente do Melhor Caminhão para a Rota (`recommended_truck`)
O motor de análise avalia a demanda consolidada do lote (peso total em kg, volume em m³, presença de serras e raio de operação) e recomenda de forma proativa o melhor veículo da frota:
- **Critérios de Seleção:**
  - **Moto Titan 160 Start (`CRA-5E05`):** Cargas leves até 285 kg em percursos estritamente urbanos em Crateús ou transporte de urgência ao Ponto das Topics. Não opera em serra.
  - **Kia Pequeno (`CRA-3C03`) / HR Pequeno (`CRA-4D04`):** Cargas intermediárias até 1.530 kg (serra) ou 1.615 kg (plano), oferecendo menor consumo de diesel que caminhões pesados.
  - **Accelo Médio 1 (`CRA-1A01`) ou Accelo Médio 2 (`CRA-2B02`):** Cargas pesadas até 4.320 kg (serra) ou 4.560 kg (plano), ideais para lotes consolidados intermunicipais de grande porte.
- **Campos Retornados no JSON:** `vehicle_id`, `vehicle_name`, `license_plate`, `color`, `hex_color`, `emoji`, `effective_capacity_kg`, `effective_capacity_m3`, `total_batch_weight_kg`, `total_batch_volume_m3`, `estimated_occupancy_percent` e `reason` (justificativa técnica).

---

### L. 📅 Filtragem de Pedidos por Intervalo de Datas (`start_date` e `end_date`)
Permite ao operador fazer upload de planilhas mensais ou consolidadas e restringir a otimização apenas à janela de interesse operacional (ex: apenas a semana atual ou dias pendentes):
- **Parâmetros Opcionais:** `start_date` e `end_date` nos endpoints `POST /api/v1/routing/preview` e `POST /api/v1/routing/optimize`.
- **Formatos Suportados:** `DD/MM/YYYY` (padrão brasileiro do CSV, ex: `01/08/2026`) ou ISO `YYYY-MM-DD`.
- **Comportamento:** Pedidos fora do período informado são desconsiderados antes da roteirização e do dimensionamento da carga.
- **Metadados Retornados:** `date_filter_applied` contendo `start_date`, `end_date`, `total_orders_before_filter`, `orders_retained`, `orders_filtered_out` e flag `applied`.

---

### M. 📍 Resolução Geográfica de Logradouros Urbanos, CEPs e Metadados do IBGE
Para viabilizar a roteirização detalhada rua a rua, o sistema possui integração nativa com os padrões postais e estatísticos brasileiros:
- **Código do Município no IBGE:** `2304103` (Crateús - CE).
- **Faixa de CEPs:** Crateús opera com codificação individualizada por logradouro (faixa `63700-001` a `63708-899`).
- **Colunas Reconhecidas no CSV:** O parser identifica flexivelmente colunas como `Endereco`, `Logradouro`, `Rua`, `Bairro`, `CEP` e `IBGE`.
- **Motor Híbrido de Geocodificação:**
  1. *Catálogo Local Pré-Mapeado (`CRATEUS_CEPS` & `CRATEUS_STREETS`):* Coordenadas calibradas de alta precisão para vias principais (ex: Rua Coronel Zezé, Dr. Moreira da Rocha, Coronel Lúcio, Santos Dumont, Manoel Moreira, Frei Vidal, Padre Macedo).
  2. *Consulta Dinâmica ViaCEP / IBGE:* Busca em tempo real com timeout ultrarrápido (2s) e cache em memória para novas vias.
  3. *Classificação de Rota:* Se o pedido contiver logradouro ou CEP, recebe `is_intra_city = True` e `route_type = 'URBANO_DETALHADO'`. Se contiver apenas a localidade/polo, recebe `is_intra_city = False` e `route_type = 'POLO_LOCALIDADE'`.

---

### N. 🏋️ Regra de Bloqueio de Motos para Cargas Pesadas e Consolidadas
- O limite nominal da **Moto Titan 160 Start (`CRA-5E05`)** é de **$300\text{ kg}$** (e limite seguro urbano de **$285\text{ kg}$**).
- Quando os pedidos individuais no CSV excedem esse teto (ex: múltiplos sacos de cimento de 50 kg ou paletes de piso $\ge 700\text{ kg}$), o Google OR-Tools **bloqueia automaticamente a alocação de motos**, direcionando toda a carga para os caminhões médios (**Accelo Médio 1 e 2**) ou utilitários (**Kia/HR**), garantindo integridade mecânica e conformidade com as leis de trânsito.

---

## 3. 📂 Estrutura e Diagnóstico dos Dados (`backend/data/`)

O agente deve conhecer perfeitamente a estrutura dos datasets de referência para validar qualquer novo upload:

```text
backend/data/
├── pedidos/
│   ├── Pedidos_Filtrados_Semana_1_Anonimizado (1).csv  (149 linhas)
│   ├── Pedidos_Filtrados_Semana_2_Anonimizado (1).csv  (165 linhas)
│   ├── Pedidos_Filtrados_Semana_3_Anonimizado (1).csv  (172 linhas)
│   ├── Pedidos_Filtrados_Semana_4_Anonimizado (1).csv  (202 linhas)
│   └── pedido_teste_rua_cep.csv                        (6 paradas urbanas pesadas em Crateús com CEP e IBGE)
│   ↳ Colunas: ['Pedido', 'Data', 'Vendedor', 'Situacao', 'Cidade', 'Endereco', 'CEP', 'IBGE', 'Logistica', 'Situacao_CSV_Entrega', 'Valor_Pedido', 'Qtd_Itens', 'Itens_Resumo']
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
- [ ] As rotas no mapa Leaflet exibem as 5 cores oficiais da frota (🔵 🔴 🟢 🟠 🟡) com suas placas simuladas (`CRA-1A01` a `CRA-5E05`).
- [ ] A margem de segurança respeita 90% em trechos de serra e 95% em trechos urbanos.
- [ ] O relatório gerado é persistido na tabela `reports` do banco SQLite com os resumos das 5 estratégias.
- [ ] O caminhão recomendado (`recommended_truck`) é devidamente dimensionado com taxa de ocupação e justificativa operacional.
- [ ] A filtragem por intervalo de datas (`start_date` e `end_date`) exclui pedidos fora do escopo sem corromper o cálculo.
- [ ] Endereços urbanos e CEPs (IBGE: `2304103`) são resolvidos como `URBANO_DETALHADO`, acionando a malha viária rua a rua.
- [ ] Cargas com itens individuais acima de 300 kg bloqueiam a moto e são alocadas estritamente para caminhões.
