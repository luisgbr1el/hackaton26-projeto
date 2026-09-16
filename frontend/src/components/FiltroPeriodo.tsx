import React from 'react';
import { CalendarRange, Database, CalendarDays } from 'lucide-react';
import type { Periodo } from '../types';
import type { ResumoArquivo } from '../utils/csv';
import { formatDataBR } from '../utils/csv';
import { formatNumero } from '../utils/format';

export type EscopoPedidos = 'periodo' | 'completo';

interface FiltroPeriodoProps {
  arquivo: ResumoArquivo;
  escopo: EscopoPedidos;
  periodo: Periodo;
  onEscopo: (escopo: EscopoPedidos) => void;
  onPeriodo: (periodo: Periodo) => void;
  desabilitado?: boolean;
}

export const FiltroPeriodo: React.FC<FiltroPeriodoProps> = ({
  arquivo,
  escopo,
  periodo,
  onEscopo,
  onPeriodo,
  desabilitado = false,
}) => {
  const invalido = periodo.inicio > periodo.fim;

  return (
    <div className="periodo">
      <div className="periodo-head">
        <span className="periodo-titulo">
          <CalendarRange size={15} /> Período dos pedidos
        </span>
        <span className="periodo-base">
          {formatNumero(arquivo.registros)} registros na coluna
          <code>{arquivo.coluna}</code>, de {formatDataBR(arquivo.inicio)} a{' '}
          {formatDataBR(arquivo.fim)}
        </span>
      </div>

      <div className="periodo-opcoes">
        <button
          type="button"
          className={`periodo-opcao${escopo === 'periodo' ? ' is-ativa' : ''}`}
          onClick={() => onEscopo('periodo')}
          aria-pressed={escopo === 'periodo'}
          disabled={desabilitado}
        >
          <CalendarDays size={16} />
          <span>
            <strong>Filtrar por período</strong>
            Considera apenas os pedidos do intervalo escolhido
          </span>
        </button>

        <button
          type="button"
          className={`periodo-opcao${escopo === 'completo' ? ' is-ativa' : ''}`}
          onClick={() => onEscopo('completo')}
          aria-pressed={escopo === 'completo'}
          disabled={desabilitado}
        >
          <Database size={16} />
          <span>
            <strong>Usar CSV completo</strong>
            Processa todos os {formatNumero(arquivo.registros)} registros da base
          </span>
        </button>
      </div>

      {escopo === 'periodo' && (
        <div className="periodo-datas">
          <div className="form-group">
            <label htmlFor="data-inicial">Data inicial</label>
            <input
              id="data-inicial"
              type="date"
              className="campo campo-data"
              value={periodo.inicio}
              min={arquivo.inicio}
              max={arquivo.fim}
              disabled={desabilitado}
              onChange={(evento) => onPeriodo({ ...periodo, inicio: evento.target.value })}
            />
          </div>

          <div className="form-group">
            <label htmlFor="data-final">Data final</label>
            <input
              id="data-final"
              type="date"
              className="campo campo-data"
              value={periodo.fim}
              min={arquivo.inicio}
              max={arquivo.fim}
              disabled={desabilitado}
              onChange={(evento) => onPeriodo({ ...periodo, fim: evento.target.value })}
            />
          </div>

          <button
            type="button"
            className="periodo-tudo"
            onClick={() => onPeriodo({ inicio: arquivo.inicio, fim: arquivo.fim })}
            disabled={desabilitado}
          >
            Usar todo o intervalo do arquivo
          </button>
        </div>
      )}

      {invalido && escopo === 'periodo' && (
        <p className="periodo-erro">A data inicial não pode ser maior que a data final.</p>
      )}
    </div>
  );
};
