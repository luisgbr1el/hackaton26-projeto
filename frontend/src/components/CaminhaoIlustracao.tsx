import React from 'react';
import type { Veiculo } from '../types';

interface CaminhaoIlustracaoProps {
  veiculo: Veiculo;
  /** Versão reduzida, para listas e miniaturas. */
  miniatura?: boolean;
}

/**
 * Arte oficial do veículo, servida de `public/veiculos/<id>.svg`.
 * Cada arquivo já vem com a cor de identificação da unidade:
 * azul (Accelo 1), vermelho (Accelo 2), verde (Kia), laranja (HR) e
 * amarelo (Moto). Para trocar a arte, substitua o arquivo correspondente.
 *
 * `fotoUrl` no cadastro da frota tem prioridade — use-o para fotos reais.
 */
export const CaminhaoIlustracao: React.FC<CaminhaoIlustracaoProps> = ({
  veiculo,
  miniatura = false,
}) => (
  <img
    className={miniatura ? 'veiculo-miniatura' : 'caminhao-svg'}
    src={veiculo.fotoUrl ?? `/veiculos/${veiculo.id.toLowerCase()}.svg`}
    alt={`${veiculo.nome} — ${veiculo.modelo}`}
    loading={miniatura ? 'lazy' : undefined}
  />
);
