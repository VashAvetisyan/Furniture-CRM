import { request } from '@/lib/api';

export interface CompanySettings {
  advance_payment_percent: number;
  default_completion_days: number;
  invoice_notes?: string;
}

export const companySettingsService = {
  get: () =>
    request<CompanySettings>('/company/settings/'),

  update: (data: Partial<CompanySettings>) =>
    request<CompanySettings>('/company/settings/', { method: 'PATCH', body: data }),
};
