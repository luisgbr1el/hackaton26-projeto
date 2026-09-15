import React from 'react';
import { Navbar } from './components/Navbar';
import { HealthStatus } from './components/HealthStatus';
import { ItemList } from './components/ItemList';
import { Rocket, ShieldCheck, Zap, Code2, ExternalLink } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="main-content">
        <div className="hero-banner">
          <div className="badge-pill">
            <Rocket size={14} />
            <span>Hackathon Ready Base</span>
          </div>
          <h1 className="hero-title">
            FastAPI Backend <span className="text-gradient">+</span> React Vite Frontend
          </h1>
          <p className="hero-description">
            Estrutura base completa, modular e desacoplada pronta para desenvolvimento ágil durante o hackathon.
          </p>
        </div>

        <div className="grid-stack">
          {/* Live Status Section */}
          <HealthStatus />

          {/* Quick Info Grid */}
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-wrapper blue">
                <Zap size={22} />
              </div>
              <h3>Backend FastAPI</h3>
              <p>
                Arquitetura modular com endpoints versionados (<code>/api/v1</code>), validação com Pydantic v2, CORS configurado e documentação Swagger interativa automática.
              </p>
              <div className="feature-links">
                <a
                  href="http://localhost:8000/api/v1/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-link"
                >
                  Abrir Swagger Docs <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper purple">
                <Code2 size={22} />
              </div>
              <h3>Frontend React + Vite</h3>
              <p>
                Configurado com Vite, TypeScript, cliente HTTP Axios com interceptors/base URL centralizada, tipagens completas e componentes reutilizáveis.
              </p>
              <div className="feature-links">
                <span className="card-tag">TypeScript</span>
                <span className="card-tag">Axios</span>
                <span className="card-tag">Lucide Icons</span>
              </div>
            </div>

            <div className="feature-card">
              <div className="feature-icon-wrapper green">
                <ShieldCheck size={22} />
              </div>
              <h3>Arquitetura Limpa</h3>
              <p>
                Separação clara entre rotas da API, regras de negócio (services) e esquemas de dados, facilitando a adição rápida de novas funcionalidades.
              </p>
              <div className="feature-links">
                <span className="card-tag">FastAPI</span>
                <span className="card-tag">Pydantic v2</span>
                <span className="card-tag">Modular</span>
              </div>
            </div>
          </div>

          {/* Functional CRUD Demo */}
          <ItemList />
        </div>
      </main>

      <footer className="footer">
        <p>Estrutura base gerada para o Hackathon • FastAPI & React + Vite</p>
      </footer>
    </div>
  );
};

export default App;
