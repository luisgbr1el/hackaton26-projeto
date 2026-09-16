import React from 'react';
import type { Veiculo } from '../types';

import carro01 from '../assets/CARRO01.svg';
import carro02 from '../assets/CARRO02.svg';
import carro03 from '../assets/CARRO03.svg';
import carro04 from '../assets/CARRO04.svg';
import motoImg from '../assets/MOTO.svg';

interface CaminhaoIlustracaoProps {
  veiculo: Veiculo;
  /** Versão reduzida, para listas e miniaturas. */
  miniatura?: boolean;
}

export const obterImagemVeiculo = (veiculo: Veiculo): string => {
  if (veiculo.fotoUrl) return veiculo.fotoUrl;

  const id = String(veiculo.id || '').toLowerCase().trim();
  const nome = (veiculo.nome || '').toLowerCase();
  const modelo = (veiculo.modelo || '').toLowerCase();

  // 1. Mapeamento por ID
  if (id === '0' || id === 'acc-01' || id === 'carro01') return carro01;
  if (id === '1' || id === 'acc-02' || id === 'carro02') return carro02;
  if (id === '2' || id === 'kia-01' || id === 'carro03') return carro03;
  if (id === '3' || id === 'hr-01' || id === 'carro04') return carro04;
  if (id === '4' || id === 'moto-01' || id === 'moto') return motoImg;

  // 2. Mapeamento por Nome ou Modelo
  if (nome.includes('grande 1') || nome.includes('accelo 1')) return carro01;
  if (nome.includes('grande 2') || nome.includes('accelo 2')) return carro02;
  if (nome.includes('kia') || modelo.includes('kia') || modelo.includes('bongo')) return carro03;
  if (nome.includes('hr') || modelo.includes('hr') || modelo.includes('hyundai')) return carro04;
  if (nome.includes('moto') || modelo.includes('moto') || modelo.includes('titan') || veiculo.tipo === 'moto') return motoImg;
  if (modelo.includes('accelo')) return carro01;

  // 3. Fallback
  return `/veiculos/${id}.svg`;
};

export const CaminhaoIlustracao: React.FC<CaminhaoIlustracaoProps> = ({
  veiculo,
  miniatura = false,
}) => {
  const imgSrc = obterImagemVeiculo(veiculo);

  return (
    <img
      className={miniatura ? 'veiculo-miniatura' : 'caminhao-svg'}
      src={imgSrc}
      alt={`${veiculo.nome} — ${veiculo.modelo}`}
      loading={miniatura ? 'lazy' : undefined}
      onError={(e) => {
        const target = e.currentTarget;
        if (target.src !== carro01) {
          target.src = carro01;
        }
      }}
    />
  );
};

