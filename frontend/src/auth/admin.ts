import api from '../api/client';

/**
 * Acesso administrativo padrão do sistema Nobre Lar.
 */
export const ADMIN_PADRAO = {
  usuario: 'admin',
  senha: 'admin',
} as const;

const CHAVE_SESSAO = 'nobrelar:admin';
const CHAVE_TOKEN = 'nobrelar:token';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  username: string;
}

export interface UserResponse {
  username: string;
  role: string;
}

/**
 * Autentica o usuário com o endpoint real do backend (POST /api/v1/auth/login).
 * Guarda o token JWT e o nome de usuário na sessão.
 */
export const loginApi = async (usuario: string, senha: string): Promise<TokenResponse> => {
  const response = await api.post<TokenResponse>('/auth/login', {
    username: usuario.trim(),
    password: senha,
  });

  const dados = response.data;
  salvarSessao(dados.username, dados.access_token);
  return dados;
};

/**
 * Valida o token JWT atual contra o backend (GET /api/v1/auth/me).
 */
export const validarSessaoApi = async (): Promise<UserResponse | null> => {
  const token = obterToken();
  if (!token) return null;

  try {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  } catch {
    encerrarSessao();
    return null;
  }
};

export const obterToken = (): string | null => {
  try {
    return sessionStorage.getItem(CHAVE_TOKEN);
  } catch {
    return null;
  }
};

export const credenciaisValidas = (usuario: string, senha: string): boolean =>
  usuario.trim().toLowerCase() === ADMIN_PADRAO.usuario && senha === ADMIN_PADRAO.senha;

export const lerSessao = (): string | null => {
  try {
    return sessionStorage.getItem(CHAVE_SESSAO);
  } catch {
    return null;
  }
};

export const salvarSessao = (usuario: string, token?: string): void => {
  try {
    sessionStorage.setItem(CHAVE_SESSAO, usuario);
    if (token) {
      sessionStorage.setItem(CHAVE_TOKEN, token);
    }
  } catch {
    /* navegador sem acesso ao sessionStorage: a sessao vive apenas em memoria */
  }
};

export const encerrarSessao = (): void => {
  try {
    sessionStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_TOKEN);
  } catch {
    /* nada a limpar */
  }
};

