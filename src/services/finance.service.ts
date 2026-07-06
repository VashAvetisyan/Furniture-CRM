import { request, BASE_URL } from '@/lib/api';

export type TransactionDirection = 'in' | 'out';

export interface CustomCategory {
  id:         number;
  name:       string;
  direction:  'in' | 'out' | 'both';
  color:      string;
  created_at: string;
}

export interface CreateCategoryRequest {
  name:      string;
  direction: 'in' | 'out' | 'both';
  color:     string;
}

export type TransactionCategory =
  | 'payment_advance'
  | 'payment_final'
  | 'payment'
  | 'salary'
  | 'supplier_payment'
  | 'operating'
  | 'other';

export interface TransactionDTO {
  id:                    number;
  direction:             TransactionDirection;
  category:              TransactionCategory;
  amount:                string;
  description:           string;
  transaction_date:      string;
  payment_method?:       'cash' | 'card' | null;
  supplier:              number | null;
  task:                  number | null;
  receipt_number:        string;
  custom_category?:      number | null;
  custom_category_name?: string | null;
}

export interface TransactionListResponse {
  results: TransactionDTO[];
  count:   number;
}

export interface PaymentMethodSummary {
  total_in:  number;
  total_out: number;
  balance:   number;
}

export interface TransactionSummary {
  total_in:           string | number;
  total_out:          string | number;
  balance:            string | number;
  by_category:        Record<string, { label: string; total_in: string; total_out: string }>;
  by_payment_method?: {
    cash?: PaymentMethodSummary;
    card?: PaymentMethodSummary;
  };
  transfers?: {
    cash_to_card?: number;
    card_to_cash?: number;
  };
}

export interface CreateTransactionRequest {
  direction:        TransactionDirection;
  category:         TransactionCategory;
  amount:           number;
  description?:     string;
  transaction_date: string;
  payment_method?:  'cash' | 'card';
  supplier?:        number | null;
  task?:            number | null;
  receipt_number?:  string;
  custom_category?: number | null;
}

export interface TransactionFilters {
  direction?:       TransactionDirection;
  category?:        TransactionCategory;
  date_from?:       string;
  date_to?:         string;
  search?:          string;
  custom_category?: number;
  task?:            number;
}

function buildQuery(filters: TransactionFilters): string {
  const p = new URLSearchParams({ limit: '500', ordering: '-transaction_date' });
  if (filters.direction)       p.set('direction',       filters.direction);
  if (filters.category)        p.set('category',        filters.category);
  if (filters.date_from)       p.set('date_from',       filters.date_from);
  if (filters.date_to)         p.set('date_to',         filters.date_to);
  if (filters.search)          p.set('search',          filters.search);
  if (filters.custom_category) p.set('custom_category', String(filters.custom_category));
  if (filters.task)            p.set('task',            String(filters.task));
  return p.toString();
}

export const financeService = {
  getAll: (filters: TransactionFilters = {}) =>
    request<TransactionListResponse>(`/finance/transactions/?${buildQuery(filters)}`),

  getSummary: (filters: Pick<TransactionFilters, 'date_from' | 'date_to' | 'category'> = {}) => {
    const p = new URLSearchParams();
    if (filters.date_from) p.set('date_from', filters.date_from);
    if (filters.date_to)   p.set('date_to',   filters.date_to);
    if (filters.category)  p.set('category',  filters.category);
    const q = p.toString();
    return request<TransactionSummary>(`/finance/transactions/summary/${q ? `?${q}` : ''}`);
  },

  create: (data: CreateTransactionRequest) =>
    request<TransactionDTO>('/finance/transactions/', { method: 'POST', body: data }),

  delete: (id: number) =>
    request<void>(`/finance/transactions/${id}/`, { method: 'DELETE' }),

  getCategories: async (direction?: 'in' | 'out' | 'both') => {
    const q = direction ? `?direction=${direction}` : '';
    const res = await request<CustomCategory[] | { results: CustomCategory[] }>(`/finance/categories/${q}`);
    return Array.isArray(res) ? res : (res as { results: CustomCategory[] }).results ?? [];
  },

  createCategory: (data: CreateCategoryRequest) =>
    request<CustomCategory>('/finance/categories/', { method: 'POST', body: data }),

  updateCategory: (id: number, data: Partial<CreateCategoryRequest>) =>
    request<CustomCategory>(`/finance/categories/${id}/`, { method: 'PATCH', body: data }),

  deleteCategory: (id: number) =>
    request<void>(`/finance/categories/${id}/`, { method: 'DELETE' }),

  exportFile: async (filters: TransactionFilters & { format: 'xlsx' | 'pdf' }): Promise<{ blob: Blob; filename: string }> => {
    const p = new URLSearchParams({ file_format: filters.format });
    if (filters.direction) p.set('direction', filters.direction);
    if (filters.category)  p.set('category',  filters.category);
    if (filters.date_from) p.set('date_from',  filters.date_from);
    if (filters.date_to)   p.set('date_to',    filters.date_to);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${BASE_URL}/finance/transactions/export/?${p.toString()}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) throw new Error('Export failed');

    const blob = await res.blob();
    const disposition = res.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    const filename = match
      ? match[1].replace(/['"]/g, '')
      : `transactions.${filters.format}`;

    return { blob, filename };
  },
};
