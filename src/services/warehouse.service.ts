import { request } from '@/lib/api';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface MaterialDTO {
  id:             number;
  supplier:       number | null;
  name:           string;
  unit:           string;
  stock_quantity: string;
  min_stock:      string;
  cost_per_unit:  string;
  is_low_stock:   boolean;
  created_at:     string;
}

export interface MovementDTO {
  id:            number;
  material:      number;
  material_name: string;
  direction:     'in' | 'out';
  quantity:      string;
  note:          string;
  created_by:    number;
  created_at:    string;
}

export interface CreateMaterialRequest {
  name:            string;
  unit:            string;
  supplier?:       number | null;
  stock_quantity?: string;
  min_stock?:      string;
  cost_per_unit?:  string;
}

export interface CreateMovementRequest {
  material:  number;
  direction: 'in' | 'out';
  quantity:  string;
  note?:     string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const warehouseService = {
  // Materials
  async getMaterials(): Promise<MaterialDTO[]> {
    const res = await request<MaterialDTO[] | { results: MaterialDTO[] }>('/warehouse/materials/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  async getLowStock(): Promise<MaterialDTO[]> {
    const res = await request<MaterialDTO[] | { results: MaterialDTO[] }>('/warehouse/materials/low_stock/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  createMaterial(data: CreateMaterialRequest): Promise<MaterialDTO> {
    return request<MaterialDTO>('/warehouse/materials/', { method: 'POST', body: data });
  },
  updateMaterial(id: number, data: Partial<CreateMaterialRequest>): Promise<MaterialDTO> {
    return request<MaterialDTO>(`/warehouse/materials/${id}/`, { method: 'PATCH', body: data });
  },
  deleteMaterial(id: number): Promise<void> {
    return request<void>(`/warehouse/materials/${id}/`, { method: 'DELETE' });
  },

  // Movements
  async getMovements(): Promise<MovementDTO[]> {
    const res = await request<MovementDTO[] | { results: MovementDTO[] }>('/warehouse/movements/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  createMovement(data: CreateMovementRequest): Promise<MovementDTO> {
    return request<MovementDTO>('/warehouse/movements/', { method: 'POST', body: data });
  },
  updateMovement(id: number, data: { quantity: string; note?: string }): Promise<MovementDTO> {
    return request<MovementDTO>(`/warehouse/movements/${id}/`, { method: 'PATCH', body: data });
  },
  deleteMovement(id: number): Promise<void> {
    return request<void>(`/warehouse/movements/${id}/`, { method: 'DELETE' });
  },
};
