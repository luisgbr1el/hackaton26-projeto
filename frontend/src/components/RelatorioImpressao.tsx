import React from 'react';
import type { PlanoCarga } from '../types';
import { combustivelDaRota, ocupacaoGeral } from '../utils/carga';
import { montarOrdem, ZONAS } from '../utils/carregamento';
import { formatDataBR } from '../utils/csv';
import {
  formatDuracao,
  formatMoeda,
  formatNumero,
  formatPercentual,
  formatPeso,
  formatVolume,
} from '../utils/format';

interface RelatorioImpressaoProps {
  plano: PlanoCarga;
}

/**
 * Versão do plano preparada para impressão / salvar em PDF.
 * Fica oculta na tela e só aparece no `@media print` (ver index.css),
 * acionada pelo botão "Gerar relatório em PDF" do resumo.
 */
export const RelatorioImpressao: React.FC<RelatorioImpressaoProps> = ({ plano }) => {
  const { veiculo, resumo, rota } = plano;
  const itens = montarOrdem(plano);
  const combustivel = combustivelDaRota(veiculo, rota.distanciaTotalKm);
  const paradas = rota.paradas;

  return (
    <div className="relatorio">
      <header className="relatorio-topo">
        <img className="relatorio-logo" src="/LOGO.svg" alt="Nobre Lar" />
        <div className="relatorio-identificacao">
          <h1>Plano de carga {plano.id}</h1>
          <p>
            {veiculo.nome} · {veiculo.modelo} · {rota.origem}
          </p>
          <p>
            {plano.periodo
              ? `Pedidos de ${formatDataBR(plano.periodo.inicio)} a ${formatDataBR(
                  plano.periodo.fim,
                )}`
              : 'Base completa do arquivo enviado'}{' '}
            · emitido em {new Date().toLocaleString('pt-BR')}
          </p>
        </div>
      </header>

      <section className="relatorio-secao">
        <h2>Resumo da carga</h2>
        <div className="relatorio-indicadores">
          <div>
            <span>Valor total</span>
            <strong>{formatMoeda(resumo.valorTotal)}</strong>
          </div>
          <div>
            <span>Peso total</span>
            <strong>{formatPeso(resumo.pesoTotalKg)}</strong>
            <small>limite {formatPeso(veiculo.capacidadePesoKg)}</small>
          </div>
          <div>
            <span>Volume total</span>
            <strong>{formatVolume(resumo.volumeTotalM3)}</strong>
            <small>limite {formatVolume(veiculo.capacidadeVolumeM3)}</small>
          </div>
          <div>
            <span>Ocupação do veículo</span>
            <strong>{formatPercentual(ocupacaoGeral(plano))}</strong>
            <small>
              peso {formatPercentual(resumo.ocupacaoPeso)} · volume{' '}
              {formatPercentual(resumo.ocupacaoVolume)}
            </small>
          </div>
        </div>
        <p className="relatorio-nota">
          {resumo.totalPedidos} pedidos · {formatNumero(resumo.totalItens)} itens
          {plano.retiradasDescartadas
            ? ` · ${plano.retiradasDescartadas} de retirada no balcão fora do plano`
            : ''}
          {plano.foraDoPeriodo ? ` · ${plano.foraDoPeriodo} fora do período` : ''}
        </p>
      </section>

      <section className="relatorio-secao">
        <h2>Veículo recomendado</h2>
        <p className="relatorio-veiculo">
          <strong>{veiculo.nome}</strong> · {veiculo.modelo} · {veiculo.porte} ·{' '}
          {veiculo.perfil}
        </p>
        {plano.recomendacao && (
          <p className="relatorio-nota">
            {plano.recomendacao.veiculo.id === veiculo.id
              ? `Recomendado pelo sistema · ${plano.recomendacao.motivo} · ${formatPercentual(
                  ocupacaoGeral(plano),
                )} de ocupação`
              : `Escolhido manualmente · o sistema recomenda ${plano.recomendacao.veiculo.nome}`}
          </p>
        )}
        <p className="relatorio-nota">
          Capacidade {formatNumero(veiculo.capacidadePesoKg)} kg ·{' '}
          {formatNumero(veiculo.capacidadeVolumeM3, 2)} m³ · tanque{' '}
          {formatNumero(combustivel.tanqueLitros)} L · autonomia{' '}
          {formatNumero(combustivel.autonomiaKm)} km · consumo estimado da rota{' '}
          {formatNumero(combustivel.consumoRotaLitros, 1)} L
          {combustivel.precisaAbastecer
            ? ' — o veículo precisará abastecer durante o percurso.'
            : '.'}
        </p>
      </section>

      <section className="relatorio-secao">
        <h2>Rota definida</h2>
        <p className="relatorio-nota">
          {formatNumero(rota.distanciaTotalKm)} km · {formatDuracao(rota.tempoEstimadoMin)} ·
          saída de {rota.origem}
        </p>
        <table className="relatorio-tabela">
          <thead>
            <tr>
              <th>#</th>
              <th>Cidade</th>
              <th>Referência</th>
              <th className="num">Pedidos</th>
              <th className="num">Trecho</th>
              <th>Janela</th>
            </tr>
          </thead>
          <tbody>
            {paradas.map((parada) => (
              <tr key={`${parada.ordem}-${parada.cidade}-${parada.referencia ?? ''}`}>
                <td>{parada.ordem}</td>
                <td>{parada.cidade}</td>
                <td>{parada.referencia ?? '—'}</td>
                <td className="num">{parada.pedidos || '—'}</td>
                <td className="num">{formatNumero(parada.distanciaKm)} km</td>
                <td>{parada.janelaEntrega ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="relatorio-secao">
        <h2>Ordem de carregamento</h2>
        <p className="relatorio-nota">
          Embarque na ordem inversa das entregas: o mais denso entra primeiro e fica no fundo;
          a primeira entrega fica junto à porta.
        </p>
        <table className="relatorio-tabela">
          <thead>
            <tr>
              <th>Ordem</th>
              <th>Posição</th>
              <th>Pedido</th>
              <th>Destino</th>
              <th className="num">Peso</th>
              <th className="num">Volume</th>
              <th className="num">Ocupação</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.pedido.pedido}>
                <td>{item.ordem}</td>
                <td>{ZONAS[item.zona]}</td>
                <td>{item.pedido.pedido}</td>
                <td>
                  {item.destino}
                  {item.entrega ? ` (${item.entrega}ª entrega)` : ''}
                </td>
                <td className="num">{formatNumero(item.pedido.pesoKg)} kg</td>
                <td className="num">{formatNumero(item.pedido.volumeM3, 2)} m³</td>
                <td className="num">{formatPercentual(item.ocupacao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="relatorio-rodape">
        Nobre Lar · Crateús, CE · Plano de Carga Inteligente
      </footer>
    </div>
  );
};
