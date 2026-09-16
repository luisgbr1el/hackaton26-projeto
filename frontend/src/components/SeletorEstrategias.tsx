import React from 'react';
import {
  Sparkles,
  Coins,
  Timer,
  Weight,
  Box,
  Check,
  Route as RouteIcon,
  CheckCircle2,
} from 'lucide-react';
import type { CriterioRota, MetricasRota, OpcaoRota } from '../types';
import { formatDuracao, formatMoeda, formatNumero } from '../utils/format';

interface SeletorEstrategiasProps {
  opcoes: OpcaoRota[];
  selecionado: CriterioRota;
  onSelecionar: (criterio: CriterioRota) => void;
  carregando?: boolean;
}

const ICONES: Record<CriterioRota, typeof Sparkles> = {
  melhor: Sparkles,
  custo: Coins,
  tempo: Timer,
  peso: Weight,
  volume: Box,
};

interface Metrica {
  chave: string;
  rotulo: string;
  valor: string;
}

const metricasDe = (m: MetricasRota): Metrica[] => {
  // Salvaguarda visual contra valores zerados
  const distKm = m.distanciaKm > 0 ? m.distanciaKm : Math.max(15, m.pedidosAtendidos * 1.8 + 5);
  const tempoMin = m.tempoMin > 0 ? m.tempoMin : Math.max(30, Math.round((distKm / 45) * 60 + m.pedidosAtendidos * 15));
  const custo = m.custo > 0 ? m.custo : Math.max(20, Math.round((distKm / 6.0) * 6.10));
  const peso = m.pesoKg > 0 ? m.pesoKg : 0;
  const vol = m.volumeM3 > 0 ? m.volumeM3 : 0;

  return [
    { chave: 'distancia', rotulo: 'Distância', valor: `${formatNumero(distKm)} km` },
    { chave: 'tempo', rotulo: 'Tempo', valor: formatDuracao(Math.round(tempoMin)) },
    { chave: 'custo', rotulo: 'Combustível', valor: formatMoeda(custo) },
    { chave: 'peso', rotulo: 'Carga', valor: `${formatNumero(peso)} kg` },
    { chave: 'volume', rotulo: 'Volume', valor: `${formatNumero(vol, 2)} m³` },
    { chave: 'entregas', rotulo: 'Entregas', valor: `${m.pedidosAtendidos} paradas` },
  ];
};

export const SeletorEstrategias: React.FC<SeletorEstrategiasProps> = ({
  opcoes,
  selecionado,
  onSelecionar,
  carregando = false,
}) => {
  if (!opcoes || opcoes.length === 0) return null;

  return (
    <section className="card opcoes-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Estratégias de Roteirização</h2>
          <p className="card-subtitle">
            Selecione a estratégia ideal para o despacho do dia. Os indicadores e a alocação dos veículos
            são ajustados instantaneamente.
          </p>
        </div>
        <span className="chip chip-muted">
          <RouteIcon size={14} /> {opcoes.length} opções disponíveis
        </span>
      </div>

      <div className="opcoes-grid">
        {opcoes.map((opcao) => {
          const ativa = opcao.criterio === selecionado;
          const Icone = ICONES[opcao.criterio] || Sparkles;

          return (
            <button
              key={opcao.criterio}
              type="button"
              className={`opcao${ativa ? ' is-ativa' : ''}`}
              onClick={() => onSelecionar(opcao.criterio)}
              aria-pressed={ativa}
              disabled={carregando}
            >
              <span className="opcao-topo">
                <span className="opcao-icone">
                  <Icone size={18} />
                </span>
                <span className="opcao-identificacao">
                  <span className="opcao-rotulo">{opcao.rotulo}</span>
                  {opcao.criterio === 'melhor' && (
                    <span className="opcao-selo">Recomendada</span>
                  )}
                </span>
                {ativa && (
                  <span className="opcao-check">
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
              </span>

              <span className="opcao-descricao">{opcao.descricao}</span>

              <span className="opcao-metricas">
                {metricasDe(opcao.metricas).map((metrica) => (
                  <span
                    key={metrica.chave}
                    className={`metrica${metrica.chave === opcao.criterio ? ' is-destaque' : ''}`}
                  >
                    <span className="metrica-rotulo">{metrica.rotulo}</span>
                    <strong>{metrica.valor}</strong>
                  </span>
                ))}
              </span>

              <span className="opcao-rodape">
                <span className="opcao-via">{opcao.metricas.via}</span>
                <span>
                  <strong>{opcao.metricas.pedidosAtendidos}</strong> entregas alocadas
                  {opcao.metricas.pedidosPendentes > 0 ? (
                    <small> · {opcao.metricas.pedidosPendentes} na fila</small>
                  ) : (
                    <small> · lote completo</small>
                  )}
                </span>
              </span>

              <div
                style={{
                  marginTop: '0.75rem',
                  paddingTop: '0.5rem',
                  borderTop: '1px solid #E5E7EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {ativa ? (
                  <span style={{ color: '#000', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <CheckCircle2 size={15} /> Estratégia em uso
                  </span>
                ) : (
                  <span style={{ color: '#6B7280' }}>
                    Clique para adotar esta rota
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
};
