import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ModalErroProps {
  aberto: boolean;
  titulo?: string;
  mensagem: string | null;
  onFechar: () => void;
}

export const ModalErro: React.FC<ModalErroProps> = ({
  aberto,
  titulo = 'Atenção na Operação',
  mensagem,
  onFechar,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && aberto) {
        onFechar();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [aberto, onFechar]);

  if (!aberto || !mensagem) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onFechar}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-erro-titulo"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
    >
      <div
        className="modal-conteudo"
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}
      >
        {/* Top Header com gradiente sutil de alerta */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #F3F4F6',
            backgroundColor: '#FEF2F2',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <h3
              id="modal-erro-titulo"
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                color: '#991B1B',
                margin: 0,
              }}
            >
              {titulo}
            </h3>
          </div>
          <button
            type="button"
            onClick={onFechar}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#9CA3AF',
              display: 'flex',
              padding: '4px',
              borderRadius: '6px',
            }}
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo com a mensagem clara de erro */}
        <div style={{ padding: '1.5rem', color: '#374151', fontSize: '0.95rem', lineHeight: '1.6' }}>
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{mensagem}</p>
        </div>

        {/* Rodapé com botão de ação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '1rem 1.5rem',
            backgroundColor: '#F9FAFB',
            borderTop: '1px solid #F3F4F6',
          }}
        >
          <button
            type="button"
            className="btn btn-primary"
            onClick={onFechar}
            style={{
              minWidth: '110px',
              fontWeight: 600,
            }}
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
