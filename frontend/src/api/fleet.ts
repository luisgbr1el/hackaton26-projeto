import api from './client';
import type { TipoVeiculo, Veiculo } from '../types';
import { FROTA } from '../mocks/frota';

export interface VehicleConfigDTO {
  id: number;
  name: string;
  color: string;
  hex_color: string;
  emoji: string;
  license_plate: string;
  nominal_weight_kg: number;
  nominal_volume_m3: number;
  serra_weight_kg: number;
  serra_volume_m3: number;
  urbano_weight_kg: number;
  urbano_volume_m3: number;
  operates_in_mountain: boolean;
  profile: string;
  fuel_type: string;
  fuel_tank_capacity_l: number;
  fuel_consumption_kml: number;
  fuel_cost_per_liter: number;
}

export const mapVehicleConfigToVeiculo = (dto: VehicleConfigDTO): Veiculo => {
  const nomeLower = dto.name.toLowerCase();

  let modelo = 'Caminhão Nobre Lar';
  if (nomeLower.includes('accelo')) {
    modelo = 'Mercedes-Benz Accelo';
  } else if (nomeLower.includes('kia')) {
    modelo = 'Kia Bongo';
  } else if (nomeLower.includes('hr')) {
    modelo = 'Hyundai HR';
  } else if (nomeLower.includes('moto') || nomeLower.includes('titan')) {
    modelo = 'Honda CG 160 Start';
  }

  let tipo: TipoVeiculo = 'pequeno';
  if (dto.nominal_weight_kg >= 3000) {
    tipo = 'grande';
  } else if (dto.nominal_weight_kg <= 500) {
    tipo = 'moto';
  }

  let porte = 'Médio';
  if (tipo === 'grande') {
    porte = 'Pesado';
  } else if (tipo === 'moto') {
    porte = 'Expresso';
  }

  return {
    id: String(dto.id),
    nome: dto.name,
    modelo,
    tipo,
    porte,
    perfil: dto.profile,
    cor: dto.hex_color || '#2563EB',
    capacidadePesoKg: dto.nominal_weight_kg,
    capacidadeVolumeM3: dto.nominal_volume_m3,
    tanqueLitros: dto.fuel_tank_capacity_l || 150,
    consumoKmPorLitro: dto.fuel_consumption_kml || 4.5,
    placa: dto.license_plate || 'CRA-0000',
  };
};

/**
 * Busca a frota oficial cadastrada e configurada no backend.
 */
export const getFleetApi = async (): Promise<Veiculo[]> => {
  try {
    const response = await api.get<VehicleConfigDTO[]>('/routing/fleet');
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data.map(mapVehicleConfigToVeiculo);
    }
    return FROTA;
  } catch (err) {
    console.warn('Falha ao carregar frota da API, usando frota local padrão:', err);
    return FROTA;
  }
};
