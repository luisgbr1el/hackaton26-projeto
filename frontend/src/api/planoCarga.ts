import api from './client';
import type { Periodo, PlanoCarga } from '../types';

/**
 * Envia o CSV de pedidos para o backend e recebe o plano de carga calculado.
 * O endpoint é implementado pelo time de otimização; a interface apenas consome.
 */
export const gerarPlanoCarga = async (
  arquivo: File,
  periodo?: Periodo,
): Promise<PlanoCarga> => {
  const formData = new FormData();
  formData.append('arquivo', arquivo);
  if (periodo) {
    formData.append('dataInicial', periodo.inicio);
    formData.append('dataFinal', periodo.fim);
  }

  const response = await api.post<PlanoCarga>('/plano-carga', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000,
  });

  return response.data;
};
