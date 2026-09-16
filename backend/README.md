# Hackathon Backend (FastAPI)

API REST moderna, assíncrona e modular desenvolvida com **FastAPI** e **Pydantic v2**.

## 📁 Estrutura de Pastas

```text
backend/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   │   └── endpoints/      # Controladores/Rotas específicas (health, items, etc.)
│   │   └── router.py           # Agregador das rotas da API
│   ├── core/
│   │   └── config.py           # Variáveis de ambiente e configurações (Pydantic / .env)
│   ├── schemas/                # Schemas de validação de entrada/saída (Pydantic)
│   ├── services/               # Camada de regras de negócio
│   └── main.py                 # Instância FastAPI, middlewares CORS e ciclo de vida
├── data/                       # Arquivos e datasets para treinamento futuro
│   ├── pedidos/                # Pedidos semanais anonimizados
│   ├── logistica_entregas/     # Vendas, entregas, faturamento e coletas
│   ├── produtos_materiais/     # Ranking de materiais, pesos e volumes
│   └── documentos_amostras/    # PDFs anonimizados para OCR/extração
├── .env.example                # Exemplo de configuração de ambiente
├── requirements.txt            # Dependências Python
└── main.py                     # Ponto de entrada direto
```

## 🚀 Como Executar

### 1. Instalar dependências (se necessário)

```bash
pip install -r requirements.txt
```

### 2. Iniciar o servidor de desenvolvimento

Diretamente com Python:
```bash
python main.py
```

Ou com Uvicorn:
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **API Base:** [http://localhost:8000](http://localhost:8000)
- **Documentação Swagger (OpenAPI):** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **Documentação ReDoc:** [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)
- **Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
