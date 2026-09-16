import React, { useState } from 'react';
import {
  Fuel,
  Gauge,
  Package,
  Route,
  TriangleAlert,
  Weight,
  Truck,
  CheckCircle2,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { PlanoCarga, VeiculoEmUso } from '../types';
import { CaminhaoIlustracao } from './CaminhaoIlustracao';
import { combustivelDaRota, ocupacaoGeral, excedeCapacidade } from '../utils/carga';
import { formatMoeda, formatNumero, formatPercentual } from '../utils/format';

interface VeiculoAlocadoProps {
  plano: PlanoCarga;
}

export const VeiculoAlocado: React.FC<VeiculoAlocadoProps> = ({ plano }) => {
  const { veiculo, resumo, veiculosEmUso } = plano;
  const [veiculoAberto, setVeiculoAberto] = useState<number | null>(null);

  // Modo frota múltipla (quando OR-Tools mobilizou mais de 1 veículo)
  if (veiculosEmUso && veiculosEmUso.length > 1) {
    const totalCapKg = resumo.capacidadeTotalKg || veiculosEmUso.reduce((acc, v) => acc + v.capacidadeKg, 0);
    const totalCapM3 = resumo.capacidadeTotalM3 || veiculosEmUso.reduce((acc, v) => acc + v.capacidadeM3, 0);
    const ocupKg = totalCapKg > 0 ? (resumo.pesoTotalKg / totalCapKg) * 100 : 0;
    const ocupM3 = totalCapM3 > 0 ? (resumo.volumeTotalM3 / totalCapM3) * 100 : 0;

    return (
      <section className="card veiculo-card">
        {/* Cabeçalho da Frota Mobilizada */}
        <div className="card-head">
          <div>
            <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Truck size={22} />
              Frota Mobilizada na Operação ({veiculosEmUso.length} veículos em rota)
            </h2>
            <p className="card-subtitle">
              Todos os {veiculosEmUso.length} veículos alocados para despachar a carga do dia com segurança e equilíbrio de jornada.
            </p>
          </div>
          <span className="chip chip-sucesso" style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontWeight: 600 }}>
            <CheckCircle2 size={14} /> {veiculosEmUso.length} unidades em trânsito
          </span>
        </div>

        {/* Resumo Combinado da Frota */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            padding: '1.25rem',
            backgroundColor: '#F9FAFB',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Carga Combinada
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: '0.2rem' }}>
              {formatNumero(resumo.pesoTotalKg)} kg
            </div>
            <span style={{ fontSize: '0.8rem', color: '#4B5563' }}>
              de {formatNumero(totalCapKg)} kg limite ({formatPercentual(ocupKg)} seguro)
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Cubagem Total
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: '0.2rem' }}>
              {formatNumero(resumo.volumeTotalM3, 2)} m³
            </div>
            <span style={{ fontSize: '0.8rem', color: '#4B5563' }}>
              de {formatNumero(totalCapM3, 2)} m³ ({formatPercentual(ocupM3)})
            </span>
          </div>

          <div>
            <span style={{ fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase', fontWeight: 600 }}>
              Distância e Paradas
            </span>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginTop: '0.2rem' }}>
              {formatNumero(plano.rota.distanciaTotalKm)} km
            </div>
            <span style={{ fontSize: '0.8rem', color: '#4B5563' }}>
              {resumo.totalPedidos} entregas distribuídas
            </span>
          </div>
        </div>

        {/* Grade com TODOS os veículos utilizados */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {veiculosEmUso.map((v: VeiculoEmUso) => {
            const estaAberto = veiculoAberto === v.id;
            const corBorda = v.hexColor || '#2563EB';

            return (
              <div
                key={v.id}
                style={{
                  border: '1px solid #E5E7EB',
                  borderLeft: `6px solid ${corBorda}`,
                  borderRadius: '10px',
                  padding: '1.25rem',
                  backgroundColor: '#FFFFFF',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ fontSize: '1.75rem' }}>{v.emoji}</span>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#111827' }}>
                        {v.nome}
                      </h3>
                      <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 500 }}>
                        Placa: <strong>{v.placa}</strong> · {v.perfilSeguranca}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      className="chip"
                      style={{
                        backgroundColor: v.ocupacaoPercentual > 98 ? '#FEF3C7' : '#DCFCE7',
                        color: v.ocupacaoPercentual > 98 ? '#92400E' : '#166534',
                        fontWeight: 700,
                      }}
                    >
                      <Gauge size={13} />
                      {formatPercentual(v.ocupacaoPercentual)} ocupado
                    </span>
                    {v.ordemCarregamento && v.ordemCarregamento.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setVeiculoAberto(estaAberto ? null : v.id)}
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Layers size={14} />
                        {estaAberto ? 'Fechar Ordem' : `Ordem (${v.ordemCarregamento.length} itens)`}
                        {estaAberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Métricas do Veículo */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '0.75rem',
                    marginTop: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid #F3F4F6',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Weight size={13} /> Peso
                    </span>
                    <strong style={{ color: '#111827', fontSize: '0.95rem' }}>
                      {formatNumero(v.pesoKg)} kg
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                      limite {formatNumero(v.capacidadeKg)} kg
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Package size={13} /> Volume
                    </span>
                    <strong style={{ color: '#111827', fontSize: '0.95rem' }}>
                      {formatNumero(v.volumeM3, 2)} m³
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                      limite {formatNumero(v.capacidadeM3, 2)} m³
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#6B7280', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Route size={13} /> Percurso
                    </span>
                    <strong style={{ color: '#111827', fontSize: '0.95rem' }}>
                      {formatNumero(v.distanciaKm)} km
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                      {v.paradasCount} entregas
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#6B7280' }}>Valor Transportado</span>
                    <strong style={{ color: '#111827', fontSize: '0.95rem', display: 'block' }}>
                      {formatMoeda(v.valorReais)}
                    </strong>
                    <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                      Embarcado nesta rota
                    </div>
                  </div>
                </div>

                {/* Ordem de Carregamento expansível do veículo */}
                {estaAberto && v.ordemCarregamento && (
                  <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #E5E7EB' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Layers size={14} /> Sequência de Carregamento LIFO no Baú ({v.nome}):
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {v.ordemCarregamento.map((item) => (
                        <div
                          key={item.pedidoId}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#F9FAFB',
                            padding: '0.4rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <strong style={{ color: '#1F2937' }}>{item.etiqueta}</strong> · Pedido{' '}
                            <code style={{ fontFamily: 'monospace', color: '#4B5563' }}>{item.pedidoId}</code> ({item.cidade})
                            {item.endereco && <span style={{ color: '#9CA3AF' }}> · {item.endereco}</span>}
                          </div>
                          <span style={{ color: '#6B7280', fontWeight: 600 }}>
                            {formatNumero(item.pesoKg)} kg · {formatNumero(item.volumeM3, 2)} m³
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    );
  }

  // Fallback: modo de veículo único
  const ocupacao = ocupacaoGeral(plano);
  const excedido = excedeCapacidade(plano);
  const combustivel = combustivelDaRota(veiculo, plano.rota.distanciaTotalKm);

  return (
    <section className="card veiculo-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Veículo alocado</h2>
          <p className="card-subtitle">{veiculo.perfil}</p>
        </div>
        <span className="chip chip-veiculo">
          <span className="ponto-cor" style={{ backgroundColor: veiculo.cor }} />
          {veiculo.nome}
        </span>
      </div>

      <div className="veiculo-foto">
        <CaminhaoIlustracao veiculo={veiculo} />
        <span className={`veiculo-badge${excedido ? ' is-excedido' : ''}`}>
          <Gauge size={14} />
          {formatPercentual(ocupacao)} ocupado
        </span>
      </div>

      <div className="veiculo-info">
        <h3 className="veiculo-modelo">{veiculo.modelo}</h3>
        <span className="veiculo-categoria">
          {veiculo.porte} · {veiculo.nome}
        </span>
      </div>

      <dl className="veiculo-specs">
        <div className="spec">
          <dt>
            <Weight size={14} /> Peso carregado
          </dt>
          <dd>
            {formatNumero(resumo.pesoTotalKg)} kg
            <span className="spec-limite">
              limite {formatNumero(veiculo.capacidadePesoKg)} kg
            </span>
          </dd>
        </div>
        <div className="spec">
          <dt>
            <Package size={14} /> Volume carregado
          </dt>
          <dd>
            {formatNumero(resumo.volumeTotalM3, 2)} m³
            <span className="spec-limite">
              limite {formatNumero(veiculo.capacidadeVolumeM3, 2)} m³
            </span>
          </dd>
        </div>
      </dl>

      <div className="combustivel">
        <div className="combustivel-head">
          <span className="combustivel-titulo">
            <Fuel size={15} /> Combustível e autonomia
          </span>
          <span className="combustivel-rota">
            <Route size={13} /> rota de {formatNumero(plano.rota.distanciaTotalKm)} km
          </span>
        </div>

        <div className="combustivel-numeros">
          <span>
            <strong>{formatNumero(combustivel.tanqueLitros)} L</strong>
            capacidade do tanque
          </span>
          <span>
            <strong>{formatNumero(combustivel.consumoRotaLitros, 1)} L</strong>
            consumo estimado da rota
          </span>
          <span>
            <strong>{formatNumero(combustivel.autonomiaKm)} km</strong>
            autonomia com tanque cheio
          </span>
        </div>

        <div
          className="barra-trilha"
          role="progressbar"
          aria-valuenow={Math.round(combustivel.percentualDoTanque)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Consumo da rota em relação ao tanque"
        >
          <span
            className={`barra-preenchimento${combustivel.precisaAbastecer ? ' is-alta' : ''}`}
            style={{ width: `${Math.min(combustivel.percentualDoTanque, 100)}%` }}
          />
        </div>
        <span className="barra-legenda">
          A rota consome {formatPercentual(combustivel.percentualDoTanque)} do tanque
          ({formatNumero(veiculo.consumoKmPorLitro, 1)} km/L)
        </span>

        {combustivel.precisaAbastecer && (
          <div className="alerta-abastecer">
            <TriangleAlert size={18} />
            <div>
              <strong>O veículo precisará abastecer durante o percurso</strong>
              <span>
                A rota consome {formatNumero(combustivel.consumoRotaLitros, 1)} L e o tanque
                comporta {formatNumero(combustivel.tanqueLitros)} L — programe uma parada por
                volta do km {formatNumero(combustivel.autonomiaKm)}.
              </span>
            </div>
          </div>
        )}
      </div>

      {excedido && (
        <div className="alert alert-error">
          <Gauge size={16} />
          <span>
            A carga deste plano ultrapassa os limites desta unidade. Redistribua os pedidos ou
            escolha um veículo maior.
          </span>
        </div>
      )}
    </section>
  );
};
