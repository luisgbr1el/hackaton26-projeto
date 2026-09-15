import React from 'react';
import { Layers, FileText, GitBranch } from 'lucide-react';

export const Navbar: React.FC = () => {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <div className="navbar-logo">
            <Layers className="icon" size={24} />
          </div>
          <div>
            <h1 className="navbar-title">Hackathon Starter</h1>
            <span className="navbar-subtitle">FastAPI + React Vite</span>
          </div>
        </div>
        <nav className="navbar-links">
          <a
            href="http://localhost:8000/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link"
          >
            <FileText size={16} />
            Swagger Docs
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-link github-link"
          >
            <GitBranch size={16} />
            Repositório
          </a>
        </nav>
      </div>
    </header>
  );
};
