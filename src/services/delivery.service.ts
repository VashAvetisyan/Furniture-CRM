import { request, BASE_URL } from '@/lib/api';

export type DeliveryStatus =
  | 'pending'
  | 'scheduled'
  | 'in_transit'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export interface DeliveryImage {
  id:         number;
  image:      string;
  note:       string | null;
  order:      number;
  created_at: string;
}

export interface DeliveryDTO {
  id:             number;
  task:           number;
  task_id:        string;
  task_name:      string;
  task_client:    string;
  task_phone:     string;
  status:         DeliveryStatus;
  status_display: string;
  scheduledDate:  string | null;
  deliveredAt:    string | null;
  address:        string;
  driver:         number | null;
  driver_name:    string | null;
  notes:          string | null;
  recipientName:  string | null;
  proofImageUrl:  string | null;
  images:         DeliveryImage[];
  created_at:     string;
  updated_at:     string;
}

export interface CreateDeliveryRequest {
  task:           number;
  status?:        DeliveryStatus;
  scheduledDate?: string;
  address?:       string;
  driver?:        number;
  notes?:         string;
  recipientName?: string;
}

export interface DeliveryStats {
  by_status: {
    pending:    number;
    scheduled:  number;
    in_transit: number;
    delivered:  number;
    failed:     number;
    cancelled:  number;
  };
  total:            number;
  today_count:      number;
  today_deliveries: DeliveryDTO[];
}

export interface DeliveryListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  DeliveryDTO[];
}

function normalizeList(res: DeliveryListResponse | DeliveryDTO[]): DeliveryListResponse {
  if (Array.isArray(res)) return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export const deliveryService = {
  getById(id: number) {
    return request<DeliveryDTO>(`/delivery/${id}/`, { method: 'GET' });
  },

  async getAll(params?: {
    status?:    DeliveryStatus;
    driver?:    number;
    date_from?: string;
    date_to?:   string;
    search?:    string;
  }): Promise<DeliveryListResponse> {
    const q = new URLSearchParams();
    if (params?.status)    q.set('status',    params.status);
    if (params?.driver)    q.set('driver',    String(params.driver));
    if (params?.date_from) q.set('date_from', params.date_from);
    if (params?.date_to)   q.set('date_to',   params.date_to);
    if (params?.search)    q.set('search',    params.search);
    const qs = q.toString();
    const res = await request<DeliveryListResponse | DeliveryDTO[]>(
      `/delivery/${qs ? '?' + qs : ''}`,
      { method: 'GET' },
    );
    return normalizeList(res);
  },

  create(data: CreateDeliveryRequest) {
    return request<DeliveryDTO>('/delivery/', { method: 'POST', body: data });
  },

  update(id: number, data: Partial<CreateDeliveryRequest>) {
    return request<DeliveryDTO>(`/delivery/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: number) {
    return request<void>(`/delivery/${id}/`, { method: 'DELETE' });
  },

  changeStatus(id: number, status: DeliveryStatus, note?: string) {
    return request<DeliveryDTO>(`/delivery/${id}/change-status/`, {
      method: 'POST',
      body:   note ? { status, note } : { status },
    });
  },

  async uploadProof(id: number, file: File): Promise<DeliveryDTO> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const form  = new FormData();
    form.append('proof', file);
    const res = await fetch(`${BASE_URL}/delivery/${id}/upload-proof/`, {
      method:  'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Ֆայլի բեռնումը ձախողվեց');
    }
    return res.json() as Promise<DeliveryDTO>;
  },

  getStats() {
    return request<DeliveryStats>('/delivery/stats/', { method: 'GET' });
  },

  async uploadImage(id: number, file: File, note?: string, order?: number): Promise<DeliveryImage> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const form  = new FormData();
    form.append('image', file);
    if (note)          form.append('note', note);
    if (order != null)  form.append('order', String(order));
    const res = await fetch(`${BASE_URL}/delivery/${id}/images/`, {
      method:  'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Ֆայլը բեռնում ձախողվեց');
    }
    return res.json() as Promise<DeliveryImage>;
  },

  updateImage(id: number, imageId: number, data: { note?: string; order?: number }) {
    return request<DeliveryImage>(`/delivery/${id}/images/${imageId}/`, {
      method: 'PATCH',
      body:   data,
    });
  },

  deleteImage(id: number, imageId: number) {
    return request<void>(`/delivery/${id}/images/${imageId}/`, { method: 'DELETE' });
  },
};
