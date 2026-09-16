import React from 'react';
import type { PedidoAlocado } from '../types';
import { formatMoeda, formatNumero } from '../utils/format';

interface PedidosAlocadosProps {
  pedidos: PedidoAlocado[];
  /** Quantos pedidos de retirada no balcão foram descartados do plano. */
  retiradasDescartadas?: number;
}

export const PedidosAlocados: React.FC<PedidosAlocadosProps> = ({
  pedidos,
  retiradasDescartadas = 0,
}) => {
  if (pedidos.length === 0) return null;

  return (
    <section className="card pedidos-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Pedidos embarcados</h2>
          <p className="card-subtitle">Composição da carga por pedido</p>
        </div>
        <span className="chip chip-muted">{pedidos.length} registros</span>
      </div>

      <p className="pedidos-regra">
        Pedidos de <strong>retirada no balcão</strong> não entram no plano de carga
        {retiradasDescartadas > 0
          ? ` — ${retiradasDescartadas} registro(s) descartado(s) deste arquivo.`
          : '.'}
      </p>

      <div className="tabela-wrapper">
        <table className="tabela">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cidade</th>
              <th>Prioridade</th>
              <th className="num">Valor</th>
              <th className="num">Peso</th>
              <th className="num">Volume</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((pedido) => (
              <tr key={pedido.pedido}>
                <td className="mono">{pedido.pedido}</td>
                <td>{pedido.cidade}</td>
                <td>
                  <span className={`tag tag-${pedido.prioridade.toLowerCase()}`}>
                    {pedido.prioridade}
                  </span>
                </td>
                <td className="num">{formatMoeda(pedido.valor)}</td>
                <td className="num">{formatNumero(pedido.pesoKg)} kg</td>
                <td className="num">{formatNumero(pedido.volumeM3, 1)} m³</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};
