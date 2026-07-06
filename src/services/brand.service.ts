import { BASE_URL, request } from '@/lib/api';

export interface BrandInfo {
  name:        string;
  logo:        string | null;
  description: string;
  tagline:     string;
  website:     string;
  email:       string;
  phone:       string;
  updated_at:  string;
}

export type BrandUpdatePayload = Partial<Omit<BrandInfo, 'logo' | 'updated_at'> & { logo: File | null }>;

export const brandService = {
  get: (): Promise<BrandInfo> =>
    request<BrandInfo>('/brand/', { auth: false }),

  update: async (data: BrandUpdatePayload): Promise<BrandInfo> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const form  = new FormData();

    if (data.name        !== undefined) form.append('name',        data.name);
    if (data.description !== undefined) form.append('description', data.description);
    if (data.tagline     !== undefined) form.append('tagline',     data.tagline);
    if (data.website     !== undefined) form.append('website',     data.website);
    if (data.email       !== undefined) form.append('email',       data.email);
    if (data.phone       !== undefined) form.append('phone',       data.phone);
    if (data.logo instanceof File)      form.append('logo',        data.logo);

    const url = `${BASE_URL}/brand/`.replace(/\/?(\?|$)/, '/$1');
    const res = await fetch(url, {
      method:  'PATCH',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? err.message ?? 'Չհաջողվեց պահպանել');
    }
    return res.json() as Promise<BrandInfo>;
  },
};
