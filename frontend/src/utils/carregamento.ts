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
  /** Acumulados depois de embarcar este item. */
  pesoAcumulado: number;
  volumeAcumulado: number;
  ocupacao: number;
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

  let peso = 0;
  let volume = 0;

  return [...sequencia, ...avulsos].map((item, indice) => {
    peso += item.pedido.pesoKg;
    volume += item.pedido.volumeM3;

    return {
      ...item,
      ordem: indice + 1,
      pesoAcumulado: peso,
      volumeAcumulado: volume,
      ocupacao: Math.max(
        (peso / plano.veiculo.capacidadePesoKg) * 100,
        (volume / plano.veiculo.capacidadeVolumeM3) * 100,
      ),
    };
  });
};

