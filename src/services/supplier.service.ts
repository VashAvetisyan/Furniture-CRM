import { request } from '@/lib/api';

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface SupplierDTO {
  id:              number;
  name:            string;
  contact_person?: string;
  phone?:          string;
  email?:          string;
  address?:        string;
  notes?:          string;
  is_active:       boolean;
  created_at:      string;
}

export interface SupplierBalanceDTO {
  supplier_id:    number;
  supplier_name:  string;
  total_invoiced: string;
  total_paid:     string;
  balance_owed:   string;
  invoice_count:  number;
  unpaid_count:   number;
}

export interface SupplierInvoiceDTO {
  id:             number;
  supplier:       number;
  supplier_name:  string;
  invoice_number: string;
  amount:         string;
  paid_amount:    string;
  balance:        string;
  status:         'unpaid' | 'partial' | 'paid';
  status_display: string;
  issue_date:     string;
  due_date:       string | null;
  description:    string;
  created_by:     number;
  created_at:     string;
}

export interface InvoicePaymentDTO {
  id:                 number;
  invoice:            number;
  amount:             string;
  paid_at:            string;
  note:               string;
  payment_method:     'cash' | 'card';
  linked_transaction: number | null;
  created_at:         string;
}

export interface SupplierDebtDTO {
  id:             number;
  supplier:       number;
  supplier_name:  string;
  title:          string;
  amount:         string;
  paid_amount:    string;
  balance:        string;
  status:         'pending' | 'partial' | 'paid' | 'overdue';
  status_display: string;
  due_date:       string | null;
  notes:          string;
  created_by:     number;
  created_at:     string;
}

export interface DebtPaymentDTO {
  id:                 number;
  amount:             string;
  paid_at:            string;
  note:               string;
  payment_method:     'cash' | 'card';
  linked_transaction: number | null;
  created_at:         string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

interface Paginated<T> { count: number; next: string | null; previous: string | null; results: T[]; }

function normList<T>(res: Paginated<T> | T[]): T[] {
  if (Array.isArray(res)) return res;
  return (res as Paginated<T>).results ?? [];
}

// ── Supplier service ───────────────────────────────────────────────────────────

export const supplierService = {
  async getAll(params?: { search?: string }): Promise<SupplierDTO[]> {
    const q = params?.search ? `?search=${encodeURIComponent(params.search)}` : '';
    const res = await request<Paginated<SupplierDTO> | SupplierDTO[]>(`/suppliers/${q}`);
    return normList(res);
  },

  getById(id: number) {
    return request<SupplierDTO>(`/suppliers/${id}/`);
  },

  create(data: {
    name:            string;
    contact_person?: string;
    phone?:          string;
    email?:          string;
    address?:        string;
    notes?:          string;
    is_active?:      boolean;
  }) {
    return request<SupplierDTO>('/suppliers/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<{
    name:           string;
    contact_person: string;
    phone:          string;
    email:          string;
    address:        string;
    notes:          string;
    is_active:      boolean;
  }>) {
    return request<SupplierDTO>(`/suppliers/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/suppliers/${id}/`, { method: 'DELETE' });
  },

  getBalance(id: number) {
    return request<SupplierBalanceDTO>(`/suppliers/${id}/balance/`);
  },
};

// ── Invoice service (Director only) ───────────────────────────────────────────

export const supplierInvoiceService = {
  async getAll(params?: { supplier?: number; status?: string; ordering?: string }): Promise<SupplierInvoiceDTO[]> {
    const q = new URLSearchParams();
    if (params?.supplier) q.set('supplier', String(params.supplier));
    if (params?.status)   q.set('status',   params.status);
    if (params?.ordering) q.set('ordering', params.ordering);
    const qs = q.toString();
    const res = await request<Paginated<SupplierInvoiceDTO> | SupplierInvoiceDTO[]>(`/suppliers/invoices/${qs ? '?' + qs : ''}`);
    return normList(res);
  },

  getById(id: number) {
    return request<SupplierInvoiceDTO>(`/suppliers/invoices/${id}/`);
  },

  create(data: {
    supplier:        number;
    amount:          string;
    issue_date:      string;
    invoice_number?: string;
    due_date?:       string;
    description?:    string;
  }) {
    return request<SupplierInvoiceDTO>('/suppliers/invoices/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<{ due_date: string; description: string; invoice_number: string }>) {
    return request<SupplierInvoiceDTO>(`/suppliers/invoices/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/suppliers/invoices/${id}/`, { method: 'DELETE' });
  },

  pay(id: number, data: { amount: string; payment_method?: 'cash' | 'card'; note?: string }) {
    return request<SupplierInvoiceDTO>(`/suppliers/invoices/${id}/pay/`, { method: 'POST', body: data });
  },

  getPayments(id: number) {
    return request<InvoicePaymentDTO[]>(`/suppliers/invoices/${id}/payments/`);
  },
};

// ── Debt service ───────────────────────────────────────────────────────────────

export const supplierDebtService = {
  async getAll(params?: { supplier?: number; status?: string }): Promise<SupplierDebtDTO[]> {
    const q = new URLSearchParams();
    if (params?.supplier) q.set('supplier', String(params.supplier));
    if (params?.status)   q.set('status',   params.status);
    const qs = q.toString();
    const res = await request<Paginated<SupplierDebtDTO> | SupplierDebtDTO[]>(`/suppliers/debts/${qs ? '?' + qs : ''}`);
    return normList(res);
  },

  getById(id: number) {
    return request<SupplierDebtDTO>(`/suppliers/debts/${id}/`);
  },

  create(data: {
    supplier:  number;
    title:     string;
    amount:    string;
    due_date?: string;
    notes?:    string;
  }) {
    return request<SupplierDebtDTO>('/suppliers/debts/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<{ due_date: string; notes: string; title: string }>) {
    return request<SupplierDebtDTO>(`/suppliers/debts/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/suppliers/debts/${id}/`, { method: 'DELETE' });
  },

  pay(id: number, data: { amount: string; paid_at?: string; payment_method?: 'cash' | 'card'; note?: string }) {
    return request<DebtPaymentDTO>(`/suppliers/debts/${id}/pay/`, { method: 'POST', body: data });
  },

  getPayments(id: number) {
    return request<DebtPaymentDTO[]>(`/suppliers/debts/${id}/payments/`);
  },
};
