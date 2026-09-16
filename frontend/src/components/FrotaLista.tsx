import React from 'react';
import { Check } from 'lucide-react';
import type { Veiculo } from '../types';
import { formatNumero } from '../utils/format';
import { CaminhaoIlustracao } from './CaminhaoIlustracao';

interface FrotaListaProps {
  frota: Veiculo[];
  selecionadoId?: string;
  onSelecionar: (veiculo: Veiculo) => void;
}

export const FrotaLista: React.FC<FrotaListaProps> = ({
  frota,
  selecionadoId,
  onSelecionar,
}) => (
  <section className="card frota-card">
    <div className="card-head">
      <div>
        <h2 className="card-title">Frota Nobre Lar</h2>
        <p className="card-subtitle">
          5 unidades disponíveis · selecione uma para ver o plano de carga dela
        </p>
      </div>
      <span className="chip chip-muted">{frota.length} veículos</span>
    </div>

    <div className="frota-grid">
      {frota.map((veiculo) => {
        const ativo = veiculo.id === selecionadoId;

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
