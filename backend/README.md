# Hackathon Backend (FastAPI)

API REST moderna, modular e de alta performance desenvolvida com **FastAPI**, **Google OR-Tools**, **Google Gemini 3.8 / Live** e **SQLite**.

## 📁 Estrutura de Pastas

```text
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   └── endpoints/      # Controladores/Rotas específicas (health, auth, routing, reports, items)
│   │   └── router.py           # Agregador das rotas da API (/api/v1)
│   ├── core/
│   │   ├── config.py           # Configurações e variáveis de ambiente (.env)
│   │   └── security.py         # Autenticação JWT e proteção de rotas
│   ├── db/
│   │   └── sqlite.py           # Persistência de relatórios e manifestos em SQLite
│   ├── schemas/                # Schemas de validação de entrada/saída (Pydantic v2)
│   │   ├── auth.py
│   │   ├── routing.py
│   │   ├── reports.py
│   │   └── health.py
│   ├── services/               # Camada de regras de negócio
│   │   ├── catalog_service.py  # Estimativa de pesos e volumes via catálogo de materiais
│   │   ├── geocoding_service.py# Coordenadas do Sertão, matrizes de distância e GeoJSON
│   │   ├── fleet_service.py    # Frota oficial de 5 veículos e limites de segurança
│   │   ├── routing_solver.py   # Solver CVRP Google OR-Tools com ordenação LIFO
│   │   ├── routing_service.py  # Orquestrador de upload, validação e otimização
│   │   └── gemini_service.py   # Extração semântica e manifestos operacionais
│   └── main.py                 # Instância FastAPI, ciclo de vida e middlewares CORS
├── data/                       # Arquivos e datasets locais
│   ├── pedidos/                # Pedidos semanais anonimizados em CSV
│   ├── logistica_entregas/     # Vendas, entregas, faturamento e coletas
│   ├── produtos_materiais/     # Catálogo Top 85 materiais (pesos e volumes)
│   ├── documentos_amostras/    # PDFs anonimizados
│   └── reports.db              # Banco SQLite com histórico de otimizações
├── requirements.txt            # Dependências Python
└── main.py                     # Ponto de entrada direto
```

## 🛣️ Endpoints da API

### Autenticação (`/api/v1/auth`)
- `POST /api/v1/auth/login`: Autentica o administrador (`ADMIN_USERNAME` e `ADMIN_PASSWORD` do `.env`) e emite token JWT.
- `GET /api/v1/auth/me`: Retorna o perfil ativo da sessão validando o Bearer Token.

### Roteirização e Despacho (`/api/v1/routing`)
- `GET /api/v1/routing/fleet`: Retorna os 5 veículos oficiais com cores funcionais (🔵, 🔴, 🟢, 🟠, 🟡), emojis e limites de carga (90% serra vs 95% plano).
- `POST /api/v1/routing/preview`: Diagnóstico prévio do arquivo CSV (contagem dos 5 tipos, cidades, peso estimado e pedidos de balcão).
- `POST /api/v1/routing/optimize`: Otimização completa com Google OR-Tools e IA, gerando rotas, sequenciamento LIFO de carregamento, GeoJSON e gravação no banco.

### Relatórios e Histórico (`/api/v1/reports`)
- `GET /api/v1/reports`: Lista o histórico de despachos calculados salvos no SQLite.
- `GET /api/v1/reports/{id}`: Detalhes completos do relatório, incluindo manifesto em Markdown e GeoJSON das rotas.
- `DELETE /api/v1/reports/{id}`: Exclusão de um relatório do histórico.

### Diagnóstico (`/api/v1/health`)
- `GET /api/v1/health`: Estado operacional da API e versão.

## 🚀 Como Executar

### 1. Iniciar o Servidor

```bash
python main.py
# ou:
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **API Base:** [http://localhost:8000](http://localhost:8000)
- **Documentação Swagger:** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Executar a Suíte de Testes Automatizados

```bash
python test_api_suite.py
```
