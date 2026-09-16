import type { PedidoAlocado, PlanoCarga } from '../types';
import { distribuirPedidos } from './carga';

export type Zona = 'fundo' | 'meio' | 'porta';

export interface ItemCarga {
  ordem: number;
  pedido: PedidoAlocado;
  /** Posição da entrega na rota (1 = primeira parada com pedidos). */
  entrega?: number;
  destino: string;
  zona: Zona;
  /** Acumulados depois de embarcar este item nesta viagem. */
  pesoAcumulado: number;
  volumeAcumulado: number;
  ocupacao: number;
  /** Número da viagem do veículo (1, 2, etc.) */
  viagem: number;
}

export const ZONAS: Record<Zona, string> = {
  fundo: 'Fundo',
  meio: 'Meio',
  porta: 'Porta',
};

const densidade = (pedido: PedidoAlocado): number =>
  pedido.volumeM3 > 0 ? pedido.pesoKg / pedido.volumeM3 : Number.MAX_SAFE_INTEGER;

/**
 * Ordem de carregamento pela regra do último a entrar, primeiro a sair:
 * embarca primeiro a carga da última parada (vai para o fundo) e por último a
 * da primeira entrega (fica junto à porta). Dentro de cada parada, o material
 * mais denso entra antes, para ficar embaixo da pilha.
 *
 * Se a carga total ultrapassar a capacidade segura da unidade, divide
 * automaticamente em múltiplas viagens (Viagem 1, Viagem 2...), zerando a
 * cubagem do baú para cada ciclo e garantindo ocupação máxima de 100%.
 */
export const montarOrdem = (plano: PlanoCarga): ItemCarga[] => {
  const paradasComEntrega = plano.rota.paradas.filter((parada) => parada.pedidos > 0);
  const porParada = distribuirPedidos(paradasComEntrega, plano.pedidos);
  const embarcados = new Set<PedidoAlocado>();

  const sequencia = [...paradasComEntrega].reverse().flatMap((parada, indiceReverso) => {
    const pedidos = [...(porParada.get(parada.ordem) ?? [])].sort(
      (a, b) => densidade(b) - densidade(a),
    );
    pedidos.forEach((pedido) => embarcados.add(pedido));

    const ultimaAEntregar = indiceReverso === 0;
    const primeiraAEntregar = indiceReverso === paradasComEntrega.length - 1;
    const zona: Zona = ultimaAEntregar ? 'fundo' : primeiraAEntregar ? 'porta' : 'meio';

    return pedidos.map((pedido) => ({
      pedido,
      entrega: paradasComEntrega.length - indiceReverso,
      destino: parada.referencia ?? parada.cidade,
      zona,
    }));
  });

  // Pedidos sem parada correspondente entram por último, junto à porta.
  const avulsos = plano.pedidos
    .filter((pedido) => !embarcados.has(pedido))
    .map((pedido) => ({
      pedido,
      entrega: undefined,
      destino: pedido.cidade,
      zona: 'porta' as Zona,
    }));

  const capPeso = plano.veiculo.capacidadePesoKg || 4800;
  const capVolume = plano.veiculo.capacidadeVolumeM3 || 2.45;

  let viagemAtual = 1;
  let pesoViagem = 0;
  let volumeViagem = 0;
  let ordemNaViagem = 1;

  return [...sequencia, ...avulsos].map((item) => {
    // Se adicionar este item ultrapassar a capacidade do baú na viagem atual, inicia próxima viagem
    if (
      (pesoViagem + item.pedido.pesoKg > capPeso ||
        volumeViagem + item.pedido.volumeM3 > capVolume) &&
      pesoViagem > 0
    ) {
      viagemAtual += 1;
      pesoViagem = 0;
      volumeViagem = 0;
      ordemNaViagem = 1;
    }

    pesoViagem += item.pedido.pesoKg;
    volumeViagem += item.pedido.volumeM3;

    const ocupacaoPercentual = Math.min(
      100,
      Math.round(
        Math.max((pesoViagem / capPeso) * 100, (volumeViagem / capVolume) * 100) * 10,
      ) / 10,
    );

    const resultado: ItemCarga = {
      ...item,
      ordem: ordemNaViagem,
      viagem: viagemAtual,
      pesoAcumulado: Math.round(pesoViagem * 10) / 10,
      volumeAcumulado: Math.round(volumeViagem * 100) / 100,
      ocupacao: ocupacaoPercentual,
    };

    ordemNaViagem += 1;
    return resultado;
  });
};


