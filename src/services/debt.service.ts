import { request } from '@/lib/api';

export interface DebtPayment {
  id:       number;
  amount:   string;
  paid_at:  string;
  note?:    string;
}

export interface ClientDebtDTO {
  id:             number;
  client:         number | { id: number; first_name: string; last_name: string; phone?: string };
  client_name?:   string;
  task?:          number | null;
  task_id?:       string;
  title?:         string;
  amount:         string;
  paid_amount?:   string;
  balance?:       string;
  due_date?:      string | null;
  status:         'pending' | 'partial' | 'paid' | string;
  status_display?: string;
  notes?:         string;
  created_at?:    string;
}

export interface SupplierDTO {
  id:   number;
  name: string;
  phone?: string;
  email?: string;
}

export interface SupplierDebtDTO {
  id:             number;
  supplier:       number | { id: number; name: string; phone?: string };
  supplier_name?: string;
  amount:         string;
  paid_amount?:   string;
  balance?:       string;
  due_date?:      string | null;
  status:         'pending' | 'partial' | 'paid' | string;
  status_display?: string;
  notes?:         string;
  created_at?:    string;
}

export interface SupplierDebtListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  SupplierDebtDTO[];
}

export interface DebtSummary {
  clients_unpaid_total?:   string;
  suppliers_unpaid_total?: string;
  total_unpaid?:           string;
  clients_count?:          number;
  [key: string]: unknown;
}

export interface DebtListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  ClientDebtDTO[];
}

export const debtService = {
  getAll(params?: { status?: string; client?: number }) {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.client) q.set('client', String(params.client));
    const qs = q.toString();
    return request<DebtListResponse | ClientDebtDTO[]>(`/debts/clients/${qs ? '?' + qs : ''}`);
  },

  getById(id: number) {
    return request<ClientDebtDTO>(`/debts/clients/${id}/`);
  },

  create(data: {
    client:    number;
    title?:    string;
    task?:     number;
    amount:    string;
    paid?:     string;
    status?:   string;
    due_date?: string;
    notes?:    string;
  }) {
    return request<ClientDebtDTO>('/debts/clients/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<ClientDebtDTO>) {
    return request<ClientDebtDTO>(`/debts/clients/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/debts/clients/${id}/`, { method: 'DELETE' });
  },

  pay(id: number, data: { amount: string; paid_at?: string; note?: string; payment_method?: 'cash' | 'card' }) {
    return request<DebtPayment>(`/debts/clients/${id}/pay/`, { method: 'POST', body: data });
  },

  getPayments(id: number) {
    return request<DebtPayment[]>(`/debts/clients/${id}/payments/`);
  },

  getSummary() {
    return request<DebtSummary>('/debts/summary/');
  },
};

export const supplierService = {
  getAll() {
    return request<SupplierDTO[] | { results: SupplierDTO[] }>('/suppliers/');
  },
};

export const supplierDebtService = {
  getAll(params?: { status?: string; supplier?: number }) {
    const q = new URLSearchParams();
    if (params?.status)   q.set('status',   params.status);
    if (params?.supplier) q.set('supplier', String(params.supplier));
    const qs = q.toString();
    return request<SupplierDebtListResponse | SupplierDebtDTO[]>(`/suppliers/debts/${qs ? '?' + qs : ''}`);
  },

  create(data: {
    supplier:  number;
    amount:    string;
    status?:   string;
    due_date?: string;
    notes?:    string;
  }) {
    return request<SupplierDebtDTO>('/suppliers/debts/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<SupplierDebtDTO>) {
    return request<SupplierDebtDTO>(`/suppliers/debts/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/suppliers/debts/${id}/`, { method: 'DELETE' });
  },

  pay(id: number, data: { amount: string; paid_at?: string; note?: string; payment_method?: 'cash' | 'card' }) {
    return request<DebtPayment>(`/suppliers/debts/${id}/pay/`, { method: 'POST', body: data });
  },

  getPayments(id: number) {
    return request<DebtPayment[]>(`/suppliers/debts/${id}/payments/`);
  },
};
