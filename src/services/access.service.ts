import { request } from '@/lib/api';

export interface PageItem {
  slug:    string;
  label:   string;
  icon?:   string;
  order?:  number;
  parent:  string | null;
}

export interface CompanyPageSetting extends PageItem {
  is_director_only: boolean;
  enabled:          boolean;
}

export interface PositionPageSetting extends PageItem {
  is_director_only: boolean;
  allowed:          boolean;
}

export interface PositionSettingsResponse {
  position: { id: number; name: string };
  pages:    PositionPageSetting[];
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

  async getCompanySettings(): Promise<CompanyPageSetting[]> {
    const res = await request<AnyList<CompanyPageSetting>>('/access/company-settings/');
    return toArray(res);
  },

  setCompanySetting(page_slug: string, enabled: boolean) {
    return request<CompanyPageSetting>('/access/company-settings/', {
      method: 'POST',
      body:   { page_slug, enabled },
    });
  },

  bulkUpdateCompanySettings(pages: { slug: string; enabled: boolean }[]) {
    return request<void>('/access/company-settings/bulk/', {
      method: 'POST',
      body:   { pages },
    });
  },

  async getPositionSettings(): Promise<PositionSettingsResponse[]> {
    const res = await request<AnyList<PositionSettingsResponse>>('/access/position-settings/');
    return toArray(res as unknown as AnyList<PositionSettingsResponse>);
  },

  getPositionSettingsById(positionId: number) {
    return request<PositionSettingsResponse>(`/access/position-settings/${positionId}/`);
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

  resetPositionSettings(positionId: number) {
    return request<void>(`/access/position-settings/${positionId}/reset/`, {
      method: 'DELETE',
    });
  },
};
