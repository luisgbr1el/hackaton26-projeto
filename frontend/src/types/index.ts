export interface HealthStatus {
  status: string;
  project: string;
  version: string;
  timestamp: string;
}

export interface Item {
  id: number;
  title: string;
  description?: string;
  created_at: string;
}

export interface ItemCreate {
  title: string;
  description?: string;
}
