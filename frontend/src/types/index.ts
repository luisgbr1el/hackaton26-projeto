export interface HealthStatus {
  status: string;
  project: string;
  version: string;
  timestamp: string;
}

export interface Item {
  id: number;
  title: string;
  description?: string;
  created_at: string;
}

export interface ItemCreate {
  title: string;
  description?: string;
}

/* ------------------------------------------------------------------
 * Plano de Carga - Grupo Nobre Lar
 * Contrato de dados consumido pela interface. A geração destes dados
 * (otimização de rota e alocação de carga) é responsabilidade do backend.
 * ------------------------------------------------------------------ */

/** Porte do veículo na frota Nobre Lar: define a ilustração e os limites físicos. */
export type TipoVeiculo = 'grande' | 'pequeno' | 'moto';

export interface Veiculo {
  id: string;
  /** Nome da unidade na operação (ex.: "Accelo Grande 1"). */
  nome: string;
  modelo: string;
  tipo: TipoVeiculo;
  /** Classificação operacional: Pesado, Médio ou Expresso. */
  porte: string;
  /** Perfil de operação (ex.: "Rotas de Interior - Eixo Oeste/Sul"). */
  perfil: string;
  /** Cor de identificação da unidade na frota (usada como marcador visual). */
  cor: string;
  capacidadePesoKg: number;
  capacidadeVolumeM3: number;
  /** Capacidade máxima do tanque de combustível, em litros. */
  tanqueLitros: number;
  /** Consumo médio em quilômetros por litro, com o veículo carregado. */
  consumoKmPorLitro: number;
  /** Placa do veículo (simulada ou real). */
  placa?: string;
  /** Opcional: foto real do veículo. Sem ela é exibida a arte padrão. */
  fotoUrl?: string;
}

export interface ParadaRota {
  ordem: number;
  cidade: string;
  referencia?: string;
  pedidos: number;
  distanciaKm: number;
  janelaEntrega?: string;
  /** Coordenadas normalizadas (0-100) usadas pelo mapa esquemático. */
  x: number;
  y: number;
}

export interface Rota {
  origem: string;
  distanciaTotalKm: number;
  tempoEstimadoMin: number;
  paradas: ParadaRota[];
}

export interface ResumoCarga {
  valorTotal: number;
  pesoTotalKg: number;
  volumeTotalM3: number;
  /** Percentuais de 0 a 100. */
  ocupacaoPeso: number;
  ocupacaoVolume: number;
  totalPedidos: number;
  totalItens: number;
  /** Detalhamento financeiro e de lotes da operação */
  valorDespachado?: number;
  valorPendente?: number;
  valorBalcao?: number;
  capacidadeTotalKg?: number;
  capacidadeTotalM3?: number;
  pedidosPendentes?: number;
  pedidosBalcao?: number;
  pedidosTotalLote?: number;
  pesoTotalLoteKg?: number;
}

export type PrioridadePedido = 'URGENTE' | 'NORMAL' | 'RETIRADA';

export interface PedidoAlocado {
  pedido: string;
  cidade: string;
  valor: number;
  pesoKg: number;
  volumeM3: number;
  prioridade: PrioridadePedido;
  /** Data do pedido (ISO aaaa-mm-dd), usada pelo filtro de período. */
  data?: string;
  /** Quantidade de itens do pedido. */
  itens?: number;
}

/** Intervalo de datas escolhido pelo usuário (ISO aaaa-mm-dd). */
export interface Periodo {
  inicio: string;
  fim: string;
}

/** Como cada unidade da frota se comporta diante da carga analisada. */
export interface AvaliacaoVeiculo {
  veiculo: Veiculo;
  atende: boolean;
  motivo: string;
  /** Ocupação que a carga teria neste veículo (maior entre peso e volume). */
  ocupacao: number;
}

export interface Recomendacao {
  veiculo: Veiculo;
  /** Uma linha curta: perfil do eixo e distância da rota. */
  motivo: string;
  /** Todas as unidades avaliadas, na ordem em que foram consideradas. */
  avaliacoes: AvaliacaoVeiculo[];
  /** A carga não cabe em nenhuma unidade: será preciso mais de uma viagem. */
  excedeFrota: boolean;
}

/** Critério de otimização de uma alternativa de rota. */
export type CriterioRota = 'melhor' | 'custo' | 'tempo' | 'peso' | 'volume';

export interface MetricasRota {
  distanciaKm: number;
  tempoMin: number;
  /** Custo estimado de deslocamento e paradas, em reais. */
  custo: number;
  /** Peso efetivamente embarcado nesta alternativa. */
  pesoKg: number;
  /** Volume efetivamente embarcado nesta alternativa. */
  volumeM3: number;
  pedidosAtendidos: number;
  /** Pedidos que ficam para a próxima viagem nesta alternativa. */
  pedidosPendentes: number;
  /** Perfil de via considerado (ex.: "Rodovia principal"). */
  via: string;
}

export interface OpcaoRota {
  criterio: CriterioRota;
  rotulo: string;
  descricao: string;
  rota: Rota;
  metricas: MetricasRota;
}

export interface PlanoCarga {
  id: string;
  geradoEm: string;
  veiculo: Veiculo;
  rota: Rota;
  resumo: ResumoCarga;
  pedidos: PedidoAlocado[];
  /** Alternativas de rota calculadas pelo otimizador. Opcional. */
  opcoesRota?: OpcaoRota[];
  /** Quantos pedidos de retirada no balcão foram descartados do plano. */
  retiradasDescartadas?: number;
  /** Período considerado. Ausente quando o arquivo inteiro foi usado. */
  periodo?: Periodo;
  /** Quantos pedidos ficaram fora por estarem além do período escolhido. */
  foraDoPeriodo?: number;
  /** ID do relatório persistido no backend. */
  reportId?: number;
  /** Veículo recomendado pelo sistema para esta carga. */
  recomendacao?: Recomendacao;
}
