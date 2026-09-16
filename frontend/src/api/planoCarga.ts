import type { Periodo, PlanoCarga, Veiculo } from '../types';
import {
  otimizarRotas,
  obterResumoDespacho,
  mapDispatchSummaryToPlanoCarga,
  type OptimizeResponse,
  type DispatchSummaryResponse,
} from './routing';
import { getFleetApi } from './fleet';

export interface ResultadoOtimizacaoCompleto {
  plano: PlanoCarga;
  optimizeResp: OptimizeResponse;
  summary: DispatchSummaryResponse;
}

/**
 * Envia o CSV de pedidos para o backend FastAPI (/api/v1/routing/optimize),
 * executa o algoritmo Google OR-Tools e busca o resumo consolidado de despacho.
 */
export const gerarPlanoCarga = async (
  arquivo: File,
  periodo?: Periodo,
  frota?: Veiculo[],
): Promise<PlanoCarga> => {
  const frotaEfetiva = frota && frota.length > 0 ? frota : await getFleetApi();
  const optimizeResp = await otimizarRotas(arquivo, periodo);
  const summary = await obterResumoDespacho(optimizeResp.report_id, 'recomendada');

  return mapDispatchSummaryToPlanoCarga(summary, optimizeResp, frotaEfetiva, 'melhor');
};

/**
 * Retorna tanto o PlanoCarga quanto as respostas brutas da API para controle fino do estado.
 */
export const gerarPlanoCargaCompleto = async (
  arquivo: File,
  periodo?: Periodo,
  frota?: Veiculo[],
): Promise<ResultadoOtimizacaoCompleto> => {
  const frotaEfetiva = frota && frota.length > 0 ? frota : await getFleetApi();
  const optimizeResp = await otimizarRotas(arquivo, periodo);
  const summary = await obterResumoDespacho(optimizeResp.report_id, 'recomendada');
  const plano = mapDispatchSummaryToPlanoCarga(summary, optimizeResp, frotaEfetiva, 'melhor');

  return {
    plano,
    optimizeResp,
    summary,
  };
};
