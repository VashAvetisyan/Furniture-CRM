import { request } from '@/lib/api';

// ── DTOs ──────────────────────────────────────────────────────────────────────

export interface SourceDTO {
  id:   number;
  name: string;
}

export interface CallDTO {
  id:         number;
  note:       string;
  date:       string;
  is_done:    boolean;
  done_at:    string | null;
  created_at: string;
}

export interface ClientDTO {
  id:             number;
  client_type:    'individual' | 'legal';
  first_name:     string;
  last_name:      string;
  company_name:   string;
  phone:          string;
  phone_alt:      string;
  email:          string;
  address:        string;
  notes:          string;
  description:    string;
  id_document:    string;
  source:         SourceDTO | null;
  next_call_date: string | null;
  last_called_at: string | null;
  created_at:     string;
  calls:          CallDTO[];
}

export interface CreateClientRequest {
  client_type?:   'individual' | 'legal';
  first_name:     string;
  last_name?:     string;
  company_name?:  string;
  phone:          string;
  phone_alt?:     string;
  email?:         string;
  address?:       string;
  notes?:         string;
  description?:   string;
  id_document?:   string;
  source?:        number | null;
  next_call_date?: string | null;
  last_called_at?: string | null;
}

export interface CreateCallRequest {
  note: string;
  date: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export const clientService = {
  // Sources
  async getSources(): Promise<SourceDTO[]> {
    const res = await request<SourceDTO[] | { results: SourceDTO[] }>('/clients/sources/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  createSource(name: string) {
    return request<SourceDTO>('/clients/sources/', { method: 'POST', body: { name } });
  },
  deleteSource(id: number) {
    return request<void>(`/clients/sources/${id}/`, { method: 'DELETE' });
  },

  // Clients
  async getAll(): Promise<ClientDTO[]> {
    const res = await request<ClientDTO[] | { results: ClientDTO[] }>('/clients/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  create(data: CreateClientRequest) {
    return request<ClientDTO>('/clients/', { method: 'POST', body: data });
  },
  update(id: number, data: Partial<CreateClientRequest>) {
    return request<ClientDTO>(`/clients/${id}/`, { method: 'PATCH', body: data });
  },
  delete(id: number) {
    return request<void>(`/clients/${id}/`, { method: 'DELETE' });
  },

  // Calls
  addCall(clientId: number, data: CreateCallRequest) {
    return request<CallDTO>(`/clients/${clientId}/calls/`, { method: 'POST', body: data });
  },
  markCallDone(clientId: number, callId: number) {
    return request<CallDTO>(`/clients/${clientId}/calls/${callId}/`, { method: 'PATCH', body: { is_done: true } });
  },
  updateCall(clientId: number, callId: number, data: Partial<Pick<CallDTO, 'note' | 'date' | 'is_done'>>) {
    return request<CallDTO>(`/clients/${clientId}/calls/${callId}/`, { method: 'PATCH', body: data });
  },
  deleteCall(clientId: number, callId: number) {
    return request<void>(`/clients/${clientId}/calls/${callId}/`, { method: 'DELETE' });
  },
};
