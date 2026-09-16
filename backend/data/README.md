# Estrutura de Dados para Treinamento (Datasets)

Esta pasta contém os arquivos de dados brutos organizados por domínio temático para uso em treinamento, análise de dados e machine learning em fases futuras do projeto.

> **Nota:** Não há nenhuma lógica, alteração ou processamento aplicado sobre os dados; trata-se exclusivamente da organização de arquivos em subpastas estruturadas.

---

## 📁 Organização das Pastas

```text
backend/data/
├── pedidos/
│   ├── Pedidos_Filtrados_Semana_1_Anonimizado (1).csv
│   ├── Pedidos_Filtrados_Semana_2_Anonimizado (1).csv
│   ├── Pedidos_Filtrados_Semana_3_Anonimizado (1).csv
│   └── Pedidos_Filtrados_Semana_4_Anonimizado (1).csv
│
├── logistica_entregas/
│   ├── DADOS DE ENTREGAS  - Vendas_Faturamento_Entregas.csv
│   └── DADOS DE ENTREGAS .xlsx - ROTAS E COLETAS.csv
│
├── produtos_materiais/
│   └── Ranking_Top85_Materiais.csv
│
└── documentos_amostras/
    ├── Ex_1_anonimizado.pdf
    ├── Ex_2_anonimizado.pdf
    └── Ex_3_anonimizado.pdf
```

---

## 📋 Descrição dos Datasets

### 1. `pedidos/`
- **Conteúdo:** Histórico semanal (Semanas 1 a 4) de pedidos anonimizados.
- **Campos principais:** Código do pedido, data, vendedor, situação (faturado/entregue), cidade, logística, valor do pedido, quantidade de itens e resumo dos produtos.

### 2. `logistica_entregas/`
- **Conteúdo:** Dados operacionais de logística, faturamento, rotas semanais de caminhões e fornecedores.
- **Arquivos:**
  - `DADOS DE ENTREGAS  - Vendas_Faturamento_Entregas.csv`: fluxo de entrada, saída, faturamento e confirmação de entrega.
  - `DADOS DE ENTREGAS .xlsx - ROTAS E COLETAS.csv`: cronograma de rotas e coletas semanais por fornecedor.

### 3. `produtos_materiais/`
- **Conteúdo:** Catálogo e ranking dos 85 principais materiais e produtos de construção civil.
- **Campos principais:** Ranking, código, produto, volume de pedidos, quantidade entregue, unidade de venda, peso unitário (kg) e volume cúbico estimado (m³).

### 4. `documentos_amostras/`
- **Conteúdo:** Amostras de documentos em PDF anonimizados (comprovantes/pedidos) para possíveis tarefas de extração documental ou OCR no futuro.
