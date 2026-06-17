import { request } from '@/lib/api';

export interface InvoiceDTO {
  id:           number;
  supplier:     number | { id: number; name: string };
  supplierName?: string;
  invoiceNumber?: string;
  amount:       string;
  date:         string;
  dueDate?:     string;
  status?:      string;
  notes?:       string;
  createdAt?:   string;
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
  create(data: Partial<InvoiceDTO>) {
    return request<InvoiceDTO>('/suppliers/invoices/', { method: 'POST', body: data });
  },
  update(id: number, data: Partial<InvoiceDTO>) {
    return request<InvoiceDTO>(`/suppliers/invoices/${id}/`, { method: 'PATCH', body: data });
  },
  delete(id: number) {
    return request<void>(`/suppliers/invoices/${id}/`, { method: 'DELETE' });
  },
};
