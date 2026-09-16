import React, { useState } from 'react';
import { Layers, PackageCheck, DoorOpen, RotateCw } from 'lucide-react';
import type { PlanoCarga } from '../types';
import { montarOrdem, ZONAS } from '../utils/carregamento';
import { formatNumero, formatPercentual } from '../utils/format';

interface OrdemCarregamentoProps {
  plano: PlanoCarga;
}

export const OrdemCarregamento: React.FC<OrdemCarregamentoProps> = ({ plano }) => {
  const todosItens = montarOrdem(plano);
  if (todosItens.length === 0) return null;

  const { veiculo } = plano;
  const maxViagens = Math.max(...todosItens.map((i) => i.viagem || 1), 1);
  const [viagemAtiva, setViagemAtiva] = useState<number>(1);

  // Itens da viagem ativa para visualização do baú
  const itensBau = todosItens.filter((i) => (maxViagens > 1 ? i.viagem === viagemAtiva : true));
  const volumeBau = itensBau.reduce((soma, item) => soma + item.pedido.volumeM3, 0);
  const pesoBau = itensBau.reduce((soma, item) => soma + item.pedido.pesoKg, 0);

  const livreKg = Math.max(0, veiculo.capacidadePesoKg - pesoBau);
  const livreM3 = Math.max(0, veiculo.capacidadeVolumeM3 - volumeBau);
  const percentualLivre = Math.max(
    0,
    100 - (volumeBau / veiculo.capacidadeVolumeM3) * 100,
  );

  return (
    <section className="card carga-card">
      <div className="card-head">
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Ordem de carregamento
            {maxViagens > 1 && (
              <span
                className="chip"
                style={{
                  backgroundColor: '#EEF2FF',
                  color: '#4338CA',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                }}
              >
                <RotateCw size={12} /> {maxViagens} viagens necessárias
              </span>
            )}
          </h2>
          <p className="card-subtitle">
            {maxViagens > 1
              ? `Carga dividida em ${maxViagens} viagens seguras para respeitar o limite operacional do ${veiculo.nome}.`
              : `Sequência de embarque para aproveitar o espaço do ${veiculo.nome}, na ordem inversa das entregas.`}
          </p>
        </div>
        <span className="chip chip-muted">
          <Layers size={14} /> {todosItens.length} volumes
        </span>
      </div>

      {/* Seletor de Viagens (quando há mais de uma viagem) */}
      {maxViagens > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {Array.from({ length: maxViagens }, (_, idx) => idx + 1).map((numViagem) => {
            const ativa = numViagem === viagemAtiva;
            const itensV = todosItens.filter((i) => i.viagem === numViagem);
            const pesoV = itensV.reduce((acc, i) => acc + i.pedido.pesoKg, 0);

            return (
              <button
                key={numViagem}
                type="button"
                className={`btn btn-sm ${ativa ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViagemAtiva(numViagem)}
                style={{
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                }}
              >
                Viagem {numViagem} ({itensV.length} itens · {formatNumero(pesoV)} kg)
              </button>
            );
          })}
        </div>
      )}

      {/* Ilustração do Baú do Veículo (respeitando a viagem ativa) */}
      <div className="bau">
        <span className="bau-etiqueta">
          <PackageCheck size={13} /> Fundo do baú {maxViagens > 1 ? `(Viagem ${viagemAtiva})` : ''}
        </span>
        <div className="bau-faixa">
          {itensBau.map((item) => (
            <span
              key={`${item.viagem}-${item.pedido.pedido}`}
              className={`bau-bloco bau-${item.zona}`}
              style={{ flexGrow: item.pedido.volumeM3 }}
              title={`Viagem ${item.viagem} · ${item.ordem}º. ${item.pedido.pedido} · ${formatNumero(item.pedido.volumeM3, 2)} m³`}
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
              {maxViagens > 1 && <th>Viagem</th>}
              <th>Ordem</th>
              <th>Pedido</th>
              <th>Destino</th>
              <th className="num">Peso</th>
              <th className="num">Volume</th>
              <th>Ocupação após embarcar</th>
            </tr>
          </thead>
          <tbody>
            {todosItens.map((item) => (
              <tr key={`${item.viagem}-${item.pedido.pedido}`}>
                {maxViagens > 1 && (
                  <td>
                    <span
                      className="chip"
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.5rem',
                        backgroundColor: item.viagem === 1 ? '#DBEAFE' : '#FEF3C7',
                        color: item.viagem === 1 ? '#1E40AF' : '#92400E',
                        fontWeight: 600,
                      }}
                    >
                      Viagem {item.viagem}
                    </span>
                  </td>
                )}
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
                    title={`Viagem ${item.viagem} · ${formatNumero(item.pesoAcumulado)} kg · ${formatNumero(
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
          Folga da Viagem {viagemAtiva}: <strong>{formatNumero(livreKg)} kg</strong> ·{' '}
          <strong>{formatNumero(livreM3, 2)} m³</strong>
        </span>
      </div>
    </section>
  );
};
