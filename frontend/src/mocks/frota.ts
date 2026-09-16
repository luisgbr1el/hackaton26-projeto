import type { Veiculo } from '../types';

/**
 * Frota oficial do Grupo Nobre Lar (5 veículos).
 * A cor é o marcador de identificação da unidade na operação; a identidade
 * visual da interface permanece em preto, amarelo e cinza.
 */
export const FROTA: Veiculo[] = [
  {
    id: 'ACC-01',
    nome: 'Accelo Grande 1',
    modelo: 'Mercedes-Benz Accelo',
    tipo: 'grande',
    porte: 'Pesado',
    perfil: 'Rotas de Interior · Eixo Oeste/Sul',
    cor: '#2563EB',
    capacidadePesoKg: 4800,
    capacidadeVolumeM3: 2.45,
    tanqueLitros: 150,
    consumoKmPorLitro: 5.5,
  },
  {
    id: 'ACC-02',
    nome: 'Accelo Grande 2',
    modelo: 'Mercedes-Benz Accelo',
    tipo: 'grande',
    porte: 'Pesado',
    perfil: 'Rotas de Interior · Eixo Leste/Serra',
    cor: '#DC2626',
    capacidadePesoKg: 4800,
    capacidadeVolumeM3: 2.45,
    tanqueLitros: 150,
    consumoKmPorLitro: 5.5,
  },
  {
    id: 'KIA-01',
    nome: 'Kia Pequeno',
    modelo: 'Kia Bongo',
    tipo: 'pequeno',
    porte: 'Médio',
    perfil: 'Cargas Intermediárias e Interior Próximo',
    cor: '#16A34A',
    capacidadePesoKg: 1700,
    capacidadeVolumeM3: 2.18,
    tanqueLitros: 60,
    consumoKmPorLitro: 9.0,
  },
  {
    id: 'HR-01',
    nome: 'HR Pequeno',
    modelo: 'Hyundai HR',
    tipo: 'pequeno',
    porte: 'Médio',
    perfil: 'Urgências e Cargas Médias Urbanas',
    cor: '#EA580C',
    capacidadePesoKg: 1700,
    capacidadeVolumeM3: 2.18,
    tanqueLitros: 65,
    consumoKmPorLitro: 9.5,
  },
  {
    id: 'MOTO-01',
    nome: 'Moto',
    modelo: 'Motofrete com baú',
    tipo: 'moto',
    porte: 'Expresso',
    perfil: 'Ponto das Topics & Urgências Urbanas',
    cor: '#EAB308',
    capacidadePesoKg: 300,
    capacidadeVolumeM3: 0.38,
    tanqueLitros: 12,
    consumoKmPorLitro: 35.0,
  },
];

export const veiculoPorId = (id: string): Veiculo =>
  FROTA.find((veiculo) => veiculo.id === id) ?? FROTA[0];
