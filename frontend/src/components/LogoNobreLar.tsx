import React from 'react';

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

/**
 * Logo oficial do Nobre Lar.
 *
 * Os arquivos ficam em `public/` e são servidos na raiz do site:
 *   /LOGO.svg         versão original, para fundo claro
 *   /LOGO-branca.svg  mesma arte com a assinatura em branco, para fundo escuro
 *
 * Para trocar a arte, basta substituir esses dois arquivos.
 */
const ARQUIVO: Record<VarianteLogo, string> = {
  escura: '/LOGO.svg',
  clara: '/LOGO-branca.svg',
};

export const LogoNobreLar: React.FC<LogoNobreLarProps> = ({
  altura = 120,
  variante = 'escura',
}) => (
  <img
    className="logo-nobrelar"
    src={ARQUIVO[variante]}
    alt="Nobre Lar"
    style={{ height: altura }}
  />
);
