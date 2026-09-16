/**
 * Acesso administrativo padrao do prototipo.
 *
 * ATENCAO: validacao apenas de interface, executada no navegador. Nao ha
 * autenticacao real - quando o backend expuser /auth, troque
 * `credenciaisValidas` por uma chamada a API e guarde o token retornado.
 */
export const ADMIN_PADRAO = {
  usuario: 'admin',
  senha: 'nobrelar2026',
} as const;

const CHAVE_SESSAO = 'nobrelar:admin';

export const credenciaisValidas = (usuario: string, senha: string): boolean =>
  usuario.trim().toLowerCase() === ADMIN_PADRAO.usuario && senha === ADMIN_PADRAO.senha;

export const lerSessao = (): string | null => {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
};

export const salvarSessao = (usuario: string): void => {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, usuario);
  } catch {
    /* navegador sem acesso ao sessionStorage: a sessao vive apenas em memoria */
  }
};

export const encerrarSessao = (): void => {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
  } catch {
    /* nada a limpar */
  }
};
