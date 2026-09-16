import React from 'react';
import { LogOut } from 'lucide-react';
import { LogoNobreLar } from './LogoNobreLar';

interface CabecalhoProps {
  usuario: string;
  onSair: () => void;
}

export const Cabecalho: React.FC<CabecalhoProps> = ({ usuario, onSair }) => (
  <header className="cabecalho">
    <div className="cabecalho-container">
      <div className="cabecalho-logo">
        <LogoNobreLar altura={68} variante="clara" />
      </div>
      <div className="cabecalho-sessao">
        <span className="cabecalho-usuario">{usuario}</span>
        <button type="button" className="btn-sair" onClick={onSair}>
          <LogOut size={14} />
          Sair
        </button>
      </div>
    </div>
  </header>
);
