import React from 'react';
import logoPadrao from '../assets/logonova.svg';

export type VarianteLogo = 'escura' | 'clara';

interface LogoNobreLarProps {
  /** Altura do lockup em pixels. */
  altura?: number;
  /**
   * `escura` (padrão) para fundos claros — assinatura em preto.
   * `clara` para fundos escuros — assinatura em branco. O "L" segue amarelo.
   */
  variante?: VarianteLogo;
}

const ARQUIVO: Record<VarianteLogo, string> = {
  escura: logoPadrao,
  clara: '/LOGO-branca.svg',
};

export const LogoNobreLar: React.FC<LogoNobreLarProps> = ({
  altura = 120,
  variante = 'escura',
}) => (
  <img
    className="logo-nobrelar"
    src={ARQUIVO[variante] || logoPadrao}
    alt="Nobre Lar"
    style={{ height: altura }}
    onError={(e) => {
      const target = e.currentTarget;
      if (target.src !== logoPadrao) {
        target.src = logoPadrao;
      }
    }}
  />
);

