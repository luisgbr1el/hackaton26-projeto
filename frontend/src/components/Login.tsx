import React, { useState } from 'react';
import { Lock, LogIn, User, AlertCircle } from 'lucide-react';
import { LogoNobreLar } from './LogoNobreLar';
import { ADMIN_PADRAO, loginApi } from '../auth/admin';
import { Rodape } from './Rodape';

interface LoginProps {
  onEntrar: (usuario: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onEntrar }) => {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const submeter = async (evento: React.FormEvent) => {
    evento.preventDefault();
    setCarregando(true);
    setErro(null);

    try {
      const resposta = await loginApi(usuario, senha);
      onEntrar(resposta.username);
    } catch (err: any) {
      const detalhe =
        err?.response?.data?.detail ||
        (err?.message ? `Erro de conexão: ${err.message}` : 'Usuário ou senha inválidos.');
      setErro(detalhe);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="login-layout">
      <main className="login-main">
        <section className="login-card">
          <div className="login-logo">
            <LogoNobreLar altura={130} variante="escura" />
          </div>

          <div className="login-intro">
            <h1 className="login-titulo">Acesso administrativo</h1>
            <p className="login-subtitulo">
              Entre para gerar e acompanhar os planos de carga da frota.
            </p>
          </div>

          <form className="login-form" onSubmit={submeter}>
            <div className="form-group">
              <label htmlFor="login-usuario">Usuário</label>
              <div className="campo">
                <User size={16} />
                <input
                  id="login-usuario"
                  type="text"
                  autoComplete="username"
                  placeholder="admin"
                  value={usuario}
                  onChange={(evento) => setUsuario(evento.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-senha">Senha</label>
              <div className="campo">
                <Lock size={16} />
                <input
                  id="login-senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                  required
                />
              </div>
            </div>

            {erro && (
              <div className="alert alert-error">
                <AlertCircle size={16} />
                <span>{erro}</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-bloco" disabled={carregando}>
              <LogIn size={16} />
              {carregando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="login-dica">
            Acesso padrão pré-cadastrado: <strong>{ADMIN_PADRAO.usuario}</strong> ·{' '}
            <strong>{ADMIN_PADRAO.senha}</strong>
          </p>
        </section>
      </main>

      <Rodape />
    </div>
  );
};
