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
  chave: CriterioRota | 'distancia';
  rotulo: string;
  valor: string;
}

const metricasDe = (m: MetricasRota): Metrica[] => [
  { chave: 'distancia', rotulo: 'Distância', valor: `${formatNumero(m.distanciaKm)} km` },
  { chave: 'tempo', rotulo: 'Tempo', valor: formatDuracao(Math.round(m.tempoMin)) },
  { chave: 'custo', rotulo: 'Combustível', valor: formatMoeda(m.custo) },
  { chave: 'peso', rotulo: 'Carga embarcada', valor: `${formatNumero(m.pesoKg)} kg` },
  { chave: 'volume', rotulo: 'Volume', valor: `${formatNumero(m.volumeM3, 2)} m³` },
];

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
          <h2 className="card-title">Estratégias de Roteirização (Google OR-Tools)</h2>
          <p className="card-subtitle">
            Selecione a estratégia ideal para o despacho do dia. Os indicadores e a ordem de carregamento
            são recalculados instantaneamente.
          </p>
        </div>
        <span className="chip chip-muted">
          <RouteIcon size={14} /> {opcoes.length} opções calculadas
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

              <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
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
