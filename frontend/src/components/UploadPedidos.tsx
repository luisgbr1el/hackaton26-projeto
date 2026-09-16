import React, { useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, X, Sparkles, AlertCircle } from 'lucide-react';
import { formatTamanhoArquivo } from '../utils/format';
import { lerPeriodoDoArquivo } from '../utils/csv';
import type { ResumoArquivo } from '../utils/csv';
import { FiltroPeriodo } from './FiltroPeriodo';
import type { EscopoPedidos } from './FiltroPeriodo';
import type { Periodo } from '../types';

interface UploadPedidosProps {
  onProcessar: (arquivo: File, periodo?: Periodo) => void;
  onLimpar: () => void;
  processando: boolean;
  erro: string | null;
  onAvisoErro?: (msg: string) => void;
}

const EXTENSOES_ACEITAS = ['.csv', '.xlsx', '.xls'];

const extensaoValida = (nome: string): boolean =>
  EXTENSOES_ACEITAS.some((ext) => nome.toLowerCase().endsWith(ext));

export const UploadPedidos: React.FC<UploadPedidosProps> = ({
  onProcessar,
  onLimpar,
  processando,
  erro,
  onAvisoErro,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [resumoArquivo, setResumoArquivo] = useState<ResumoArquivo | null>(null);
  const [escopo, setEscopo] = useState<EscopoPedidos>('completo');
  const [periodo, setPeriodo] = useState<Periodo | null>(null);

  const selecionar = async (selecionado: File | undefined) => {
    if (!selecionado) return;
    if (!extensaoValida(selecionado.name)) {
      const msg = 'Formato não suportado. Por favor, envie um arquivo com extensão .csv, .xlsx ou .xls.';
      setAviso(msg);
      onAvisoErro?.(msg);
      return;
    }
    setAviso(null);
    setArquivo(selecionado);
    onLimpar();

    // lê a coluna de data do arquivo para oferecer o filtro de período
    const resumo = await lerPeriodoDoArquivo(selecionado);
    setResumoArquivo(resumo);
    setPeriodo(resumo ? { inicio: resumo.inicio, fim: resumo.fim } : null);
    setEscopo('completo');
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setArrastando(false);
    selecionar(event.dataTransfer.files?.[0]);
  };

  const remover = () => {
    setArquivo(null);
    setAviso(null);
    setResumoArquivo(null);
    setPeriodo(null);
    setEscopo('completo');
    if (inputRef.current) inputRef.current.value = '';
    onLimpar();
  };

  return (
    <section className="card upload-card">
      <div className="card-head">
        <div>
          <h2 className="card-title">Base de pedidos</h2>
          <p className="card-subtitle">
            Envie o arquivo de pedidos da semana para montar o plano de carga.
          </p>
        </div>
        <span className="chip chip-muted">CSV · XLSX</span>
      </div>

      <div
        className={`dropzone${arrastando ? ' is-dragging' : ''}${arquivo ? ' has-file' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={handleDrop}
        onClick={() => !arquivo && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !arquivo) inputRef.current?.click();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="dropzone-input"
          onChange={(e) => selecionar(e.target.files?.[0])}
        />

        {arquivo ? (
          <div className="file-preview">
            <div className="file-icon">
              <FileSpreadsheet size={22} />
            </div>
            <div className="file-info">
              <span className="file-name">{arquivo.name}</span>
              <span className="file-meta">{formatTamanhoArquivo(arquivo.size)}</span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={(e) => {
                e.stopPropagation();
                remover();
              }}
              title="Remover arquivo"
              disabled={processando}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="dropzone-empty">
            <div className="dropzone-icon">
              <UploadCloud size={26} />
            </div>
            <p className="dropzone-title">
              Arraste o arquivo aqui ou <span>selecione no computador</span>
            </p>
            <p className="dropzone-hint">
              Colunas esperadas: Pedido, Cidade, Valor_Pedido, Qtd_Itens, Itens_Resumo
            </p>
          </div>
        )}
      </div>

      {resumoArquivo && periodo && (
        <FiltroPeriodo
          arquivo={resumoArquivo}
          escopo={escopo}
          periodo={periodo}
          onEscopo={setEscopo}
          onPeriodo={setPeriodo}
          desabilitado={processando}
        />
      )}

      {arquivo && !resumoArquivo && (
        <p className="periodo-indisponivel">
          Não foi possível ler a coluna de data deste arquivo — o plano será gerado com a base
          completa.
        </p>
      )}

      {(aviso || erro) && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{aviso ?? erro}</span>
        </div>
      )}

      <div className="upload-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={
            !arquivo ||
            processando ||
            (escopo === 'periodo' && !!periodo && periodo.inicio > periodo.fim)
          }
          onClick={() =>
            arquivo &&
            onProcessar(arquivo, escopo === 'periodo' && periodo ? periodo : undefined)
          }
        >
          <Sparkles size={16} />
          {processando ? 'Calculando plano...' : 'Gerar plano de carga'}
        </button>
        <span className="upload-note">
          Envie o arquivo CSV/XLSX para calcular a rota e alocação da frota.
        </span>
      </div>
    </section>
  );
};
