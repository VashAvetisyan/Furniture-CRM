import { request } from '@/lib/api';

export interface DebtPayment {
  id:       number;
  amount:   string;
  paid_at:  string;
  note?:    string;
}

export interface ClientDebtDTO {
  id:             number;
  client:         number | { id: number; first_name: string; last_name: string; phone?: string } | null;
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

export interface EmployeeDebtDTO {
  id:              number;
  employee:        string | { id: string; name: string };
  employee_name?:  string;
  title?:          string;
  amount:          string;
  paid_amount?:    string;
  balance?:        string;
  due_date?:       string | null;
  status:          'pending' | 'partial' | 'paid' | 'overdue' | string;
  status_display?: string;
  notes?:          string;
  created_by?:     number;
  created_at?:     string;
}

export interface EmployeeDebtListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  EmployeeDebtDTO[];
}

export interface OtherDebtDTO {
  id:                 number;
  party_name:         string;
  direction:           'owed_to_us' | 'we_owe' | string;
  direction_display?: string;
  title?:             string;
  amount:             string;
  paid_amount?:       string;
  balance?:           string;
  due_date?:          string | null;
  status:             'pending' | 'partial' | 'paid' | 'overdue' | string;
  status_display?:    string;
  notes?:             string;
  created_by?:        number;
  created_at?:        string;
}

export interface OtherDebtListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  OtherDebtDTO[];
}

export interface DebtSummary {
  clients_unpaid_total?:   string;
  suppliers_unpaid_total?: string;
  employees_unpaid_total?: string;
  total_unpaid?:           string;
  clients_count?:          number;
  clients?:                { total?: string; paid?: string; unpaid?: string };
  suppliers?:              { total?: string; paid?: string; unpaid?: string };
  employees?:              { total?: string; paid?: string; unpaid?: string };
  other?:                  { owed_to_us?: { total?: string; paid?: string; unpaid?: string }; we_owe?: { total?: string; paid?: string; unpaid?: string } };
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

export const employeeDebtService = {
  getAll(params?: { status?: string; employee?: string }) {
    const q = new URLSearchParams();
    if (params?.status)   q.set('status',   params.status);
    if (params?.employee) q.set('employee', params.employee);
    const qs = q.toString();
    return request<EmployeeDebtListResponse | EmployeeDebtDTO[]>(`/debts/employees/${qs ? '?' + qs : ''}`);
  },

  create(data: {
    employee:  string;
    title?:    string;
    amount:    string;
    status?:   string;
    due_date?: string;
    notes?:    string;
  }) {
    return request<EmployeeDebtDTO>('/debts/employees/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<EmployeeDebtDTO>) {
    return request<EmployeeDebtDTO>(`/debts/employees/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/debts/employees/${id}/`, { method: 'DELETE' });
  },

  pay(id: number, data: { amount: string; paid_at?: string; note?: string; payment_method?: 'cash' | 'card' }) {
    return request<DebtPayment>(`/debts/employees/${id}/pay/`, { method: 'POST', body: data });
  },

  getPayments(id: number) {
    return request<DebtPayment[]>(`/debts/employees/${id}/payments/`);
  },
};

export const otherDebtService = {
  getAll(params?: { status?: string; direction?: string; search?: string }) {
    const q = new URLSearchParams();
    if (params?.status)    q.set('status',    params.status);
    if (params?.direction) q.set('direction', params.direction);
    if (params?.search)    q.set('search',    params.search);
    const qs = q.toString();
    return request<OtherDebtListResponse | OtherDebtDTO[]>(`/debts/other/${qs ? '?' + qs : ''}`);
  },

  create(data: {
    party_name: string;
    direction:  'owed_to_us' | 'we_owe';
    title?:     string;
    amount:     string;
    status?:    string;
    due_date?:  string;
    notes?:     string;
  }) {
    return request<OtherDebtDTO>('/debts/other/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<OtherDebtDTO>) {
    return request<OtherDebtDTO>(`/debts/other/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/debts/other/${id}/`, { method: 'DELETE' });
  },

  pay(id: number, data: { amount: string; paid_at?: string; note?: string; payment_method?: 'cash' | 'card' }) {
    return request<DebtPayment>(`/debts/other/${id}/pay/`, { method: 'POST', body: data });
  },

  getPayments(id: number) {
    return request<DebtPayment[]>(`/debts/other/${id}/payments/`);
  },
};
