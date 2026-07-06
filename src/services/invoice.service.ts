import { request } from '@/lib/api';

export interface InvoiceDTO {
  id:             number;
  supplier:       number | { id: number; name: string };
  supplier_name?: string;
  invoice_number?: string;
  amount:         string;
  paid_amount?:   string;
  balance?:       string;
  status?:        'unpaid' | 'partial' | 'paid';
  status_display?: string;
  issue_date:     string;
  due_date?:      string | null;
  description?:   string;
  created_by?:    number;
  created_at?:    string;
}

export interface InvoiceListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  InvoiceDTO[];
}

export const invoiceService = {
  getAll() {
    return request<InvoiceListResponse | InvoiceDTO[]>('/suppliers/invoices/', { method: 'GET' });
  },
  create(data: {
    supplier:        number;
    amount:          string;
    issue_date:      string;
    invoice_number?: string;
    due_date?:       string;
    description?:    string;
  }) {
    return request<InvoiceDTO>('/suppliers/invoices/', { method: 'POST', body: data });
  },
  update(id: number, data: Partial<{ due_date: string; description: string; invoice_number: string }>) {
    return request<InvoiceDTO>(`/suppliers/invoices/${id}/`, { method: 'PATCH', body: data });
  },
  delete(id: number) {
    return request<void>(`/suppliers/invoices/${id}/`, { method: 'DELETE' });
  },
};
