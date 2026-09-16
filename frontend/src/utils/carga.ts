import type { ParadaRota, PedidoAlocado, Periodo, PlanoCarga, Veiculo } from '../types';

const percentual = (usado: number, capacidade: number): number =>
  capacidade > 0 ? (usado / capacidade) * 100 : 0;

/**
 * Recalcula os percentuais de ocupação do plano para o veículo informado.
 * Útil ao simular a mesma carga em outra unidade da frota.
 */
export const aplicarVeiculo = (plano: PlanoCarga, veiculo: Veiculo): PlanoCarga => ({
  ...plano,
  veiculo,
  resumo: {
    ...plano.resumo,
    ocupacaoPeso: percentual(plano.resumo.pesoTotalKg, veiculo.capacidadePesoKg),
    ocupacaoVolume: percentual(plano.resumo.volumeTotalM3, veiculo.capacidadeVolumeM3),
  },
});

/** Maior entre as duas ocupações: é ela que limita o carregamento. */
export const ocupacaoGeral = (plano: PlanoCarga): number =>
  Math.max(plano.resumo.ocupacaoPeso, plano.resumo.ocupacaoVolume);

export const excedeCapacidade = (plano: PlanoCarga): boolean => ocupacaoGeral(plano) > 100;

/**
 * Associa cada pedido a uma parada da rota: pela cidade quando a rota passa por
 * municípios diferentes e, em rotas dentro da mesma cidade, na ordem de visita.
 * Pedidos que sobrarem ficam fora do mapa e devem ser tratados pelo chamador.
 */
export const distribuirPedidos = (
  paradas: ParadaRota[],
  pedidos: PedidoAlocado[],
): Map<number, PedidoAlocado[]> => {
  const porParada = new Map<number, PedidoAlocado[]>();
  const disponiveis = [...pedidos];

  paradas.forEach((parada) => {
    const alocados: PedidoAlocado[] = [];
    for (let i = 0; i < parada.pedidos && disponiveis.length > 0; i += 1) {
      const indiceCidade = disponiveis.findIndex(
        (pedido) =>
          pedido.cidade.toLowerCase() === parada.cidade.toLowerCase() ||
          pedido.cidade.toLowerCase().includes(parada.cidade.toLowerCase()) ||
          parada.cidade.toLowerCase().includes(pedido.cidade.toLowerCase()),
      );
      alocados.push(disponiveis.splice(indiceCidade >= 0 ? indiceCidade : 0, 1)[0]);
    }
    porParada.set(parada.ordem, alocados);
  });

  return porParada;
};

/**
 * Refaz o plano mantendo apenas os pedidos aprovados pelo filtro: recalcula os
 * totais, a contagem de pedidos por parada, as paradas que ficaram vazias e a
 * ocupação do veículo. É a base das duas regras de filtragem abaixo.
 */
export const filtrarPedidos = (
  plano: PlanoCarga,
  manter: (pedido: PedidoAlocado) => boolean,
): { plano: PlanoCarga; removidos: number } => {
  const mantidos = plano.pedidos.filter(manter);
  const removidos = plano.pedidos.length - mantidos.length;
  if (removidos === 0) return { plano, removidos: 0 };

  const comEntrega = plano.rota.paradas.filter((parada) => parada.pedidos > 0);
  const porParada = distribuirPedidos(comEntrega, plano.pedidos);

  const paradas = plano.rota.paradas
    .map((parada) => {
      const atribuidos = porParada.get(parada.ordem);
      if (!atribuidos) return parada;
      return { ...parada, pedidos: atribuidos.filter(manter).length };
    })
    // a origem (sem pedidos) sempre fica; paradas que ficaram vazias saem da rota
    .filter((parada, indice) => indice === 0 || parada.pedidos > 0)
    .map((parada, indice) => ({ ...parada, ordem: indice + 1 }));

  const somar = (extrair: (pedido: PedidoAlocado) => number) =>
    mantidos.reduce((total, pedido) => total + extrair(pedido), 0);

  const itensInformados = mantidos.every((pedido) => typeof pedido.itens === 'number');

  const filtrado: PlanoCarga = {
    ...plano,
    pedidos: mantidos,
    rota: { ...plano.rota, paradas },
    resumo: {
      ...plano.resumo,
      valorTotal: Number(somar((pedido) => pedido.valor).toFixed(2)),
      pesoTotalKg: somar((pedido) => pedido.pesoKg),
      volumeTotalM3: Number(somar((pedido) => pedido.volumeM3).toFixed(2)),
      totalPedidos: mantidos.length,
      totalItens: itensInformados
        ? somar((pedido) => pedido.itens ?? 0)
        : // sem a quantidade por pedido, o total cai na mesma proporção
          Math.round((plano.resumo.totalItens * mantidos.length) / (plano.pedidos.length || 1)),
    },
  };

  return { plano: aplicarVeiculo(filtrado, plano.veiculo), removidos };
};

/**
 * Regra de negócio: pedidos de retirada no balcão não entram no plano de carga
 * — o cliente busca na loja.
 */
export const removerRetiradas = (plano: PlanoCarga): PlanoCarga => {
  const { plano: filtrado, removidos } = filtrarPedidos(
    plano,
    (pedido) => pedido.prioridade !== 'RETIRADA',
  );
  if (removidos === 0) return plano;
  return { ...filtrado, retiradasDescartadas: (plano.retiradasDescartadas ?? 0) + removidos };
};

/**
 * Mantém apenas os pedidos dentro do intervalo escolhido. Pedidos sem data
 * informada permanecem no plano.
 */
export const filtrarPorPeriodo = (plano: PlanoCarga, periodo?: Periodo): PlanoCarga => {
  if (!periodo) return plano;

  const { plano: filtrado, removidos } = filtrarPedidos(
    plano,
    (pedido) => !pedido.data || (pedido.data >= periodo.inicio && pedido.data <= periodo.fim),
  );

  return { ...filtrado, periodo, foraDoPeriodo: removidos };
};

export interface Combustivel {
  tanqueLitros: number;
  /** Litros estimados para percorrer a rota inteira. */
  consumoRotaLitros: number;
  /** Quilometragem que o veículo faz com o tanque cheio. */
  autonomiaKm: number;
  /** Quanto do tanque a rota consome, em porcentagem. */
  percentualDoTanque: number;
  /** Consumo maior que o tanque: será preciso abastecer no percurso. */
  precisaAbastecer: boolean;
}

/** Estimativa de combustível do veículo para a rota informada. */
export const combustivelDaRota = (veiculo: Veiculo, distanciaKm: number): Combustivel => {
  const consumoRotaLitros = distanciaKm / veiculo.consumoKmPorLitro;
  return {
    tanqueLitros: veiculo.tanqueLitros,
    consumoRotaLitros,
    autonomiaKm: veiculo.tanqueLitros * veiculo.consumoKmPorLitro,
    percentualDoTanque: (consumoRotaLitros / veiculo.tanqueLitros) * 100,
    precisaAbastecer: consumoRotaLitros > veiculo.tanqueLitros,
  };
};
