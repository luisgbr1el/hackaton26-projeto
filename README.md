# Hackathon Fullstack Starter (FastAPI + React Vite)

Projeto base completo e desacoplado composto por uma API assíncrona em **FastAPI** e um frontend reativo moderno em **React + Vite**.

---

## 🏗️ Estrutura do Projeto

```text
hackaton26-backend/
├── backend/                    # Servidor REST FastAPI (Python)
│   ├── app/
│   │   ├── api/                # Rotas da API (/api/v1/health, /api/v1/items)
│   │   ├── core/               # Configurações e variáveis de ambiente
│   │   ├── schemas/            # Validação de dados (Pydantic v2)
│   │   ├── services/           # Regras de negócio
│   │   └── main.py             # Instância do FastAPI e middlewares (CORS)
│   ├── data/                   # Datasets organizados para treinamento futuro
│   ├── requirements.txt        # Dependências do backend
│   └── .env.example            # Variáveis de ambiente do backend
│
├── frontend/                   # Aplicação Web (React + Vite + TypeScript)
│   ├── src/
│   │   ├── api/                # Cliente HTTP Axios configurado
│   │   ├── components/         # Componentes (Navbar, HealthStatus, ItemList CRUD)
│   │   ├── types/              # Definições de tipos TypeScript
│   │   ├── App.tsx             # Dashboard principal
│   │   └── index.css           # Estilização moderna
│   ├── package.json            # Dependências e scripts npm
│   └── .env.example            # Variáveis de ambiente do frontend
│
└── .gitignore                  # Arquivos e diretórios ignorados pelo Git
```

---

## ⚡ Início Rápido

### 1. Inicializar o Backend (FastAPI)

Abra um terminal na pasta `backend/`:

```bash
cd backend

# Instalar dependências (caso ainda não tenha instalado)
pip install -r requirements.txt

# Executar a API diretamente
python main.py
```

*ou usando uvicorn:*
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- **URL da API:** [http://localhost:8000](http://localhost:8000)
- **Documentação Swagger:** [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **Health Check:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

### 2. Inicializar o Frontend (React + Vite)

Abra outro terminal na pasta `frontend/`:

```bash
cd frontend

# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
```

- **URL da Aplicação Web:** [http://localhost:5173](http://localhost:5173)

---

## 🚀 Funcionalidades Inclusas

- **CORS configurado:** Comunicação pronta e sem bloqueios entre o frontend (`:5173`) e backend (`:8000`).
- **Validação com Pydantic v2:** Modelos e esquemas fortemente tipados no backend.
- **Ponto de Verificação de Saúde (`/health`):** Componente no frontend com monitoramento e verificação de conexão com o backend em tempo real.
- **Módulo de Exemplo (CRUD):** Endpoints de itens (`GET`, `POST`, `DELETE`) e formulário reativo com listagem e remoção imediata no frontend.
- **Tipagem TypeScript Completa:** Interfaces compartilhando os contratos de dados dos endpoints.
- **Arquitetura Modular Limpa:** Fácil de escalar e incluir novos endpoints durante o hackathon.
