import React from 'react';
import { BadgeCheck, RotateCcw, TriangleAlert } from 'lucide-react';
import type { PlanoCarga, Veiculo } from '../types';
import { CaminhaoIlustracao } from './CaminhaoIlustracao';
import { ocupacaoGeral } from '../utils/carga';
import { formatNumero, formatPercentual } from '../utils/format';

interface RecomendacaoVeiculoProps {
  plano: PlanoCarga;
  onUsarRecomendado: (veiculo: Veiculo) => void;
}

export const RecomendacaoVeiculo: React.FC<RecomendacaoVeiculoProps> = ({
  plano,
  onUsarRecomendado,
}) => {
  const { recomendacao } = plano;
  if (!recomendacao) return null;

  const { veiculo, motivo, excedeFrota } = recomendacao;
  const manual = plano.veiculo.id !== veiculo.id;
  const ocupacao = ocupacaoGeral(plano);

  return (
    <section className={`card recomendacao-card${excedeFrota ? ' is-alerta' : ''}`}>
      <div className="card-head">
        <h2 className="card-title">Veículo recomendado</h2>
        <span className={`chip ${excedeFrota ? 'chip-alerta' : 'chip-demo'}`}>
          {excedeFrota ? <TriangleAlert size={14} /> : <BadgeCheck size={14} />}
          {excedeFrota ? 'Acima da frota' : 'Recomendado'}
        </span>
      </div>

      <div className="recomendacao-linha">
        <span className="recomendacao-arte">
          <span className="recomendacao-cor" style={{ backgroundColor: veiculo.cor }} />
          <CaminhaoIlustracao veiculo={veiculo} miniatura />
        </span>

        <div className="recomendacao-texto">
          <h3>{veiculo.nome}</h3>
          <p>{motivo}</p>
        </div>

        <div className="recomendacao-metricas">
          <div className="pilula">
            <span>Carga</span>
            <strong>{formatNumero(plano.resumo.pesoTotalKg)} kg</strong>
          </div>
          <div className="pilula">
            <span>Volume</span>
            <strong>{formatNumero(plano.resumo.volumeTotalM3, 2)} m³</strong>
          </div>
          <div className="pilula pilula-ocupacao">
            <span>Ocupação</span>
            <strong>{formatPercentual(ocupacao)}</strong>
            <i
              className="pilula-barra"
              role="progressbar"
              aria-valuenow={Math.round(ocupacao)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Ocupação do veículo"
            >
              <i style={{ width: `${Math.min(ocupacao, 100)}%` }} />
            </i>
          </div>
        </div>
      </div>

      {manual && (
        <div className="recomendacao-manual">
          <span>
            Em uso: <strong>{plano.veiculo.nome}</strong>, escolhido à mão.
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onUsarRecomendado(veiculo)}
          >
            <RotateCcw size={14} />
            Voltar ao recomendado
          </button>
        </div>
      )}
    </section>
  );
};
