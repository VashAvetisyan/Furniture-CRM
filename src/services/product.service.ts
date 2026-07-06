import { request } from '@/lib/api';

export interface ProductDTO {
  id:   number;
  name: string;
}

export interface ProductListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  ProductDTO[];
}

export const productService = {
  getAll() {
    return request<ProductListResponse>('/catalog/products/', { method: 'GET' });
  },
};
