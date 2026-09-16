import React from 'react';
import { MapPin, Route as RouteIcon, Flag } from 'lucide-react';
import type { Rota } from '../types';
import { formatNumero } from '../utils/format';

interface MapaRotaProps {
  rota: Rota;
  /** Título do card; por padrão, a rota recomendada. */
  titulo?: string;
  /** Slot para o mapa real (Leaflet, Google Maps etc.) quando estiver integrado. */
  mapaReal?: React.ReactNode;
}

const LARGURA = 800;
const ALTURA = 340;
const MARGEM_X = 56;
const MARGEM_Y = 46;

const paraPixel = (x: number, y: number) => ({
  cx: MARGEM_X + (x / 100) * (LARGURA - MARGEM_X * 2),
  cy: MARGEM_Y + (y / 100) * (ALTURA - MARGEM_Y * 2),
});

export const MapaRota: React.FC<MapaRotaProps> = ({
  rota,
  titulo = 'Melhor rota calculada',
  mapaReal,
}) => {
  const pontos = rota.paradas.map((parada) => ({
    ...parada,
    ...paraPixel(parada.x, parada.y),
  }));

  const tracado = pontos.map((p) => `${p.cx},${p.cy}`).join(' ');

  const corLinha = rota.corVeiculo || '#000';

  return (
    <section
      className="card mapa-card"
      style={rota.corVeiculo ? { borderLeft: `5px solid ${rota.corVeiculo}` } : undefined}
    >
      <div className="card-head">
        <div>
          <h2 className="card-title">{titulo}</h2>
          <p className="card-subtitle">Saída de {rota.origem}</p>
        </div>
        <div className="mapa-metricas">
          <span className="chip chip-muted">
            <RouteIcon size={14} /> {formatNumero(rota.distanciaTotalKm)} km
          </span>
          <span className="chip chip-muted">{rota.paradas.length - 1} paradas</span>
        </div>
      </div>

      <div className="mapa-viewport">
        {mapaReal ?? (
          <svg
            viewBox={`0 0 ${LARGURA} ${ALTURA}`}
            className="mapa-svg"
            role="img"
            aria-label="Mapa esquemático da rota"
          >
            <defs>
              <pattern id="grade" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M40 0H0V40" fill="none" stroke="#D8D8D8" strokeWidth="1" />
              </pattern>
            </defs>

            <rect width={LARGURA} height={ALTURA} fill="#EFEFEF" />
            <rect width={LARGURA} height={ALTURA} fill="url(#grade)" />

            <polyline
              points={tracado}
              fill="none"
              stroke={corLinha}
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={tracado}
              fill="none"
              stroke="#FFF206"
              strokeWidth="3"
              strokeDasharray="12 10"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {pontos.map((ponto, indice) => {
              const ultimo = indice === pontos.length - 1;
              return (
                <g key={ponto.ordem}>
                  <circle
                    cx={ponto.cx}
                    cy={ponto.cy}
                    r="17"
                    fill={ultimo ? '#FFF206' : corLinha}
                    stroke={corLinha}
                    strokeWidth="3"
                  />
                  <text
                    x={ponto.cx}
                    y={ponto.cy + 5}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="700"
                    fill={ultimo ? '#000' : '#FFF206'}
                  >
                    {ponto.ordem}
                  </text>
                  <text
                    x={ponto.cx}
                    y={ponto.cy - 26}
                    textAnchor="middle"
                    fontSize="14"
                    fontWeight="600"
                    fill="#000"
                  >
                    {ponto.cidade}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
        {!mapaReal && (
          <span className="mapa-nota">Pré-visualização esquemática da sequência de entregas</span>
        )}
      </div>

      <ol className="paradas">
        {rota.paradas.map((parada, indice) => (
          <li key={parada.ordem} className="parada">
            <span
              className={`parada-ordem${indice === rota.paradas.length - 1 ? ' is-final' : ''}`}
            >
              {indice === rota.paradas.length - 1 ? <Flag size={13} /> : parada.ordem}
            </span>
            <div className="parada-info">
              <span className="parada-cidade">
                <MapPin size={13} /> {parada.cidade}
              </span>
              {parada.referencia && <span className="parada-ref">{parada.referencia}</span>}
            </div>
            <div className="parada-dados">
              <span>{parada.pedidos} pedidos</span>
              <span>{formatNumero(parada.distanciaKm)} km</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};
