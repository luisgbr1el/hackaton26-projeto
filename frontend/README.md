# Hackathon Frontend (React + Vite + TypeScript)

Interface web moderna desenvolvida com **React 19**, **Vite**, **TypeScript** e **Axios**.

## 📁 Estrutura de Pastas

```text
frontend/
├── public/                     # Arquivos estáticos públicos
├── src/
│   ├── api/                    # Cliente HTTP Axios e chamadas aos endpoints da API
│   │   ├── client.ts           # Configuração base do Axios (baseURL, headers)
│   │   ├── health.ts           # Chamadas ao endpoint /health
│   │   └── items.ts            # Operações CRUD de itens
│   ├── components/             # Componentes React reutilizáveis
│   │   ├── Navbar.tsx          # Barra de navegação superior
│   │   ├── HealthStatus.tsx    # Card de status da conexão com a API
│   │   └── ItemList.tsx        # Demonstração funcional de CRUD
│   ├── types/                  # Interfaces e tipagens TypeScript
│   │   └── index.ts
│   ├── App.tsx                 # Dashboard principal da aplicação
│   ├── main.tsx                # Entrada do React DOM
│   └── index.css               # Estilização moderna e responsiva
├── .env.example                # Exemplo das variáveis de ambiente do frontend
├── package.json                # Dependências e scripts npm
├── tsconfig.json               # Configurações do TypeScript
└── vite.config.ts              # Configuração do bundler Vite
```

## 🚀 Como Executar

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

> Por padrão, a variável `VITE_API_URL` aponta para `http://localhost:8000/api/v1`.

### 3. Iniciar o servidor de desenvolvimento

```bash
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no seu navegador.

### 4. Build de Produção

```bash
npm run build
```
