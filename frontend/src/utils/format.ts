const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export const formatMoeda = (valor: number): string => moeda.format(valor);

export const formatNumero = (valor: number, casas = 0): string =>
  new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(valor);

export const formatPeso = (kg: number): string => `${formatNumero(kg)} kg`;

export const formatVolume = (m3: number): string => `${formatNumero(m3, 2)} m³`;

export const formatPercentual = (valor: number): string =>
  `${formatNumero(valor, 1)}%`;

export const formatDuracao = (minutos: number): string => {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  return resto === 0 ? `${horas}h` : `${horas}h ${resto}min`;
};

export const formatTamanhoArquivo = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${formatNumero(bytes / 1024, 1)} KB`;
  return `${formatNumero(bytes / (1024 * 1024), 1)} MB`;
};
