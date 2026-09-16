import api from './client';
import type {
  CriterioRota,
  OpcaoRota,
  ParadaRota,
  PedidoAlocado,
  Periodo,
  PlanoCarga,
  PrioridadePedido,
  Recomendacao,
  Rota,
  Veiculo,
  VeiculoEmUso,
} from '../types';
import { FROTA } from '../mocks/frota';

/* ------------------------------------------------------------------
 * DTOs que espelham exatamente os contratos do Backend FastAPI
 * ------------------------------------------------------------------ */

export interface DateFilterMetadataDTO {
  start_date?: string;
  end_date?: string;
  total_orders_before_filter: number;
  orders_retained: number;
  orders_filtered_out: number;
  applied: boolean;
}

export interface RecommendedTruckDTO {
  vehicle_id: number;
  vehicle_name: string;
  license_plate: string;
  color: string;
  hex_color: string;
  emoji: string;
  effective_capacity_kg: number;
  effective_capacity_m3: number;
  total_batch_weight_kg: number;
  total_batch_volume_m3: number;
  estimated_occupancy_percent: number;
  reason: string;
}

export interface RouteStopDTO {
  stop_number: number;
  order_id: string;
  city: string;
  delivery_type: string;
  weight_kg: number;
  volume_m3: number;
  value_reais: number;
  items_summary: string;
  lat: number;
  lon: number;
  distance_from_prev_km: number;
  cumulative_distance_km: number;
  loading_order_position: number;
  loading_order_label: string;
  address?: string;
  is_intra_city: boolean;
  route_type: string;
}

export interface VehicleFuelDTO {
  fuel_type: string;
  tank_capacity_liters: number;
  avg_consumption_kml: number;
  estimated_consumption_liters: number;
  estimated_cost_reais: number;
  max_autonomy_km: number;
  remaining_fuel_liters: number;
  needs_refuel: boolean;
  fuel_status: string;
  message: string;
}

export interface VehicleRouteDTO {
  vehicle_id: number;
  vehicle_name: string;
  license_plate: string;
  color: string;
  hex_color: string;
  emoji: string;
  is_recommended: boolean;
  recommendation_reason?: string;
  total_distance_km: number;
  total_weight_kg: number;
  total_volume_m3: number;
  effective_capacity_kg: number;
  effective_capacity_m3: number;
  safety_factor_label: string;
  occupancy_rate_percent: number;
  meets_minimum_load: boolean;
  has_topics: boolean;
  has_urgent: boolean;
  stops_count: number;
  intra_city_stops_count: number;
  inter_city_stops_count: number;
  fuel_info?: VehicleFuelDTO;
  stops: RouteStopDTO[];
  geojson: Record<string, unknown>;
  manifest_markdown: string;
}

export interface StrategySummaryCardDTO {
  strategy_id: string;
  strategy_name: string;
  badge_label: string;
  description: string;
  total_distance_km: number;
  total_time_hours: number;
  total_weight_kg: number;
  total_volume_m3: number;
  total_value_reais: number;
  total_fuel_liters: number;
  total_fuel_cost_reais: number;
  vehicles_used: string[];
  stops_count: number;
}

export interface LoadingOrderItemDTO {
  loading_order_position: number;
  loading_order_label: string;
  stop_number: number;
  order_id: string;
  city: string;
  address?: string;
  delivery_type: string;
  weight_kg: number;
  volume_m3: number;
  value_reais: number;
  items_summary: string;
}

export interface VehicleSummaryDTO {
  vehicle_id: number;
  vehicle_name: string;
  license_plate: string;
  color: string;
  hex_color: string;
  emoji: string;
  is_recommended: boolean;
  recommendation_reason?: string;
  effective_capacity_kg: number;
  effective_capacity_m3: number;
  safety_factor_label: string;
  total_weight_kg: number;
  total_volume_m3: number;
  total_value_reais: number;
  occupancy_rate_percent: number;
  total_distance_km: number;
  stops_count: number;
  fuel_info?: VehicleFuelDTO;
  loading_order: LoadingOrderItemDTO[];
}

export interface DefinedRouteStrategyDTO {
  strategy_id: string;
  strategy_name: string;
  badge_label: string;
  description: string;
}

export interface OptimizeResponse {
  report_id: number;
  filename: string;
  user_prompt?: string;
  total_orders_processed: number;
  total_orders_routed: number;
  total_pickup_orders: number;
  total_unassigned_orders: number;
  total_batch_value_reais?: number;
  total_batch_weight_kg?: number;
  total_batch_volume_m3?: number;
  total_batch_orders?: number;
  routed_value_reais?: number;
  unassigned_value_reais?: number;
  pickup_value_reais?: number;
  is_mountain_route: boolean;
  safety_factor_label: string;
  strategies_summary: StrategySummaryCardDTO[];
  recommended_truck?: RecommendedTruckDTO;
  date_filter_applied?: DateFilterMetadataDTO;
  pickup_orders: Record<string, unknown>[];
  unassigned_orders: Record<string, unknown>[];
  reasoning?: string;
}

export interface DispatchSummaryResponse {
  report_id: number;
  filename: string;
  total_value_reais: number;
  total_batch_value_reais?: number;
  total_batch_weight_kg?: number;
  total_batch_volume_m3?: number;
  total_batch_orders?: number;
  routed_value_reais?: number;
  unassigned_value_reais?: number;
  pickup_value_reais?: number;
  total_fleet_capacity_kg?: number;
  total_fleet_capacity_m3?: number;
  total_weight_kg: number;
  total_volume_m3: number;
  total_distance_km: number;
  overall_occupancy_rate_percent: number;
  defined_route: DefinedRouteStrategyDTO;
  vehicles_count: number;
  vehicles: VehicleSummaryDTO[];
  all_loading_orders: LoadingOrderItemDTO[];
  recommended_truck?: RecommendedTruckDTO;
  date_filter_applied?: DateFilterMetadataDTO;
  total_fuel_liters: number;
  total_fuel_cost_reais: number;
  manifest_markdown?: string;
  routes?: VehicleRouteDTO[];
}

/* ------------------------------------------------------------------
 * Mapeamentos de Estratégias (Frontend <-> Backend)
 * ------------------------------------------------------------------ */

export const mapaEstrategiaParaBackend: Record<CriterioRota, string> = {
  melhor: 'recomendada',
  custo: 'menor_custo',
  tempo: 'menor_tempo',
  peso: 'menor_peso',
  volume: 'menor_volume',
};

export const mapaBackendParaEstrategia: Record<string, CriterioRota> = {
  recomendada: 'melhor',
  melhor: 'melhor',
  menor_custo: 'custo',
  custo: 'custo',
  menor_tempo: 'tempo',
  tempo: 'tempo',
  menor_peso: 'peso',
  peso: 'peso',
  menor_volume: 'volume',
  volume: 'volume',
};

/* ------------------------------------------------------------------
 * Chamadas de API Reais
 * ------------------------------------------------------------------ */

/**
 * Envia o arquivo CSV de pedidos para o backend executar o Google OR-Tools.
 */
export const otimizarRotas = async (
  arquivo: File,
  periodo?: Periodo,
  userPrompt?: string,
): Promise<OptimizeResponse> => {
  const formData = new FormData();
  formData.append('file', arquivo);

  if (periodo?.inicio) {
    formData.append('start_date', periodo.inicio);
  }
  if (periodo?.fim) {
    formData.append('end_date', periodo.fim);
  }
  if (userPrompt) {
    formData.append('user_prompt', userPrompt);
  }

  const response = await api.post<OptimizeResponse>('/routing/optimize', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });

  return response.data;
};

/**
 * Obtém o resumo consolidado de despacho e carregamento para uma estratégia específica.
 */
export const obterResumoDespacho = async (
  reportId: number,
  estrategia: string = 'recomendada',
): Promise<DispatchSummaryResponse> => {
  const strategyParam = mapaEstrategiaParaBackend[estrategia as CriterioRota] || estrategia;
  const response = await api.get<DispatchSummaryResponse>(`/routing/summary/${reportId}`, {
    params: { strategy: strategyParam },
  });

  return response.data;
};

/* ------------------------------------------------------------------
 * Adaptador / Mapper: Converte DispatchSummaryResponse em PlanoCarga
 * ------------------------------------------------------------------ */

/**
 * Normaliza as coordenadas geográficas (lat, lon) dos pontos de parada
 * para a escala esquemática 0-100 consumida pelo SVG do MapaRota.
 */
const normalizarCoordenadas = (
  paradas: RouteStopDTO[],
): { x: number; y: number }[] => {
  if (paradas.length === 0) return [];

  // Ponto de partida padrão: CD Nobre Lar Crateús
  const cdLat = -5.178;
  const cdLon = -40.672;

  const todasLats = [cdLat, ...paradas.map((p) => p.lat)];
  const todasLons = [cdLon, ...paradas.map((p) => p.lon)];

  let minLat = Math.min(...todasLats);
  let maxLat = Math.max(...todasLats);
  let minLon = Math.min(...todasLons);
  let maxLon = Math.max(...todasLons);

  // Evita divisão por zero caso todos os pontos fiquem no mesmo local
  if (Math.abs(maxLat - minLat) < 0.0001) {
    maxLat += 0.02;
    minLat -= 0.02;
  }
  if (Math.abs(maxLon - minLon) < 0.0001) {
    maxLon += 0.02;
    minLon -= 0.02;
  }

  // Margens percentuais para não encostar na borda do mapa
  const margemX = 12;
  const margemY = 14;
  const larguraUtil = 100 - margemX * 2;
  const alturaUtil = 100 - margemY * 2;

  return paradas.map((p) => {
    // longitude mapeia no eixo X
    const xNorm = margemX + ((p.lon - minLon) / (maxLon - minLon)) * larguraUtil;
    // latitude mapeia invertida no eixo Y (norte em cima, sul em baixo)
    const yNorm = margemY + ((maxLat - p.lat) / (maxLat - minLat)) * alturaUtil;
    return {
      x: Math.max(5, Math.min(95, Math.round(xNorm))),
      y: Math.max(5, Math.min(95, Math.round(yNorm))),
    };
  });
};

/**
 * Converte o retorno consolidado do backend no modelo PlanoCarga utilizado
 * por todos os componentes do frontend.
 */
export const mapDispatchSummaryToPlanoCarga = (
  summary: DispatchSummaryResponse,
  optimizeResp?: OptimizeResponse,
  frota: Veiculo[] = FROTA,
  _estrategiaAtiva: CriterioRota = 'melhor',
): PlanoCarga => {
  // 1. Identificar o veículo correspondente na frota
  const veiculoSummary = summary.vehicles[0];
  const recTruck = summary.recommended_truck || optimizeResp?.recommended_truck;

  let veiculoAlocado: Veiculo | undefined;
  if (veiculoSummary) {
    const idStr = String(veiculoSummary.vehicle_id);
    veiculoAlocado = frota.find(
      (v) => v.id === idStr || v.nome.toLowerCase() === veiculoSummary.vehicle_name.toLowerCase(),
    );
  }

  if (!veiculoAlocado && recTruck) {
    const recIdStr = String(recTruck.vehicle_id);
    veiculoAlocado = frota.find(
      (v) => v.id === recIdStr || v.nome.toLowerCase() === recTruck.vehicle_name.toLowerCase(),
    );
  }

  if (!veiculoAlocado) {
    veiculoAlocado = frota[0] || {
      id: '0',
      nome: veiculoSummary?.vehicle_name || 'Accelo Médio 1',
      modelo: 'Mercedes-Benz Accelo',
      tipo: 'grande',
      porte: 'Pesado',
      perfil: 'Rotas de Interior · Eixo Oeste/Sul',
      cor: veiculoSummary?.hex_color || '#2563EB',
      capacidadePesoKg: veiculoSummary?.effective_capacity_kg || 4800,
      capacidadeVolumeM3: veiculoSummary?.effective_capacity_m3 || 2.45,
      tanqueLitros: veiculoSummary?.fuel_info?.tank_capacity_liters || 150,
      consumoKmPorLitro: veiculoSummary?.fuel_info?.avg_consumption_kml || 4.2,
      placa: veiculoSummary?.license_plate || 'CRA-1A01',
    };
  }

  // Se o backend forneceu dados mais precisos do veículo da rota, incorporar
  if (veiculoSummary) {
    veiculoAlocado = {
      ...veiculoAlocado,
      nome: veiculoSummary.vehicle_name,
      cor: veiculoSummary.hex_color || veiculoAlocado.cor,
      placa: veiculoSummary.license_plate || veiculoAlocado.placa,
      capacidadePesoKg: veiculoSummary.effective_capacity_kg || veiculoAlocado.capacidadePesoKg,
      capacidadeVolumeM3: veiculoSummary.effective_capacity_m3 || veiculoAlocado.capacidadeVolumeM3,
      tanqueLitros: veiculoSummary.fuel_info?.tank_capacity_liters || veiculoAlocado.tanqueLitros,
      consumoKmPorLitro:
        veiculoSummary.fuel_info?.avg_consumption_kml || veiculoAlocado.consumoKmPorLitro,
    };
  }

  // 2. Rota consolidada (todas as paradas de todos os veículos) para fallback
  const todasParadasRota: RouteStopDTO[] = [];
  if (summary.routes && summary.routes.length > 0) {
    summary.routes.forEach((r) => {
      if (Array.isArray(r.stops)) {
        todasParadasRota.push(...r.stops);
      }
    });
  }

  const coords = normalizarCoordenadas(todasParadasRota);

  const paradasMapeadas: ParadaRota[] = [
    {
      ordem: 1,
      cidade: 'Crateús',
      referencia: 'CD Nobre Lar · Partida',
      pedidos: 0,
      distanciaKm: 0,
      x: 16,
      y: 50,
    },
  ];

  todasParadasRota.forEach((stop, index) => {
    const ref = stop.address
      ? stop.address
      : stop.is_intra_city
        ? 'Entrega Urbana'
        : 'Polo Regional';

    paradasMapeadas.push({
      ordem: index + 2,
      cidade: stop.city,
      referencia: ref,
      pedidos: 1,
      distanciaKm: Math.round(stop.distance_from_prev_km * 10) / 10,
      x: coords[index]?.x ?? Math.min(85, 20 + index * 12),
      y: coords[index]?.y ?? Math.min(80, 30 + (index % 3) * 20),
    });
  });

  // Rota consolidada
  const tempoEstimadoMin =
    summary.routes && summary.routes.length > 0
      ? Math.round(
          (summary.total_distance_km / 48) * 60 + summary.all_loading_orders.length * 15,
        )
      : Math.round((summary.total_distance_km / 45) * 60 + 40);

  const rota: Rota = {
    origem: 'CD Nobre Lar · Crateús, CE',
    distanciaTotalKm: Math.round(summary.total_distance_km * 10) / 10,
    tempoEstimadoMin,
    paradas: paradasMapeadas,
  };

  // 2b. Rotas individuais por veículo (a partir de summary.routes do backend)
  const buildRotaVeiculo = (vRoute: VehicleRouteDTO): Rota => {
    const stopsCoords = normalizarCoordenadas(vRoute.stops);
    const paradas: ParadaRota[] = [
      {
        ordem: 1,
        cidade: 'Crateús',
        referencia: 'CD Nobre Lar · Partida',
        pedidos: 0,
        distanciaKm: 0,
        x: 16,
        y: 50,
      },
    ];
    vRoute.stops.forEach((stop, idx) => {
      const ref = stop.address
        ? stop.address
        : stop.is_intra_city
          ? 'Entrega Urbana'
          : 'Polo Regional';
      paradas.push({
        ordem: idx + 2,
        cidade: stop.city,
        referencia: ref,
        pedidos: 1,
        distanciaKm: Math.round(stop.distance_from_prev_km * 10) / 10,
        x: stopsCoords[idx]?.x ?? Math.min(85, 20 + idx * 12),
        y: stopsCoords[idx]?.y ?? Math.min(80, 30 + (idx % 3) * 20),
      });
    });

    const tempoVeiculo = Math.round((vRoute.total_distance_km / 45) * 60 + vRoute.stops.length * 15);
    return {
      origem: 'CD Nobre Lar · Crateús, CE',
      distanciaTotalKm: Math.round(vRoute.total_distance_km * 10) / 10,
      tempoEstimadoMin: tempoVeiculo,
      paradas,
      nomeVeiculo: vRoute.vehicle_name,
      corVeiculo: vRoute.hex_color || '#2563EB',
    };
  };

  // 3. Resumo da Carga
  const pesoTotalKg = Math.round(summary.total_weight_kg);
  const volumeTotalM3 = Math.round(summary.total_volume_m3 * 100) / 100;

  // Capacidade combinada da frota mobilizada caso haja múltiplos veículos na rota
  const capKg =
    summary.vehicles.length > 1
      ? summary.total_fleet_capacity_kg ||
        summary.vehicles.reduce((acc, v) => acc + (v.effective_capacity_kg || 0), 0)
      : veiculoAlocado.capacidadePesoKg || 4800;

  const capM3 =
    summary.vehicles.length > 1
      ? summary.total_fleet_capacity_m3 ||
        summary.vehicles.reduce((acc, v) => acc + (v.effective_capacity_m3 || 0), 0)
      : veiculoAlocado.capacidadeVolumeM3 || 2.45;

  // Valor total real do lote (R$ 168.231,90) vs valor despachado nesta viagem
  const valorTotalLote =
    summary.total_batch_value_reais ||
    optimizeResp?.total_batch_value_reais ||
    summary.total_value_reais;

  const valorDespachado =
    summary.routed_value_reais ||
    optimizeResp?.routed_value_reais ||
    summary.all_loading_orders.reduce((acc, it) => acc + (it.value_reais || 0), 0);

  const valorPendente =
    summary.unassigned_value_reais ?? optimizeResp?.unassigned_value_reais;
  const valorBalcao =
    summary.pickup_value_reais ?? optimizeResp?.pickup_value_reais;

  const resumo = {
    valorTotal: Math.round(valorTotalLote * 100) / 100,
    pesoTotalKg,
    volumeTotalM3,
    ocupacaoPeso: capKg > 0 ? Math.round((pesoTotalKg / capKg) * 1000) / 10 : 0,
    ocupacaoVolume: capM3 > 0 ? Math.round((volumeTotalM3 / capM3) * 1000) / 10 : 0,
    totalPedidos: summary.all_loading_orders.length,
    totalItens: summary.all_loading_orders.length,
    valorDespachado: Math.round(valorDespachado * 100) / 100,
    valorPendente: valorPendente ? Math.round(valorPendente * 100) / 100 : undefined,
    valorBalcao: valorBalcao ? Math.round(valorBalcao * 100) / 100 : undefined,
    capacidadeTotalKg: capKg,
    capacidadeTotalM3: Math.round(capM3 * 100) / 100,
    pedidosPendentes: optimizeResp?.total_unassigned_orders,
    pedidosBalcao: optimizeResp?.total_pickup_orders,
    pedidosTotalLote: summary.total_batch_orders || optimizeResp?.total_orders_processed,
    pesoTotalLoteKg: summary.total_batch_weight_kg || optimizeResp?.total_batch_weight_kg,
  };

  // 4. Pedidos Alocados
  const pedidos: PedidoAlocado[] = summary.all_loading_orders.map((item) => {
    let prioridade: PrioridadePedido = 'NORMAL';
    const tipo = item.delivery_type.toUpperCase();
    if (tipo.includes('URGENTE') || tipo.includes('EXPRESS')) {
      prioridade = 'URGENTE';
    } else if (tipo.includes('RETIRADA') || tipo.includes('BALCAO')) {
      prioridade = 'RETIRADA';
    }

    return {
      pedido: item.order_id,
      cidade: item.city,
      valor: item.value_reais,
      pesoKg: item.weight_kg,
      volumeM3: item.volume_m3,
      prioridade,
      itens: 1,
    };
  });

  // 5. Recomendação de Veículo
  let recomendacao: Recomendacao | undefined;
  if (recTruck) {
    const recIdStr = String(recTruck.vehicle_id);
    const recVeiculoMatch =
      frota.find(
        (v) => v.id === recIdStr || v.nome.toLowerCase() === recTruck.vehicle_name.toLowerCase(),
      ) || veiculoAlocado;

    const avaliacoes = frota.map((v) => {
      const atendePeso = v.capacidadePesoKg >= pesoTotalKg;
      const atendeVol = v.capacidadeVolumeM3 >= volumeTotalM3;
      const atende = atendePeso && atendeVol;
      const ocupPeso = (pesoTotalKg / v.capacidadePesoKg) * 100;
      const ocupVol = (volumeTotalM3 / v.capacidadeVolumeM3) * 100;
      const maxOcup = Math.max(ocupPeso, ocupVol);

      let motivo = 'Capacidade compatível com o lote';
      if (!atende) {
        if (!atendePeso && !atendeVol) {
          motivo = 'Excede limite de peso e volume';
        } else if (!atendePeso) {
          motivo = 'Excede capacidade de peso da unidade';
        } else {
          motivo = 'Excede volume cúbico do compartimento';
        }
      }

      return {
        veiculo: v,
        atende,
        motivo,
        ocupacao: Math.round(maxOcup),
      };
    });

    recomendacao = {
      veiculo: recVeiculoMatch,
      motivo: recTruck.reason || 'Veículo com dimensionamento ideal para o lote analisado.',
      avaliacoes,
      excedeFrota: recTruck.estimated_occupancy_percent > 100,
    };
  }

  // 6. Opções de Rota (5 estratégias do backend)
  const summaries = optimizeResp?.strategies_summary || [];
  const opcoesRota: OpcaoRota[] = summaries.map((strat) => {
    const criterio = mapaBackendParaEstrategia[strat.strategy_id] || 'melhor';
    const atendeTodos = strat.stops_count >= summary.all_loading_orders.length;
    const pendentes = atendeTodos ? 0 : Math.max(0, summary.all_loading_orders.length - strat.stops_count);

    let via = 'Via mista balanceada';
    if (strat.strategy_id.includes('custo')) {
      via = 'Vias vicinais e menor custo';
    } else if (strat.strategy_id.includes('tempo')) {
      via = 'Rodovia principal e SLA prioritário';
    } else if (strat.strategy_id.includes('peso')) {
      via = 'Alívio de peso em aclives';
    } else if (strat.strategy_id.includes('volume')) {
      via = 'Compacidade de cubagem';
    }

    // Salvaguarda contra valores zerados
    const distKm = strat.total_distance_km > 0
      ? strat.total_distance_km
      : (strat.stops_count > 0 ? strat.stops_count * 1.8 + 5.0 : 10.0);
    
    const tempoMin = strat.total_time_hours > 0
      ? Math.round(strat.total_time_hours * 60)
      : Math.round((distKm / 45) * 60 + strat.stops_count * 15);

    const custo = strat.total_fuel_cost_reais > 0
      ? strat.total_fuel_cost_reais
      : Math.round((distKm / 6.0) * 6.10 * 100) / 100;

    return {
      criterio,
      rotulo: strat.strategy_name,
      descricao: strat.description,
      rota,
      metricas: {
        distanciaKm: Math.round(distKm * 10) / 10,
        tempoMin,
        custo: Math.round(custo * 100) / 100,
        pesoKg: Math.round(strat.total_weight_kg),
        volumeM3: Math.round(strat.total_volume_m3 * 100) / 100,
        pedidosAtendidos: strat.stops_count,
        pedidosPendentes: pendentes,
        via,
      },
    };
  });

  // 7. Todos os veículos mobilizados e utilizados na operação
  // Cria um mapa de vehicle_id -> VehicleRouteDTO para lookup rápido
  const rotasPorVeiculoId = new Map<number, VehicleRouteDTO>();
  (summary.routes || []).forEach((vRoute) => {
    rotasPorVeiculoId.set(vRoute.vehicle_id, vRoute);
  });

  const veiculosEmUso: VeiculoEmUso[] = (summary.vehicles || []).map((v) => {
    const vRoute = rotasPorVeiculoId.get(v.vehicle_id);
    return {
      id: v.vehicle_id,
      nome: v.vehicle_name,
      placa: v.license_plate,
      cor: v.color,
      hexColor: v.hex_color || '#2563EB',
      emoji: v.emoji || '🚚',
      pesoKg: Math.round(v.total_weight_kg * 10) / 10,
      capacidadeKg: v.effective_capacity_kg,
      volumeM3: Math.round(v.total_volume_m3 * 100) / 100,
      capacidadeM3: Math.round(v.effective_capacity_m3 * 100) / 100,
      ocupacaoPercentual: Math.round(v.occupancy_rate_percent * 10) / 10,
      distanciaKm: Math.round(v.total_distance_km * 10) / 10,
      paradasCount: v.stops_count,
      valorReais: Math.round(v.total_value_reais * 100) / 100,
      perfilSeguranca: v.safety_factor_label,
      ordemCarregamento: v.loading_order?.map((lo) => ({
        posicao: lo.loading_order_position,
        etiqueta: lo.loading_order_label,
        pedidoId: lo.order_id,
        cidade: lo.city,
        endereco: lo.address,
        pesoKg: lo.weight_kg,
        volumeM3: lo.volume_m3,
      })),
      rota: vRoute ? buildRotaVeiculo(vRoute) : undefined,
    };
  });

  return {
    id: String(summary.report_id),
    reportId: summary.report_id,
    geradoEm: new Date().toISOString(),
    veiculo: veiculoAlocado,
    rota,
    resumo,
    pedidos,
    opcoesRota: opcoesRota.length > 0 ? opcoesRota : undefined,
    retiradasDescartadas: optimizeResp?.total_pickup_orders ?? 0,
    foraDoPeriodo: optimizeResp?.date_filter_applied?.orders_filtered_out ?? 0,
    periodo: summary.date_filter_applied?.start_date && summary.date_filter_applied?.end_date
      ? {
          inicio: summary.date_filter_applied.start_date,
          fim: summary.date_filter_applied.end_date,
        }
      : undefined,
    recomendacao,
    veiculosEmUso: veiculosEmUso.length > 0 ? veiculosEmUso : undefined,
  };
};
