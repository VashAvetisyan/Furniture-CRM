import { request, fetchAllPages } from '@/lib/api';

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

export interface ClientListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  ClientDTO[];
}

export interface ClientListParams {
  page?:       number;
  pageSize?:   number;
  source?:     number;
  clientType?: 'individual' | 'legal';
  dateFrom?:   string;
  dateTo?:     string;
  search?:     string;
}

export interface CallListParams {
  isDone?:   boolean;
  dateFrom?: string;
  dateTo?:   string;
  search?:   string;
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
  getAll(): Promise<ClientDTO[]> {
    return fetchAllPages<ClientDTO>('/clients/');
  },
  // Server-side search — used by autocompletes/pickers so they only ever ask for
  // a handful of matches instead of pulling the whole client list up front.
  async search(query: string): Promise<ClientDTO[]> {
    if (!query.trim()) return [];
    const res = await request<ClientDTO[] | { results: ClientDTO[] }>(
      `/clients/?search=${encodeURIComponent(query.trim())}`, { method: 'GET' },
    );
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  // One filtered/paginated page — used by the Clients list page so it only ever
  // asks the backend for the page currently on screen, with filtering/search/date
  // range pushed down to the server instead of pulling every client up front.
  async getPage(params: ClientListParams = {}): Promise<ClientListResponse> {
    const qs = new URLSearchParams();
    qs.set('page', String(params.page ?? 1));
    if (params.pageSize)   qs.set('page_size', String(params.pageSize));
    if (params.source)     qs.set('source', String(params.source));
    if (params.clientType) qs.set('client_type', params.clientType);
    if (params.dateFrom)   qs.set('date_from', params.dateFrom);
    if (params.dateTo)     qs.set('date_to', params.dateTo);
    if (params.search)     qs.set('search', params.search);
    const res = await request<ClientListResponse | ClientDTO[]>(`/clients/?${qs.toString()}`, { method: 'GET' });
    return Array.isArray(res) ? { count: res.length, next: null, previous: null, results: res } : res;
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
  // New dedicated list endpoint — previously the only way to see a client's calls
  // was the `calls[]` array embedded on the client object itself.
  async getCalls(clientId: number, params: CallListParams = {}): Promise<CallDTO[]> {
    const qs = new URLSearchParams();
    if (params.isDone !== undefined) qs.set('is_done', String(params.isDone));
    if (params.dateFrom)             qs.set('date_from', params.dateFrom);
    if (params.dateTo)               qs.set('date_to', params.dateTo);
    if (params.search)               qs.set('search', params.search);
    const sep = qs.toString() ? `?${qs.toString()}` : '';
    const res = await request<CallDTO[] | { results: CallDTO[] }>(`/clients/${clientId}/calls/${sep}`, { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
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
