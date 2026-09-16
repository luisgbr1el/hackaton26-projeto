import React from 'react';
import { Home, Truck, Route, ClipboardList } from 'lucide-react';

export type AbaPrincipal = 'home' | 'veiculo' | 'rota' | 'pedidos';

interface MenuPrincipalProps {
  ativa: AbaPrincipal;
  onSelecionar: (aba: AbaPrincipal) => void;
}

const ABAS: { id: AbaPrincipal; rotulo: string; Icone: typeof Truck }[] = [
  { id: 'home', rotulo: 'Home', Icone: Home },
  { id: 'veiculo', rotulo: 'Veículo', Icone: Truck },
  { id: 'rota', rotulo: 'Rota', Icone: Route },
  { id: 'pedidos', rotulo: 'Pedidos', Icone: ClipboardList },
];

export const MenuPrincipal: React.FC<MenuPrincipalProps> = ({ ativa, onSelecionar }) => (
  <nav className="menu" aria-label="Seções do plano de carga">
    {ABAS.map(({ id, rotulo, Icone }) => (
      <button
        key={id}
        type="button"
        className={`menu-botao${ativa === id ? ' is-ativo' : ''}`}
        onClick={() => onSelecionar(id)}
        aria-current={ativa === id ? 'page' : undefined}
      >
        <Icone size={18} />
        {rotulo}
      </button>
    ))}
  </nav>
);
