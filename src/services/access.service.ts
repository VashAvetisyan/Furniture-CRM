import { request } from '@/lib/api';

export interface PageItem {
  id:     number;
  slug:   string;
  label:  string;
  icon?:  string;
  order?: number;
}

export interface CompanySetting {
  id:              number;
  page:            number | { id: number; slug: string; label: string };
  page_slug?:      string;
  page_label?:     string;
  employee_access: boolean;
}

export interface PositionSetting {
  id?:              number;
  position_name?:   string;
  page_slug?:       string;
  slug?:            string;
  page_label?:      string;
  label?:           string;
  icon?:            string;
  order?:           number;
  is_director_only?: boolean;
  allowed:          boolean;
}

type AnyList<T> = T[] | { results: T[] } | { pages: T[] };

function toArray<T>(res: AnyList<T>): T[] {
  if (Array.isArray(res)) return res;
  if ('pages' in res)   return (res as { pages: T[] }).pages   ?? [];
  return (res as { results: T[] }).results ?? [];
}

export const accessService = {
  async getMyPages(): Promise<PageItem[]> {
    const res = await request<AnyList<PageItem>>('/access/my-pages/');
    return toArray(res);
  },

  async getPages(): Promise<PageItem[]> {
    const res = await request<AnyList<PageItem>>('/access/pages/');
    return toArray(res);
  },

  async getCompanySettings(): Promise<CompanySetting[]> {
    const res = await request<AnyList<CompanySetting>>('/access/company-settings/');
    return toArray(res);
  },

  setCompanySetting(page_id: number, employee_access: boolean) {
    return request<CompanySetting>('/access/company-settings/', {
      method: 'POST',
      body: { page: page_id, employee_access },
    });
  },

  async getPositionSettings(): Promise<PositionSetting[]> {
    const res = await request<AnyList<PositionSetting>>('/access/position-settings/');
    return toArray(res);
  },

  async getPositionSettingsById(positionId: number): Promise<PositionSetting[]> {
    const res = await request<AnyList<PositionSetting>>(`/access/position-settings/${positionId}/`);
    return toArray(res);
  },

  bulkUpdatePositionSettings(
    positionId: number,
    pages: { slug: string; allowed: boolean }[],
  ) {
    return request<void>(`/access/position-settings/${positionId}/bulk/`, {
      method: 'POST',
      body:   { pages },
    });
  },

  setPositionSetting(position_id: number, page_slug: string, allowed: boolean) {
    return request<PositionSetting>('/access/position-settings/', {
      method: 'POST',
      body: { position_id, page_slug, allowed },
    });
  },
};
