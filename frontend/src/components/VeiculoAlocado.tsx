import React from 'react';
import { Fuel, Gauge, Package, Route, TriangleAlert, Weight } from 'lucide-react';
import type { PlanoCarga } from '../types';
import { CaminhaoIlustracao } from './CaminhaoIlustracao';
import { combustivelDaRota, ocupacaoGeral, excedeCapacidade } from '../utils/carga';
import { formatNumero, formatPercentual } from '../utils/format';

interface VeiculoAlocadoProps {
  plano: PlanoCarga;
}

export const VeiculoAlocado: React.FC<VeiculoAlocadoProps> = ({ plano }) => {
  const { veiculo, resumo } = plano;
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
