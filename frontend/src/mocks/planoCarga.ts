import type {
  ParadaRota,
  PedidoAlocado,
  Periodo,
  PlanoCarga,
  Rota,
  TipoVeiculo,
  Veiculo,
} from '../types';
import { FROTA } from './frota';
import { gerarOpcoesRota } from './opcoesRota';
import { aplicarVeiculo, filtrarPorPeriodo, removerRetiradas } from '../utils/carga';
import { recomendarVeiculo } from '../utils/recomendacao';

/**
 * Base de exemplo usada enquanto o endpoint de otimização não está disponível.
 *
 * O fluxo aqui é o mesmo que o backend deve seguir: parte-se dos pedidos,
 * aplica-se o período e a regra de retirada no balcão, monta-se a rota com as
 * cidades que sobraram e só então o veículo é recomendado para aquela carga.
 */

const ORIGEM: ParadaRota = {
  ordem: 1,
  cidade: 'Crateús',
  referencia: 'Saída do CD',
  pedidos: 0,
  distanciaKm: 0,
  janelaEntrega: '06:40',
  x: 12,
  y: 72,
};

/** Cidades do eixo, na ordem de visita. */
const EIXO: ParadaRota[] = [
  { ordem: 2, cidade: 'Novo Oriente', referencia: 'Centro', pedidos: 0, distanciaKm: 0, x: 33, y: 50 },
  { ordem: 3, cidade: 'Independência', referencia: 'Depósito parceiro', pedidos: 0, distanciaKm: 0, x: 53, y: 64 },
  { ordem: 4, cidade: 'Tamboril', referencia: 'Av. Central', pedidos: 0, distanciaKm: 0, x: 72, y: 38 },
  { ordem: 5, cidade: 'Monsenhor Tabosa', referencia: 'Obra residencial', pedidos: 0, distanciaKm: 0, x: 89, y: 22 },
];

/** Quilômetros por unidade de coordenada, calibrado para o eixo completo (268 km). */
const ESCALA = 2.428;
const VELOCIDADE: Record<TipoVeiculo, number> = { grande: 62, pequeno: 68, moto: 45 };
const DESCARGA: Record<TipoVeiculo, number> = { grande: 25, pequeno: 15, moto: 6 };

/** Pedidos da semana, como viriam do CSV (já com data e quantidade de itens). */
const PEDIDOS: PedidoAlocado[] = [
  { pedido: 'L12608281', data: '2026-08-03', cidade: 'Monsenhor Tabosa', valor: 12480.0, pesoKg: 1200, volumeM3: 0.32, itens: 80, prioridade: 'URGENTE' },
  { pedido: 'L12608294', data: '2026-08-03', cidade: 'Tamboril', valor: 9820.5, pesoKg: 380, volumeM3: 0.62, itens: 24, prioridade: 'NORMAL' },
  { pedido: 'L12608312', data: '2026-08-04', cidade: 'Novo Oriente', valor: 7640.0, pesoKg: 980, volumeM3: 0.3, itens: 60, prioridade: 'NORMAL' },
  { pedido: 'L12608327', data: '2026-08-04', cidade: 'Independência', valor: 6210.4, pesoKg: 620, volumeM3: 0.28, itens: 34, prioridade: 'URGENTE' },
  { pedido: 'L12608340', data: '2026-08-05', cidade: 'Novo Oriente', valor: 4180.0, pesoKg: 760, volumeM3: 0.36, itens: 28, prioridade: 'RETIRADA' },
  { pedido: 'L12608358', data: '2026-08-05', cidade: 'Tamboril', valor: 4969.1, pesoKg: 380, volumeM3: 0.32, itens: 20, prioridade: 'NORMAL' },
  { pedido: 'L12608372', data: '2026-08-06', cidade: 'Independência', valor: 2310.0, pesoKg: 240, volumeM3: 0.14, itens: 12, prioridade: 'NORMAL' },
  { pedido: 'L12608386', data: '2026-08-06', cidade: 'Monsenhor Tabosa', valor: 1480.0, pesoKg: 180, volumeM3: 0.1, itens: 8, prioridade: 'NORMAL' },
  { pedido: 'L12608394', data: '2026-08-07', cidade: 'Novo Oriente', valor: 1240.0, pesoKg: 90, volumeM3: 0.05, itens: 5, prioridade: 'NORMAL' },
  { pedido: 'L12608402', data: '2026-08-07', cidade: 'Tamboril', valor: 980.0, pesoKg: 120, volumeM3: 0.06, itens: 6, prioridade: 'RETIRADA' },
  { pedido: 'L12608415', data: '2026-08-07', cidade: 'Independência', valor: 1120.0, pesoKg: 80, volumeM3: 0.04, itens: 4, prioridade: 'URGENTE' },
  { pedido: 'L12608423', data: '2026-08-07', cidade: 'Monsenhor Tabosa', valor: 860.0, pesoKg: 70, volumeM3: 0.04, itens: 3, prioridade: 'NORMAL' },
];

/** Intervalo coberto pela base de exemplo, para o seletor de período. */
export const PERIODO_DEMO: Periodo = { inicio: '2026-08-03', fim: '2026-08-07' };

const distanciaEntre = (a: ParadaRota, b: ParadaRota): number =>
  Math.hypot(a.x - b.x, a.y - b.y) * ESCALA;

const hora = (minutos: number): string =>
  `${String(Math.floor(minutos / 60) % 24).padStart(2, '0')}:${String(
    Math.round(minutos) % 60,
  ).padStart(2, '0')}`;

/** Monta a rota com as cidades que têm pedidos, na ordem do eixo. */
const montarRota = (pedidos: PedidoAlocado[], tipo: TipoVeiculo): Rota => {
  const paradas = EIXO.map((parada) => ({
    ...parada,
    pedidos: pedidos.filter((pedido) => pedido.cidade === parada.cidade).length,
  })).filter((parada) => parada.pedidos > 0);

  const velocidade = VELOCIDADE[tipo];
  const descarga = DESCARGA[tipo];
  const partida = 6 * 60 + 40;
  let relogio = partida;
  let total = 0;

  const sequencia: ParadaRota[] = [{ ...ORIGEM, ordem: 1 }];

  paradas.forEach((parada, indice) => {
    const km = distanciaEntre(indice === 0 ? ORIGEM : paradas[indice - 1], parada);
    total += km;
    relogio += (km / velocidade) * 60;
    const chegada = relogio;
    relogio += descarga;

    sequencia.push({
      ...parada,
      ordem: indice + 2,
      distanciaKm: Math.round(km),
      janelaEntrega: `${hora(chegada)} - ${hora(relogio)}`,
    });
  });

  return {
    origem: 'CD Crateús · Eixo Oeste/Sul',
    distanciaTotalKm: Math.round(total),
    tempoEstimadoMin: Math.round(relogio - partida),
    paradas: sequencia,
  };
};

const resumoDe = (pedidos: PedidoAlocado[]) => ({
  valorTotal: Number(pedidos.reduce((total, pedido) => total + pedido.valor, 0).toFixed(2)),
  pesoTotalKg: pedidos.reduce((total, pedido) => total + pedido.pesoKg, 0),
  volumeTotalM3: Number(
    pedidos.reduce((total, pedido) => total + pedido.volumeM3, 0).toFixed(2),
  ),
  ocupacaoPeso: 0,
  ocupacaoVolume: 0,
  totalPedidos: pedidos.length,
  totalItens: pedidos.reduce((total, pedido) => total + (pedido.itens ?? 0), 0),
});

/**
 * Plano de exemplo para o período escolhido (ou para a base inteira).
 * O veículo sai da recomendação; `veiculoManual` força uma unidade específica.
 */
export const planoDemo = (periodo?: Periodo, veiculoManual?: Veiculo): PlanoCarga => {
  const bruto: PlanoCarga = {
    id: 'PC-2026-0841',
    geradoEm: new Date().toISOString(),
    veiculo: FROTA[0],
    rota: montarRota(PEDIDOS, 'grande'),
    resumo: resumoDe(PEDIDOS),
    pedidos: PEDIDOS,
  };

  // 1. período e retirada no balcão saem antes de qualquer cálculo
  const filtrado = removerRetiradas(filtrarPorPeriodo(bruto, periodo));

  // 2. a rota é remontada com as cidades que sobraram; como o porte muda a
  //    velocidade e o tempo de descarga, a escolha vem antes do tempo final
  const preliminar = recomendarVeiculo(
    {
      ...filtrado,
      rota: montarRota(filtrado.pedidos, 'grande'),
      resumo: resumoDe(filtrado.pedidos),
    },
    FROTA,
  );
  const porte = (veiculoManual ?? preliminar.veiculo).tipo;
  const rota = montarRota(filtrado.pedidos, porte);

  // 3. com a rota fechada, a recomendação é confirmada e o plano montado
  const comRota: PlanoCarga = { ...filtrado, rota, resumo: resumoDe(filtrado.pedidos) };
  const recomendacao = recomendarVeiculo(comRota, FROTA);
  const escolhido = veiculoManual ?? recomendacao.veiculo;

  const plano = aplicarVeiculo({ ...comRota, recomendacao }, escolhido);
  const opcoesRota = gerarOpcoesRota(plano);
  const melhor = opcoesRota.find((opcao) => opcao.criterio === 'melhor');

  return { ...plano, opcoesRota, rota: melhor?.rota ?? plano.rota };
};

/** Mesma base, forçando uma unidade escolhida à mão na lista da frota. */
export const planoDemoPara = (veiculo: Veiculo, periodo?: Periodo): PlanoCarga =>
  planoDemo(periodo, veiculo);

export const planoCargaDemo = planoDemo();
