import api from './client';
import type { HealthStatus } from '../types';

export const getHealth = async (): Promise<HealthStatus> => {
  const response = await api.get<HealthStatus>('/health');
  return response.data;
};
