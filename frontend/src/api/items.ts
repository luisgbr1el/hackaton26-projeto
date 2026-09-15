import api from './client';
import type { Item, ItemCreate } from '../types';

export const getItems = async (): Promise<Item[]> => {
  const response = await api.get<Item[]>('/items');
  return response.data;
};

export const getItemById = async (id: number): Promise<Item> => {
  const response = await api.get<Item>(`/items/${id}`);
  return response.data;
};

export const createItem = async (item: ItemCreate): Promise<Item> => {
  const response = await api.post<Item>('/items', item);
  return response.data;
};

export const deleteItem = async (id: number): Promise<void> => {
  await api.delete(`/items/${id}`);
};
