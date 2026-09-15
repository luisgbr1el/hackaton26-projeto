import React, { useState, useEffect } from 'react';
import { getItems, createItem, deleteItem } from '../api/items';
import type { Item } from '../types';
import { PlusCircle, Trash2, Database, AlertCircle, Clock } from 'lucide-react';

export const ItemList: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getItems();
      setItems(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar itens';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const newItem = await createItem({ title, description });
      setItems((prev) => [...prev, newItem]);
      setTitle('');
      setDescription('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao cadastrar item';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setError(null);
      await deleteItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir item';
      setError(message);
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title-wrap">
          <Database size={20} className="icon-db" />
          <div>
            <h2 className="card-title">Módulo de Demonstração (CRUD)</h2>
            <p className="card-subtitle">Exemplo de comunicação direta entre React e endpoints REST do FastAPI</p>
          </div>
        </div>
      </div>

      <div className="card-body">
        {error && (
          <div className="status-alert status-error mb-4">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="item-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="item-title">Título / Recurso</label>
              <input
                id="item-title"
                type="text"
                placeholder="Ex: Desenvolver tela de login"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="item-desc">Descrição (opcional)</label>
              <input
                id="item-desc"
                type="text"
                placeholder="Ex: Integrar autenticação JWT"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !title.trim()}
          >
            <PlusCircle size={16} />
            {submitting ? 'Salvando...' : 'Adicionar Item'}
          </button>
        </form>

        <div className="items-section">
          <h3>Itens Cadastrados ({items.length})</h3>

          {loading ? (
            <div className="empty-state">Carregando itens...</div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              Nenhum item cadastrado ainda. Use o formulário acima para adicionar o primeiro!
            </div>
          ) : (
            <div className="items-grid">
              {items.map((item) => (
                <div key={item.id} className="item-card">
                  <div className="item-content">
                    <span className="item-badge">#{item.id}</span>
                    <h4 className="item-heading">{item.title}</h4>
                    {item.description && (
                      <p className="item-description">{item.description}</p>
                    )}
                    <div className="item-meta">
                      <Clock size={12} />
                      <span>{new Date(item.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="btn-icon-delete"
                    title="Excluir item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
