import React from 'react';
import { Sparkles, Coins, Timer, Weight, Box, Check, Route as RouteIcon } from 'lucide-react';
import type { CriterioRota, MetricasRota, OpcaoRota } from '../types';
import { formatDuracao, formatMoeda, formatNumero } from '../utils/format';

interface OpcoesRotaProps {
  opcoes: OpcaoRota[];
  selecionado: CriterioRota;
  onSelecionar: (criterio: CriterioRota) => void;
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
  { chave: 'custo', rotulo: 'Custo', valor: formatMoeda(m.custo) },
  { chave: 'peso', rotulo: 'Peso', valor: `${formatNumero(m.pesoKg)} kg` },
  { chave: 'volume', rotulo: 'Volume', valor: `${formatNumero(m.volumeM3, 2)} m³` },
];

/** Em rotas dentro da mesma cidade a referência (bairro) informa mais que o município. */
const sequenciaLegivel = (opcao: OpcaoRota): string => {
  const cidades = new Set(opcao.rota.paradas.map((parada) => parada.cidade));
  const intramunicipal = cidades.size === 1;
  return opcao.rota.paradas
    .map((parada) => (intramunicipal ? (parada.referencia ?? parada.cidade) : parada.cidade))
    .join(' → ');
};

export const OpcoesRota: React.FC<OpcoesRotaProps> = ({
  opcoes,
  selecionado,
  onSelecionar,
}) => (
  <section className="card opcoes-card">
    <div className="card-head">
      <div>
        <h2 className="card-title">Outras opções de rota</h2>
        <p className="card-subtitle">
          Escolha o critério que melhor atende a operação do dia — o mapa acima acompanha a
          seleção. Custo e tempo levam a carga completa; peso e volume saem mais leves,
          deixando pedido para a próxima viagem.
        </p>
      </div>
      <span className="chip chip-muted">
        <RouteIcon size={14} /> {opcoes.length} alternativas
      </span>
    </div>

    <div className="opcoes-grid">
      {opcoes.map((opcao) => {
        const ativa = opcao.criterio === selecionado;
        const Icone = ICONES[opcao.criterio];

        return (
          <button
            key={opcao.criterio}
            type="button"
            className={`opcao${ativa ? ' is-ativa' : ''}`}
            onClick={() => onSelecionar(opcao.criterio)}
            aria-pressed={ativa}
          >
            <span className="opcao-topo">
              <span className="opcao-icone">
                <Icone size={17} />
              </span>
              <span className="opcao-identificacao">
                <span className="opcao-rotulo">{opcao.rotulo}</span>
                {opcao.criterio === 'melhor' && (
                  <span className="opcao-selo">Recomendada</span>
                )}
              </span>
              {ativa && (
                <span className="opcao-check">
                  <Check size={13} strokeWidth={3} />
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
                {opcao.metricas.pedidosPendentes > 0
                  ? `${opcao.metricas.pedidosAtendidos} pedidos · ${opcao.metricas.pedidosPendentes} para a próxima viagem`
                  : `Todos os ${opcao.metricas.pedidosAtendidos} pedidos`}
              </span>
            </span>

            <span className="opcao-sequencia">{sequenciaLegivel(opcao)}</span>
          </button>
        );
      })}
    </div>
  </section>
);
