import type {
  CriterioRota,
  OpcaoRota,
  ParadaRota,
  PedidoAlocado,
  PlanoCarga,
  Rota,
  TipoVeiculo,
} from '../types';
import { distribuirPedidos } from '../utils/carga';

/**
 * Alternativas de rota exibidas na aba Rota do modo demonstração.
 *
 * Duas famílias de alternativa, porque são coisas diferentes na operação:
 *
 * - custo e tempo mantêm a carga completa e mudam o perfil de via
 *   (vias vicinais saem mais barato e demoram mais; rodovia é o inverso);
 * - peso e volume aliviam a carga, deixando para a próxima viagem o pedido
 *   mais pesado / mais volumoso, e a rota é recalculada sem a parada que
 *   ficou sem pedidos.
 *
 * Quando o backend passar a devolver `opcoesRota` no plano, esta simulação
 * deixa de ser usada.
 */

const CUSTO_POR_KM: Record<TipoVeiculo, number> = { grande: 3.4, pequeno: 2.1, moto: 0.95 };
const CUSTO_POR_PARADA: Record<TipoVeiculo, number> = { grande: 18, pequeno: 12, moto: 6 };
const MINUTOS_POR_PARADA: Record<TipoVeiculo, number> = { grande: 25, pequeno: 15, moto: 6 };
const VELOCIDADE_PADRAO: Record<TipoVeiculo, number> = { grande: 58, pequeno: 62, moto: 38 };

interface Perfil {
  via: string;
  fatorKm: number;
  fatorVelocidade: number;
  fatorCusto: number;
}

const PERFIS: Record<'melhor' | 'custo' | 'tempo', Perfil> = {
  melhor: { via: 'Via mista', fatorKm: 1, fatorVelocidade: 1, fatorCusto: 1 },
  custo: { via: 'Vias vicinais', fatorKm: 1.05, fatorVelocidade: 0.82, fatorCusto: 0.78 },
  tempo: { via: 'Rodovia principal', fatorKm: 1.08, fatorVelocidade: 1.25, fatorCusto: 1.14 },
};

const TEXTOS: Record<CriterioRota, { rotulo: string; descricao: string }> = {
  melhor: {
    rotulo: 'Melhor rota',
    descricao: 'Equilíbrio entre custo e tempo, levando a carga completa.',
  },
  custo: {
    rotulo: 'Menor custo',
    descricao: 'Trajeto mais barato com a carga completa, por vias vicinais.',
  },
  tempo: {
    rotulo: 'Menor tempo',
    descricao: 'Trajeto mais rápido com a carga completa, pela rodovia principal.',
  },
  peso: {
    rotulo: 'Menor peso',
    descricao: 'Sai mais leve: o pedido mais pesado fica para a próxima viagem.',
  },
  volume: {
    rotulo: 'Menor volume',
    descricao: 'Ocupa menos espaço: o pedido mais volumoso fica para a próxima viagem.',
  },
};

const distanciaCoord = (a: ParadaRota, b: ParadaRota): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const minutosParaHora = (minutos: number): string => {
  const total = Math.round(minutos) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const horaParaMinutos = (hora?: string): number => {
  const achado = hora?.match(/(\d{1,2}):(\d{2})/);
  return achado ? Number(achado[1]) * 60 + Number(achado[2]) : 7 * 60;
};

interface Contexto {
  escala: number;
  velocidade: number;
  descarga: number;
  custoKm: number;
  custoParada: number;
  partida: number;
}

/** Monta a rota e as métricas de uma sequência de paradas sob um perfil de via. */
const montar = (
  base: Rota,
  origem: ParadaRota,
  sequencia: ParadaRota[],
  ctx: Contexto,
  perfil: Perfil,
  carga: { pesoKg: number; volumeM3: number; atendidos: number; pendentes: number },
): { rota: Rota; metricas: OpcaoRota['metricas'] } => {
  const velocidade = ctx.velocidade * perfil.fatorVelocidade;
  let relogio = ctx.partida;
  let distancia = 0;

  const paradas: ParadaRota[] = [
    { ...origem, ordem: 1, distanciaKm: 0, janelaEntrega: minutosParaHora(relogio) },
  ];

  sequencia.forEach((parada, indice) => {
    const anterior = indice === 0 ? origem : sequencia[indice - 1];
    const km = distanciaCoord(anterior, parada) * ctx.escala * perfil.fatorKm;
    distancia += km;
    relogio += (km / velocidade) * 60;

    const chegada = relogio;
    if (parada.pedidos > 0) relogio += ctx.descarga;

    paradas.push({
      ...parada,
      ordem: indice + 2,
      distanciaKm: Math.round(km),
      janelaEntrega:
        parada.pedidos > 0
          ? `${minutosParaHora(chegada)} - ${minutosParaHora(relogio)}`
          : minutosParaHora(chegada),
    });
  });

  const entregas = sequencia.filter((parada) => parada.pedidos > 0).length;

  return {
    rota: {
      origem: base.origem,
      distanciaTotalKm: Math.round(distancia),
      tempoEstimadoMin: Math.round(relogio - ctx.partida),
      paradas,
    },
    metricas: {
      distanciaKm: Math.round(distancia),
      tempoMin: Math.round(relogio - ctx.partida),
      custo: distancia * ctx.custoKm * perfil.fatorCusto + entregas * ctx.custoParada,
      pesoKg: carga.pesoKg,
      volumeM3: carga.volumeM3,
      pedidosAtendidos: carga.atendidos,
      pedidosPendentes: carga.pendentes,
      via: perfil.via,
    },
  };
};

/** Alternativas de rota para o plano informado, uma por critério. */
export const gerarOpcoesRota = (plano: PlanoCarga): OpcaoRota[] => {
  const [origem, ...demais] = plano.rota.paradas;
  if (!origem || demais.length < 2) return [];

  const tipo = plano.veiculo.tipo;
  const coordBase = demais.reduce(
    (soma, parada, indice) =>
      soma + distanciaCoord(indice === 0 ? origem : demais[indice - 1], parada),
    0,
  );

  const descarga = MINUTOS_POR_PARADA[tipo];
  const entregasBase = demais.filter((parada) => parada.pedidos > 0).length;
  const tempoViagemBase = plano.rota.tempoEstimadoMin - entregasBase * descarga;

  const ctx: Contexto = {
    escala: coordBase > 0 ? plano.rota.distanciaTotalKm / coordBase : 1,
    velocidade:
      tempoViagemBase > 0
        ? plano.rota.distanciaTotalKm / (tempoViagemBase / 60)
        : VELOCIDADE_PADRAO[tipo],
    descarga,
    custoKm: CUSTO_POR_KM[tipo],
    custoParada: CUSTO_POR_PARADA[tipo],
    partida: horaParaMinutos(origem.janelaEntrega),
  };

  const cargaCheia = {
    pesoKg: plano.resumo.pesoTotalKg,
    volumeM3: plano.resumo.volumeTotalM3,
    atendidos: plano.resumo.totalPedidos,
    pendentes: 0,
  };

  const porParada = distribuirPedidos(demais, plano.pedidos);

  /** Versão aliviada: remove o pedido escolhido e as paradas que ficaram vazias. */
  const aliviar = (escolher: (pedidos: PedidoAlocado[]) => PedidoAlocado | undefined) => {
    const candidatos = demais.flatMap((parada) => porParada.get(parada.ordem) ?? []);
    const removido = escolher(candidatos);
    if (!removido) return null;

    const sequencia = demais
      .map((parada) => {
        const pedidos = porParada.get(parada.ordem) ?? [];
        const restantes = pedidos.filter((pedido) => pedido !== removido).length;
        const entregaRemovida = pedidos.includes(removido);
        return { ...parada, pedidos: entregaRemovida ? restantes : parada.pedidos };
      })
      .filter((parada) => parada.pedidos > 0);

    if (sequencia.length < 2) return null;

    return {
      sequencia,
      carga: {
        pesoKg: plano.resumo.pesoTotalKg - removido.pesoKg,
        volumeM3: Number((plano.resumo.volumeTotalM3 - removido.volumeM3).toFixed(2)),
        atendidos: plano.resumo.totalPedidos - 1,
        pendentes: 1,
      },
    };
  };

  const maisPesado = (pedidos: PedidoAlocado[]) =>
    pedidos.reduce<PedidoAlocado | undefined>(
      (maior, atual) => (!maior || atual.pesoKg > maior.pesoKg ? atual : maior),
      undefined,
    );

  const pesoAliviado = aliviar(maisPesado);

  const maisVolumoso = (pedidos: PedidoAlocado[]) =>
    pedidos.reduce<PedidoAlocado | undefined>(
      (maior, atual) => (!maior || atual.volumeM3 > maior.volumeM3 ? atual : maior),
      undefined,
    );

  const volumeAliviado = aliviar(maisVolumoso);

  const opcoes: OpcaoRota[] = [];
  const adicionar = (
    criterio: CriterioRota,
    sequencia: ParadaRota[],
    perfil: Perfil,
    carga: typeof cargaCheia,
  ) => {
    const { rota, metricas } = montar(plano.rota, origem, sequencia, ctx, perfil, carga);
    opcoes.push({ criterio, ...TEXTOS[criterio], rota, metricas });
  };

  adicionar('melhor', demais, PERFIS.melhor, cargaCheia);
  adicionar('custo', demais, PERFIS.custo, cargaCheia);
  adicionar('tempo', demais, PERFIS.tempo, cargaCheia);
  if (pesoAliviado) adicionar('peso', pesoAliviado.sequencia, PERFIS.melhor, pesoAliviado.carga);
  if (volumeAliviado) {
    adicionar('volume', volumeAliviado.sequencia, PERFIS.melhor, volumeAliviado.carga);
  }

  return opcoes;
};
