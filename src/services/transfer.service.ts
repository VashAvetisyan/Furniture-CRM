import { request } from '@/lib/api';

export type TransferDirection = 'cash_to_card' | 'card_to_cash';

export interface TransferDTO {
  id:           number;
  amount:       string;
  direction:    TransferDirection;
  transferDate: string;
  note?:        string | null;
}

export interface TransferListResponse {
  results: TransferDTO[];
  count:   number;
}

export interface CreateTransferRequest {
  amount:       number;
  direction:    TransferDirection;
  transferDate: string;
  note?:        string;
}

export interface TransferFilters {
  date_from?:  string;
  date_to?:    string;
  direction?:  TransferDirection;
}

export const transferService = {
  getAll: (filters: TransferFilters = {}) => {
    const p = new URLSearchParams({ limit: '500', ordering: '-transferDate' });
    if (filters.date_from)  p.set('date_from',  filters.date_from);
    if (filters.date_to)    p.set('date_to',    filters.date_to);
    if (filters.direction)  p.set('direction',  filters.direction);
    return request<TransferListResponse>(`/finance/transfers/?${p.toString()}`);
  },

  create: (data: CreateTransferRequest) =>
    request<TransferDTO>('/finance/transfers/', { method: 'POST', body: data }),

  update: (id: number, data: Partial<CreateTransferRequest>) =>
    request<TransferDTO>(`/finance/transfers/${id}/`, { method: 'PATCH', body: data }),

  delete: (id: number) =>
    request<void>(`/finance/transfers/${id}/`, { method: 'DELETE' }),
};
