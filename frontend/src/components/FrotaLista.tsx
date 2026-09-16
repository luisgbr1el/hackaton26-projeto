import React from 'react';
import { Check, CheckCircle2, Clock } from 'lucide-react';
import type { Veiculo, VeiculoEmUso } from '../types';
import { formatNumero } from '../utils/format';
import { CaminhaoIlustracao } from './CaminhaoIlustracao';

interface FrotaListaProps {
  frota: Veiculo[];
  selecionadoId?: string;
  onSelecionar: (veiculo: Veiculo) => void;
  veiculosEmUso?: VeiculoEmUso[];
}

export const FrotaLista: React.FC<FrotaListaProps> = ({
  frota,
  selecionadoId,
  onSelecionar,
  veiculosEmUso = [],
}) => {
  const idsEmUso = new Set(veiculosEmUso.map((v) => String(v.id)));
  const mapaEmUso = new Map(veiculosEmUso.map((v) => [String(v.id), v]));

  return (
    <section className="card frota-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Frota da Unidade Crateús</h2>
          <p className="card-subtitle">
            {frota.length} unidades cadastradas · {veiculosEmUso.length} em operação na rota atual
          </p>
        </div>
        <span className="chip chip-muted">{frota.length} veículos</span>
      </div>

      <div className="frota-grid">
        {frota.map((veiculo) => {
          const ativo = veiculo.id === selecionadoId;
          const emUso = idsEmUso.has(String(veiculo.id));
          const dadosUso = mapaEmUso.get(String(veiculo.id));

          return (
            <button
              key={veiculo.id}
              type="button"
              className={`frota-item${ativo ? ' is-ativo' : ''}`}
              onClick={() => onSelecionar(veiculo)}
              aria-pressed={ativo}
              style={{ borderLeftColor: veiculo.cor }}
            >
              <span className="frota-topo">
                <span className="frota-icone">
                  <CaminhaoIlustracao veiculo={veiculo} miniatura />
                </span>
                <span className="frota-identificacao">
                  <span className="frota-nome">{veiculo.nome}</span>
                  <span className="frota-modelo">{veiculo.modelo}</span>
                </span>
                {ativo && (
                  <span className="frota-check">
                    <Check size={13} strokeWidth={3} />
                  </span>
                )}
              </span>

              {/* Status de Operação do Veículo */}
              <div style={{ marginTop: '0.4rem', marginBottom: '0.2rem' }}>
                {emUso && dadosUso ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: '#DCFCE7',
                      color: '#15803D',
                    }}
                  >
                    <CheckCircle2 size={12} /> Em Operação ({formatNumero(dadosUso.pesoKg)} kg · {dadosUso.paradasCount} entregas)
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: '#F3F4F6',
                      color: '#6B7280',
                    }}
                  >
                    <Clock size={12} /> Disponível no CD
                  </span>
                )}
              </div>

              <span className="frota-perfil">
                <span className="frota-porte">{veiculo.porte}</span>
                {veiculo.perfil}
              </span>

              <span className="frota-capacidades">
                <span>
                  <strong>{formatNumero(veiculo.capacidadePesoKg)} kg</strong>
                  capacidade de peso
                </span>
                <span>
                  <strong>{formatNumero(veiculo.capacidadeVolumeM3, 2)} m³</strong>
                  capacidade de volume
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
