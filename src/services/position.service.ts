import { request } from '@/lib/api';

export interface PositionDTO {
  id:          number;
  name:        string;
  user_count?: number;
}

interface PositionListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  PositionDTO[];
}

export const positionService = {
  getAll() {
    return request<PositionListResponse>('/positions/', { method: 'GET' });
  },

  create(name: string) {
    return request<PositionDTO>('/positions/', { method: 'POST', body: { name } });
  },

  update(id: number, name: string) {
    return request<PositionDTO>(`/positions/${id}/`, { method: 'PATCH', body: { name } });
  },

  delete(id: number) {
    return request<void>(`/positions/${id}/`, { method: 'DELETE' });
  },
};
