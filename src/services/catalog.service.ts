import { request, BASE_URL } from '@/lib/api';

export interface ProductImage {
  id:         number;
  image:      string;
  order:      number;
  is_primary: boolean;
  created_at: string;
}

export interface ProductDTO {
  id:            number;
  category:      number | null;
  category_name?: string;
  name:          string;
  sku:           string;
  description:   string;
  price:         number;
  cost_price:    number;
  width_cm:      number | null;
  height_cm:     number | null;
  depth_cm:      number | null;
  weight_kg:     number | null;
  is_active:     boolean;
  image:         string | null;
  images:        ProductImage[];
  created_at:    string;
}

export interface ProductListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  ProductDTO[];
}

export interface CreateProductData {
  name:            string;
  sku:             string;
  description:     string;
  price:           number;
  cost_price:      number;
  width_cm:        number | null;
  height_cm:       number | null;
  depth_cm:        number | null;
  is_active:       boolean;
  newImages?:      File[];
  deleteImageIds?: number[];
}

async function uploadImage(productId: number, file: File, isPrimary = false): Promise<void> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const form = new FormData();
  form.append('image', file);
  if (isPrimary) form.append('is_primary', 'true');
  await fetch(`${BASE_URL}/catalog/products/${productId}/images/`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'ngrok-skip-browser-warning': 'true',
    },
    body: form,
  });
}

export const catalogService = {
  getAll(params?: { search?: string; is_active?: boolean }) {
    const q = new URLSearchParams();
    if (params?.search)                  q.set('search', params.search);
    if (params?.is_active !== undefined) q.set('is_active', String(params.is_active));
    const qs = q.toString();
    return request<ProductListResponse | ProductDTO[]>(`/catalog/products/${qs ? '?' + qs : ''}`);
  },

  getById(id: number) {
    return request<ProductDTO>(`/catalog/products/${id}/`);
  },

  async create(data: CreateProductData): Promise<ProductDTO> {
    const body: Record<string, unknown> = {
      name:        data.name,
      sku:         data.sku,
      description: data.description ?? '',
      price:       String(data.price),
      cost_price:  String(data.cost_price ?? 0),
      is_active:   data.is_active,
    };
    if (data.width_cm  != null) body.width_cm  = String(data.width_cm);
    if (data.height_cm != null) body.height_cm = String(data.height_cm);
    if (data.depth_cm  != null) body.depth_cm  = String(data.depth_cm);

    const product = await request<ProductDTO>('/catalog/products/', { method: 'POST', body });

    if (data.newImages?.length) {
      for (let i = 0; i < data.newImages.length; i++) {
        await uploadImage(product.id, data.newImages[i], i === 0);
      }
    }

    return catalogService.getById(product.id);
  },

  async update(id: number, data: Partial<CreateProductData>): Promise<ProductDTO> {
    const body: Record<string, unknown> = {};
    if (data.name        !== undefined) body.name        = data.name;
    if (data.sku         !== undefined) body.sku         = data.sku;
    if (data.description !== undefined) body.description = data.description;
    if (data.price       !== undefined) body.price       = String(data.price);
    if (data.cost_price  !== undefined) body.cost_price  = String(data.cost_price);
    if (data.is_active   !== undefined) body.is_active   = data.is_active;
    if (data.width_cm    != null)       body.width_cm    = String(data.width_cm);
    if (data.height_cm   != null)       body.height_cm   = String(data.height_cm);
    if (data.depth_cm    != null)       body.depth_cm    = String(data.depth_cm);

    await request<ProductDTO>(`/catalog/products/${id}/`, { method: 'PATCH', body });

    if (data.deleteImageIds?.length) {
      for (const imgId of data.deleteImageIds) {
        await request<void>(`/catalog/products/${id}/images/${imgId}/`, { method: 'DELETE' });
      }
    }

    if (data.newImages?.length) {
      for (const file of data.newImages) {
        await uploadImage(id, file);
      }
    }

    return catalogService.getById(id);
  },

  delete(id: number) {
    return request<void>(`/catalog/products/${id}/`, { method: 'DELETE' });
  },
};
