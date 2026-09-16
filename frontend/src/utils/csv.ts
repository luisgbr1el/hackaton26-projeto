/**
 * Leitura mínima do arquivo de pedidos, feita no navegador apenas para
 * descobrir o intervalo de datas disponível e oferecer o filtro de período.
 * O processamento de verdade continua no backend.
 */

export interface ResumoArquivo {
  registros: number;
  /** Menor e maior data encontradas, em ISO (aaaa-mm-dd). */
  inicio: string;
  fim: string;
  /** Nome da coluna de data usada. */
  coluna: string;
}

const SEPARADORES = [';', ',', '\t'];

const separadorProvavel = (cabecalho: string): string =>
  SEPARADORES.reduce((melhor, atual) =>
    cabecalho.split(atual).length > cabecalho.split(melhor).length ? atual : melhor,
  );

const semAcento = (texto: string): string =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

/** Aceita dd/mm/aaaa, dd-mm-aaaa, dd/mm/aa e aaaa-mm-dd. */
const paraISO = (valor: string): string | null => {
  const texto = valor.trim().replace(/"/g, '');

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (!br) return null;

  const dia = br[1].padStart(2, '0');
  const mes = br[2].padStart(2, '0');
  const ano = br[3].length === 2 ? `20${br[3]}` : br[3];
  if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > 31) return null;

  return `${ano}-${mes}-${dia}`;
};

export const lerPeriodoDoArquivo = async (arquivo: File): Promise<ResumoArquivo | null> => {
  if (!arquivo.name.toLowerCase().endsWith('.csv')) return null;

  let texto: string;
  try {
    texto = await arquivo.text();
  } catch {
    return null;
  }

  const linhas = texto.replace(/^\uFEFF/, '').split(/\r?\n/).filter((linha) => linha.trim());
  if (linhas.length < 2) return null;

  const separador = separadorProvavel(linhas[0]);
  const colunas = linhas[0].split(separador);
  const indice = colunas.findIndex((coluna) => semAcento(coluna).startsWith('data'));
  if (indice < 0) return null;

  const datas: string[] = [];
  linhas.slice(1).forEach((linha) => {
    const celula = linha.split(separador)[indice];
    const data = celula ? paraISO(celula) : null;
    if (data) datas.push(data);
  });

  if (datas.length === 0) return null;

  datas.sort();
  return {
    registros: datas.length,
    inicio: datas[0],
    fim: datas[datas.length - 1],
    coluna: colunas[indice].replace(/"/g, '').trim(),
  };
};

/** Converte ISO (aaaa-mm-dd) para o formato brasileiro. */
export const formatDataBR = (iso: string): string => {
  const partes = iso.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : iso;
};
