import React, { useState } from 'react';
import { Layers, PackageCheck, DoorOpen, RotateCw, Truck } from 'lucide-react';
import type { PlanoCarga, Veiculo, VeiculoEmUso } from '../types';
import { montarOrdem, ZONAS } from '../utils/carregamento';
import { formatNumero, formatPercentual } from '../utils/format';
import { CaminhaoIlustracao } from './CaminhaoIlustracao';

interface OrdemCarregamentoProps {
  plano: PlanoCarga;
}

export const OrdemCarregamento: React.FC<OrdemCarregamentoProps> = ({ plano }) => {
  const veiculosEmUso = plano.veiculosEmUso || [];
  const temMultiplosVeiculos = veiculosEmUso.length > 0;

  // Estado de seleção do veículo ativo ('todos' ou ID do veículo)
  const [veiculoAtivoId, setVeiculoAtivoId] = useState<string | number>(() => {
    if (temMultiplosVeiculos) {
      return veiculosEmUso[0].id;
    }
    return plano.veiculo.id;
  });

  // Estado de viagem ativa por veículo
  const [viagemAtivaPorVeiculo, setViagemAtivaPorVeiculo] = useState<Record<string | number, number>>({});

  // Fallback para veículo único se não houver frota mobilizada no backend
  const itensLegados = montarOrdem(plano);

  if (!temMultiplosVeiculos && itensLegados.length === 0) {
    return null;
  }

  // Helper para obter os itens e métricas de um veículo específico
  const obterDadosVeiculo = (v: VeiculoEmUso) => {
    const itens = v.ordemCarregamento || [];
    const maxViagens = Math.max(
      ...(itens.map((it) => it.tripNumber || 1)),
      v.tripsCount || 1,
      1,
    );
    const viagemAtiva = viagemAtivaPorVeiculo[v.id] || 1;

    // Itens filtrados para o baú da viagem ativa
    const itensBau = itens.filter(
      (it) => it.tripNumber === viagemAtiva || (!it.tripNumber && viagemAtiva === 1),
    );
    const volBau = itensBau.reduce((acc, it) => acc + it.volumeM3, 0);
    const pesoBau = itensBau.reduce((acc, it) => acc + it.pesoKg, 0);

    const livreKg = Math.max(0, v.capacidadeKg - pesoBau);
    const livreM3 = Math.max(0, v.capacidadeM3 - volBau);
    const percentualLivre = Math.max(
      0,
      100 - (volBau / (v.capacidadeM3 || 1)) * 100,
    );

    const veiculoItem: Veiculo = {
      id: String(v.id),
      nome: v.nome,
      modelo: v.nome,
      tipo: v.nome.toLowerCase().includes('moto') ? 'moto' : 'grande',
      porte: 'Operação Nobre Lar',
      perfil: v.perfilSeguranca,
      cor: v.hexColor,
      capacidadePesoKg: v.capacidadeKg,
      capacidadeVolumeM3: v.capacidadeM3,
      tanqueLitros: 100,
      consumoKmPorLitro: 5,
    };

    return {
      itens,
      maxViagens,
      viagemAtiva,
      itensBau,
      volBau,
      pesoBau,
      livreKg,
      livreM3,
      percentualLivre,
      veiculoItem,
    };
  };

  // Renderiza o baú e a tabela de um veículo específico
  const renderizarBlocoVeiculo = (v: VeiculoEmUso) => {
    const {
      itens,
      maxViagens,
      viagemAtiva,
      itensBau,
      livreKg,
      livreM3,
      percentualLivre,
      veiculoItem,
    } = obterDadosVeiculo(v);

    const mudarViagem = (num: number) => {
      setViagemAtivaPorVeiculo((prev) => ({ ...prev, [v.id]: num }));
    };

    return (
      <div
        key={v.id}
        style={{
          border: '1px solid #E5E7EB',
          borderLeft: `6px solid ${v.hexColor || '#2563EB'}`,
          borderRadius: '10px',
          padding: '1.25rem',
          backgroundColor: '#FFFFFF',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Cabeçalho do Veículo */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: '1rem',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid #F3F4F6',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '64px',
                height: '42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#F3F4F6',
                borderRadius: '6px',
                padding: '4px',
              }}
            >
              <CaminhaoIlustracao veiculo={veiculoItem} miniatura />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                {v.nome}
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
                Placa: <strong>{v.placa}</strong> · Capacidade: {formatNumero(v.capacidadeKg)} kg / {formatNumero(v.capacidadeM3, 2)} m³
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                <RotateCw size={12} /> {maxViagens} viagens programadas
              </span>
            )}
            <span
              className="chip chip-muted"
              style={{ fontWeight: 600, fontSize: '0.78rem' }}
            >
              <Layers size={13} /> {itens.length} pedidos no baú
            </span>
          </div>
        </div>

        {/* Seletor de Viagens deste veículo (se houver mais de uma) */}
        {maxViagens > 1 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {Array.from({ length: maxViagens }, (_, idx) => idx + 1).map((numViagem) => {
              const ativa = numViagem === viagemAtiva;
              const itensV = itens.filter((it) => it.tripNumber === numViagem);
              const pesoV = itensV.reduce((acc, it) => acc + it.pesoKg, 0);

              return (
                <button
                  key={numViagem}
                  type="button"
                  className={`btn btn-sm ${ativa ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => mudarViagem(numViagem)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.8rem',
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

        {/* Ilustração do Baú deste veículo */}
        <div className="bau">
          <span className="bau-etiqueta">
            <PackageCheck size={13} /> Fundo do baú {maxViagens > 1 ? `(Viagem ${viagemAtiva})` : ''}
          </span>
          <div className="bau-faixa">
            {itensBau.map((item) => {
              let zona = 'meio';
              if (item.etiqueta.toLowerCase().includes('fundo')) zona = 'fundo';
              else if (item.etiqueta.toLowerCase().includes('porta')) zona = 'porta';

              return (
                <span
                  key={`${item.tripNumber || 1}-${item.pedidoId}`}
                  className={`bau-bloco bau-${zona}`}
                  style={{ flexGrow: Math.max(item.volumeM3, 0.05) }}
                  title={`Viagem ${item.tripNumber || 1} · ${item.posicao}º. ${item.pedidoId} · ${formatNumero(item.volumeM3, 2)} m³`}
                >
                  {item.posicao}
                </span>
              );
            })}
            {percentualLivre > 2 && (
              <span
                className="bau-bloco bau-livre"
                style={{ flexGrow: (percentualLivre / 100) * (v.capacidadeM3 || 2.45) }}
              >
                livre
              </span>
            )}
          </div>
          <span className="bau-etiqueta bau-etiqueta-fim">
            Porta <DoorOpen size={13} />
          </span>
        </div>

        {/* Tabela de Carregamento LIFO deste veículo */}
        <div className="tabela-wrapper" style={{ marginTop: '0.75rem' }}>
          <table className="tabela tabela-carga">
            <thead>
              <tr>
                {maxViagens > 1 && <th>Viagem</th>}
                <th>Ordem</th>
                <th>Posição no Baú</th>
                <th>Pedido</th>
                <th>Destino</th>
                <th className="num">Peso</th>
                <th className="num">Volume</th>
                <th>Ocupação após embarcar</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item) => {
                const tripNum = item.tripNumber || 1;
                let zonaLabel = 'Meio do Baú';
                let zonaClass = 'meio';
                if (item.etiqueta.toLowerCase().includes('fundo')) {
                  zonaLabel = 'Fundo do Baú';
                  zonaClass = 'fundo';
                } else if (item.etiqueta.toLowerCase().includes('porta')) {
                  zonaLabel = 'Porta do Baú';
                  zonaClass = 'porta';
                }

                const occVal = item.ocupacaoAposEmbarcar != null ? item.ocupacaoAposEmbarcar : 0;

                return (
                  <tr key={`${tripNum}-${item.pedidoId}`}>
                    {maxViagens > 1 && (
                      <td>
                        <span
                          className="chip"
                          style={{
                            fontSize: '0.72rem',
                            padding: '0.15rem 0.45rem',
                            backgroundColor: tripNum === 1 ? '#DBEAFE' : '#FEF3C7',
                            color: tripNum === 1 ? '#1E40AF' : '#92400E',
                            fontWeight: 700,
                          }}
                        >
                          Viagem {tripNum}
                        </span>
                      </td>
                    )}
                    <td>
                      <span className="carga-ordem">{item.posicao}</span>
                    </td>
                    <td>
                      <span className={`carga-zona carga-zona-${zonaClass}`}>
                        {zonaLabel}
                      </span>
                    </td>
                    <td className="mono">{item.pedidoId}</td>
                    <td>
                      <span className="carga-destino">{item.cidade}</span>
                      {item.endereco && (
                        <span style={{ fontSize: '0.75rem', color: '#6B7280', display: 'block' }}>
                          {item.endereco}
                        </span>
                      )}
                    </td>
                    <td className="num">{formatNumero(item.pesoKg)} kg</td>
                    <td className="num">{formatNumero(item.volumeM3, 2)} m³</td>
                    <td>
                      <div
                        className="carga-barra"
                        title={`Viagem ${tripNum} · Ocupação acumulada: ${formatPercentual(occVal)}`}
                      >
                        <span
                          className="carga-barra-preenchimento"
                          style={{ width: `${Math.min(occVal, 100)}%` }}
                        />
                      </div>
                      <span className="carga-percentual">{formatPercentual(occVal)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="carga-rodape" style={{ marginTop: '0.75rem' }}>
          <span>
            Regra LIFO: o mais denso entra primeiro e fica no fundo; entregas prioritárias junto à porta.
          </span>
          <span>
            Folga estimada da Viagem {viagemAtiva}: <strong>{formatNumero(livreKg)} kg</strong> ·{' '}
            <strong>{formatNumero(livreM3, 2)} m³</strong>
          </span>
        </div>
      </div>
    );
  };

  return (
    <section className="card carga-card">
      <div className="card-head">
        <div>
          <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Layers size={22} /> Ordem de Carregamento por Veículo
          </h2>
          <p className="card-subtitle">
            Sequência de embarque LIFO calculada para toda a frota mobilizada, respeitando a capacidade física e múltiplas viagens de cada caminhão.
          </p>
        </div>
        <span className="chip chip-muted">
          <Truck size={14} /> {temMultiplosVeiculos ? `${veiculosEmUso.length} veículos em rota` : plano.veiculo.nome}
        </span>
      </div>

      {/* Barra de Abas / Seleção de Veículo */}
      {temMultiplosVeiculos && veiculosEmUso.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            marginBottom: '1.25rem',
            flexWrap: 'wrap',
            padding: '0.5rem',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${veiculoAtivoId === 'todos' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setVeiculoAtivoId('todos')}
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              borderRadius: '6px',
            }}
          >
            Ver Todos os Veículos ({veiculosEmUso.length})
          </button>

          {veiculosEmUso.map((v) => {
            const ativo = veiculoAtivoId === v.id;
            const itensCount = v.ordemCarregamento?.length || 0;
            const vTrips = v.tripsCount && v.tripsCount > 1 ? ` · ${v.tripsCount} viagens` : '';

            return (
              <button
                key={v.id}
                type="button"
                className={`btn btn-sm ${ativo ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setVeiculoAtivoId(v.id)}
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderLeft: `4px solid ${v.hexColor || '#2563EB'}`,
                }}
              >
                <span>{v.nome}</span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    opacity: 0.85,
                    backgroundColor: 'rgba(0,0,0,0.08)',
                    padding: '0.1rem 0.35rem',
                    borderRadius: '4px',
                  }}
                >
                  {itensCount} itens{vTrips}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Conteúdo: Seção para todos os veículos ou para o veículo selecionado */}
      {temMultiplosVeiculos ? (
        veiculoAtivoId === 'todos' ? (
          <div>
            {veiculosEmUso.map((v) => renderizarBlocoVeiculo(v))}
          </div>
        ) : (
          <div>
            {(() => {
              const vSelecionado = veiculosEmUso.find((v) => v.id === veiculoAtivoId) || veiculosEmUso[0];
              return renderizarBlocoVeiculo(vSelecionado);
            })()}
          </div>
        )
      ) : (
        /* Fallback para modo legado de veículo único */
        <div>
          <div className="bau">
            <span className="bau-etiqueta">
              <PackageCheck size={13} /> Fundo do baú
            </span>
            <div className="bau-faixa">
              {itensLegados.map((item) => (
                <span
                  key={`${item.viagem}-${item.pedido.pedido}`}
                  className={`bau-bloco bau-${item.zona}`}
                  style={{ flexGrow: item.pedido.volumeM3 }}
                  title={`Viagem ${item.viagem} · ${item.ordem}º. ${item.pedido.pedido} · ${formatNumero(item.pedido.volumeM3, 2)} m³`}
                >
                  {item.ordem}
                </span>
              ))}
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
                  <th>Posição</th>
                  <th>Pedido</th>
                  <th>Destino</th>
                  <th className="num">Peso</th>
                  <th className="num">Volume</th>
                  <th>Ocupação após embarcar</th>
                </tr>
              </thead>
              <tbody>
                {itensLegados.map((item) => (
                  <tr key={`${item.viagem}-${item.pedido.pedido}`}>
                    <td>
                      <span className="carga-ordem">{item.ordem}</span>
                    </td>
                    <td>
                      <span className={`carga-zona carga-zona-${item.zona}`}>
                        {ZONAS[item.zona]}
                      </span>
                    </td>
                    <td className="mono">{item.pedido.pedido}</td>
                    <td>
                      <span className="carga-destino">{item.destino}</span>
                    </td>
                    <td className="num">{formatNumero(item.pedido.pesoKg)} kg</td>
                    <td className="num">{formatNumero(item.pedido.volumeM3, 2)} m³</td>
                    <td>
                      <div className="carga-barra">
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
        </div>
      )}
    </section>
  );
};
