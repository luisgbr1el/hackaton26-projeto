import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120s para otimização OR-Tools
});

// Anexa o token Bearer JWT caso o usuário esteja autenticado
api.interceptors.request.use(
  (config) => {
    try {
      const token = sessionStorage.getItem('nobrelar:token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch {
      /* Caso sessionStorage não esteja disponível no ambiente */
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Trata respostas da API e expiração de sessão
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isLoginUrl = error.config?.url?.includes('/auth/login');
      if (!isLoginUrl) {
        try {
          sessionStorage.removeItem('nobrelar:token');
          sessionStorage.removeItem('nobrelar:admin');
        } catch {
          /* nada a limpar */
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
