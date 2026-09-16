import React from 'react';
import { Layers, PackageCheck, DoorOpen } from 'lucide-react';
import type { PlanoCarga } from '../types';
import { montarOrdem, ZONAS } from '../utils/carregamento';
import { formatNumero, formatPercentual } from '../utils/format';

interface OrdemCarregamentoProps {
  plano: PlanoCarga;
}

export const OrdemCarregamento: React.FC<OrdemCarregamentoProps> = ({ plano }) => {
  const itens = montarOrdem(plano);
  if (itens.length === 0) return null;

  const { veiculo, resumo } = plano;
  const volumeTotal = itens.reduce((soma, item) => soma + item.pedido.volumeM3, 0);
  const livreKg = veiculo.capacidadePesoKg - resumo.pesoTotalKg;
  const livreM3 = veiculo.capacidadeVolumeM3 - resumo.volumeTotalM3;
  const percentualLivre = Math.max(
    0,
    100 - (volumeTotal / veiculo.capacidadeVolumeM3) * 100,
  );

  return (
    <section className="card carga-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Ordem de carregamento</h2>
          <p className="card-subtitle">
            Sequência de embarque para aproveitar o espaço do {veiculo.nome}, na ordem inversa
            das entregas da rota recomendada.
          </p>
        </div>
        <span className="chip chip-muted">
          <Layers size={14} /> {itens.length} volumes
        </span>
      </div>

      <div className="bau">
        <span className="bau-etiqueta">
          <PackageCheck size={13} /> Fundo do baú
        </span>
        <div className="bau-faixa">
          {itens.map((item) => (
            <span
              key={item.pedido.pedido}
              className={`bau-bloco bau-${item.zona}`}
              style={{ flexGrow: item.pedido.volumeM3 }}
              title={`${item.ordem}. ${item.pedido.pedido} · ${formatNumero(item.pedido.volumeM3, 2)} m³`}
            >
              {item.ordem}
            </span>
          ))}
          {percentualLivre > 2 && (
            <span
              className="bau-bloco bau-livre"
              style={{ flexGrow: (percentualLivre / 100) * veiculo.capacidadeVolumeM3 }}
            >
              livre
            </span>
          )}
        </div>
        <span className="bau-etiqueta bau-etiqueta-fim">
          Porta <DoorOpen size={13} />
        </span>
      </div>

      <div className="tabela-wrapper">
        <table className="tabela tabela-carga">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Pedido</th>
              <th>Destino</th>
              <th className="num">Peso</th>
              <th className="num">Volume</th>
              <th>Ocupação após embarcar</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.pedido.pedido}>
                <td>
                  <span className="carga-ordem">{item.ordem}</span>
                  <span className={`carga-zona carga-zona-${item.zona}`}>
                    {ZONAS[item.zona]}
                  </span>
                </td>
                <td className="mono">{item.pedido.pedido}</td>
                <td>
                  <span className="carga-destino">{item.destino}</span>
                  {item.entrega && (
                    <span className="carga-entrega">{item.entrega}ª entrega</span>
                  )}
                </td>
                <td className="num">{formatNumero(item.pedido.pesoKg)} kg</td>
                <td className="num">{formatNumero(item.pedido.volumeM3, 2)} m³</td>
                <td>
                  <div
                    className="carga-barra"
                    title={`${formatNumero(item.pesoAcumulado)} kg · ${formatNumero(
                      item.volumeAcumulado,
                      2,
                    )} m³`}
                  >
                    <span
                      className="carga-barra-preenchimento"
                      style={{ width: `${Math.min(item.ocupacao, 100)}%` }}
                    />
                  </div>
                  <span className="carga-percentual">{formatPercentual(item.ocupacao)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="carga-rodape">
        <span>
          Regra: o mais denso entra primeiro e fica embaixo; a primeira entrega fica junto à
          porta.
        </span>
        <span>
          Folga restante: <strong>{formatNumero(livreKg)} kg</strong> ·{' '}
          <strong>{formatNumero(livreM3, 2)} m³</strong>
        </span>
      </div>
    </section>
  );
};
