import React, { useEffect, useState } from 'react';
import { getHealth } from '../api/health';
import type { HealthStatus as HealthStatusType } from '../types';
import { CheckCircle2, XCircle, RefreshCw, Server } from 'lucide-react';

export const HealthStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthStatusType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao conectar com o backend';
      setError(message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="status-card">
      <div className="status-header">
        <div className="status-title-wrap">
          <Server className="icon-server" size={20} />
          <h3>Status da Conexão com a API</h3>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={checkConnection}
          disabled={loading}
          title="Verificar novamente"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {loading ? 'Checando...' : 'Testar Conexão'}
        </button>
      </div>

      <div className="status-body">
        {loading && !health && !error && (
          <div className="status-alert status-loading">
            <span className="dot dot-loading"></span>
            Testando conexão com o FastAPI backend...
          </div>
        )}

        {error && (
          <div className="status-alert status-error">
            <XCircle size={18} className="icon-error" />
            <div>
              <strong>Backend Offline ou Inacessível:</strong> {error}
              <p className="status-hint">
                Certifique-se de que o backend FastAPI está rodando em <code>http://localhost:8000</code>.
              </p>
            </div>
          </div>
        )}

        {health && (
          <div className="status-alert status-success">
            <CheckCircle2 size={18} className="icon-success" />
            <div className="status-details">
              <div>
                <strong>Backend Online:</strong> {health.project} (v{health.version})
              </div>
              <span className="timestamp">
                Última checagem: {new Date(health.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
