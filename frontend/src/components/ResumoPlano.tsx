import React from 'react';
import {
  Banknote,
  Weight,
  Box,
  PieChart,
  Boxes,
  ClipboardList,
  FileDown,
  Truck,
  CalendarRange,
} from 'lucide-react';
import type { PlanoCarga } from '../types';
import { ocupacaoGeral } from '../utils/carga';
import { formatDataBR } from '../utils/csv';
import {
  formatMoeda,
  formatNumero,
  formatPercentual,
  formatPeso,
  formatVolume,
} from '../utils/format';

interface ResumoPlanoProps {
  plano: PlanoCarga;
}

interface BarraProps {
  rotulo: string;
  percentual: number;
  utilizado: string;
  capacidade: string;
}

const Barra: React.FC<BarraProps> = ({ rotulo, percentual, utilizado, capacidade }) => (
  <div className="barra">
    <div className="barra-topo">
      <span className="barra-rotulo">{rotulo}</span>
      <span className="barra-valor">{formatPercentual(percentual)}</span>
    </div>
    <div
      className="barra-trilha"
      role="progressbar"
      aria-valuenow={Math.round(percentual)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={rotulo}
    >
      <span
        className={`barra-preenchimento${percentual > 100 ? ' is-alta' : ''}`}
        style={{ width: `${Math.min(percentual, 100)}%` }}
      />
    </div>
    <span className="barra-legenda">
      {utilizado} de {capacidade}
    </span>
  </div>
);

export const ResumoPlano: React.FC<ResumoPlanoProps> = ({ plano }) => {
  const { resumo, veiculo } = plano;
  const ocupacao = ocupacaoGeral(plano);

  return (
    <section className="card resumo-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Resumo do plano de carga</h2>
          <p className="card-subtitle">Indicadores exigidos pela operação Nobre Lar</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>
          <FileDown size={15} />
          Gerar relatório em PDF
        </button>
      </div>

      <div className="stats">
        <div className="stat stat-destaque">
          <span className="stat-icone">
            <Banknote size={18} />
          </span>
          <span className="stat-rotulo">Valor total do lote</span>
          <strong className="stat-valor">{formatMoeda(resumo.valorTotal)}</strong>
          {resumo.valorDespachado !== undefined && resumo.valorDespachado > 0 && resumo.valorDespachado < resumo.valorTotal && (
            <span className="stat-limite">
              {formatMoeda(resumo.valorDespachado)} despachados na rota
            </span>
          )}
        </div>

        <div className="stat">
          <span className="stat-icone">
            <Weight size={18} />
          </span>
          <span className="stat-rotulo">Peso total</span>
          <strong className="stat-valor">{formatPeso(resumo.pesoTotalKg)}</strong>
          <span className="stat-limite">Limite {formatPeso(resumo.capacidadeTotalKg || veiculo.capacidadePesoKg)}</span>
        </div>

        <div className="stat">
          <span className="stat-icone">
            <Box size={18} />
          </span>
          <span className="stat-rotulo">Volume total</span>
          <strong className="stat-valor">{formatVolume(resumo.volumeTotalM3)}</strong>
          <span className="stat-limite">
            Limite {formatNumero(resumo.capacidadeTotalM3 || veiculo.capacidadeVolumeM3, 2)} m³
          </span>
        </div>

        <div className="stat">
          <span className="stat-icone">
            <PieChart size={18} />
          </span>
          <span className="stat-rotulo">Ocupação da carga</span>
          <strong className="stat-valor">{formatPercentual(ocupacao)}</strong>
          <span className="stat-limite">Maior entre peso e volume</span>
        </div>
      </div>

      <div className="barras">
        <Barra
          rotulo="Ocupação por peso"
          percentual={resumo.ocupacaoPeso}
          utilizado={formatPeso(resumo.pesoTotalKg)}
          capacidade={formatPeso(resumo.capacidadeTotalKg || veiculo.capacidadePesoKg)}
        />
        <Barra
          rotulo="Ocupação por volume"
          percentual={resumo.ocupacaoVolume}
          utilizado={formatVolume(resumo.volumeTotalM3)}
          capacidade={formatVolume(resumo.capacidadeTotalM3 || veiculo.capacidadeVolumeM3)}
        />
      </div>

      <div className="resumo-veiculo">
        <span className="resumo-veiculo-selo">
          <Truck size={14} />
          {plano.recomendacao && plano.recomendacao.veiculo.id === veiculo.id
            ? 'Veículo recomendado pelo sistema'
            : 'Veículo escolhido manualmente'}
        </span>
        <strong>
          <span className="ponto-cor" style={{ backgroundColor: veiculo.cor }} />
          {veiculo.nome} · {veiculo.modelo}
        </strong>
        {plano.periodo && (
          <span className="resumo-periodo">
            <CalendarRange size={13} /> pedidos de {formatDataBR(plano.periodo.inicio)} a{' '}
            {formatDataBR(plano.periodo.fim)}
          </span>
        )}
      </div>

      <div className="resumo-rodape">
        <span>
          <ClipboardList size={14} /> {formatNumero(resumo.totalPedidos)} pedidos alocados
          {resumo.pedidosTotalLote && resumo.pedidosTotalLote > resumo.totalPedidos
            ? ` de ${formatNumero(resumo.pedidosTotalLote)} no lote`
            : ''}
        </span>
        {resumo.pedidosPendentes !== undefined && resumo.pedidosPendentes > 0 && (
          <span>
            {formatNumero(resumo.pedidosPendentes)} pedidos na fila
          </span>
        )}
        {resumo.pedidosBalcao !== undefined && resumo.pedidosBalcao > 0 && (
          <span>
            {formatNumero(resumo.pedidosBalcao)} retirada no balcão
          </span>
        )}
        <span>
          <Boxes size={14} /> {formatNumero(resumo.totalItens)} volumes
        </span>
      </div>
    </section>
  );
};
