import type { AvaliacaoVeiculo, PlanoCarga, Recomendacao, Rota, Veiculo } from '../types';
import { formatNumero } from './format';

/**
 * Escolha oficial do veículo para a carga.
 *
 * A decisão olha três coisas, nesta ordem:
 *   1. capacidade — peso e volume da carga precisam caber na unidade;
 *   2. perfil da rota — a moto só atende rota urbana curta e os médios têm
 *      limite de jornada diária;
 *   3. aproveitamento — entre as unidades que atendem, vence a de menor
 *      capacidade, para não mandar caminhão grande com pouca carga.
 */

/** Distância máxima que a moto assume, em quilômetros. */
const LIMITE_KM_MOTO = 45;
/** Jornada máxima que os utilitários médios assumem em um dia, em quilômetros. */
const LIMITE_KM_MEDIO = 360;

const EIXOS: Record<string, string> = {
  'novo oriente': 'Oeste/Sul',
  independencia: 'Oeste/Sul',
  tamboril: 'Oeste/Sul',
  'monsenhor tabosa': 'Oeste/Sul',
  ipueiras: 'Leste/Serra',
  'nova russas': 'Leste/Serra',
  ipu: 'Leste/Serra',
  'guaraciaba do norte': 'Leste/Serra',
  ararenda: 'Interior Próximo',
  poranga: 'Interior Próximo',
  ipaporanga: 'Interior Próximo',
};

const semAcento = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** Eixo predominante entre as cidades atendidas pela rota. */
export const eixoDaRota = (rota: Rota): string => {
  const cidades = rota.paradas.filter((parada) => parada.pedidos > 0).map((parada) => parada.cidade);
  if (cidades.length === 0) return 'Urbano';

  const contagem = new Map<string, number>();
  cidades.forEach((cidade) => {
    const eixo = EIXOS[semAcento(cidade)] ?? 'Urbano';
    contagem.set(eixo, (contagem.get(eixo) ?? 0) + 1);
  });

  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
};

const ocupacaoEm = (plano: PlanoCarga, veiculo: Veiculo): number =>
  Math.max(
    (plano.resumo.pesoTotalKg / veiculo.capacidadePesoKg) * 100,
    (plano.resumo.volumeTotalM3 / veiculo.capacidadeVolumeM3) * 100,
  );

const capacidade = (veiculo: Veiculo): number =>
  veiculo.capacidadePesoKg * veiculo.capacidadeVolumeM3;

export const recomendarVeiculo = (plano: PlanoCarga, frota: Veiculo[]): Recomendacao => {
  const { pesoTotalKg, volumeTotalM3 } = plano.resumo;
  const distancia = plano.rota.distanciaTotalKm;
  const eixo = eixoDaRota(plano.rota);
  const urbana = eixo === 'Urbano';

  const avaliacoes: AvaliacaoVeiculo[] = frota.map((veiculo) => {
    const ocupacao = ocupacaoEm(plano, veiculo);
    const cabePeso = pesoTotalKg <= veiculo.capacidadePesoKg;
    const cabeVolume = volumeTotalM3 <= veiculo.capacidadeVolumeM3;

    if (!cabePeso || !cabeVolume) {
      const excedido = !cabePeso
        ? `${formatNumero(pesoTotalKg)} kg para um limite de ${formatNumero(veiculo.capacidadePesoKg)} kg`
        : `${formatNumero(volumeTotalM3, 2)} m³ para um limite de ${formatNumero(veiculo.capacidadeVolumeM3, 2)} m³`;
      return { veiculo, atende: false, motivo: `Não comporta a carga: ${excedido}.`, ocupacao };
    }

    if (veiculo.tipo === 'moto' && (!urbana || distancia > LIMITE_KM_MOTO)) {
      return {
        veiculo,
        atende: false,
        motivo: `Rota de ${formatNumero(distancia)} km fora do perfil urbano da moto.`,
        ocupacao,
      };
    }

    if (veiculo.tipo === 'pequeno' && distancia > LIMITE_KM_MEDIO) {
      return {
        veiculo,
        atende: false,
        motivo: `Eixo de ${formatNumero(distancia)} km excede a jornada de um utilitário médio.`,
        ocupacao,
      };
    }

    return {
      veiculo,
      atende: true,
      motivo: `Comporta a carga com ${formatNumero(ocupacao, 1)}% de ocupação.`,
      ocupacao,
    };
  });

  const elegiveis = avaliacoes.filter((avaliacao) => avaliacao.atende);

  /** Desempate entre unidades de mesma capacidade, pelo perfil de operação. */
  const preferencia = (veiculo: Veiculo): number => {
    if (veiculo.tipo === 'grande') return eixo === 'Leste/Serra' ? (veiculo.id === 'ACC-02' ? 0 : 1) : veiculo.id === 'ACC-01' ? 0 : 1;
    if (veiculo.tipo === 'pequeno') return eixo === 'Urbano' ? (veiculo.id === 'HR-01' ? 0 : 1) : veiculo.id === 'KIA-01' ? 0 : 1;
    return 0;
  };

  if (elegiveis.length === 0) {
    const maior = [...frota].sort((a, b) => capacidade(b) - capacidade(a))[0];
    return {
      veiculo: maior,
      excedeFrota: true,
      avaliacoes,
      motivo: 'Carga acima da capacidade da frota · divida em mais de uma viagem',
    };
  }

  const escolhido = [...elegiveis].sort(
    (a, b) =>
      capacidade(a.veiculo) - capacidade(b.veiculo) ||
      preferencia(a.veiculo) - preferencia(b.veiculo),
  )[0];

  const { veiculo } = escolhido;

  return {
    veiculo,
    excedeFrota: false,
    avaliacoes,
    motivo: urbana
      ? `Rota urbana · Distância ${formatNumero(distancia)} km`
      : `Eixo de Interior ${eixo} · Distância ${formatNumero(distancia)} km`,
  };
};
