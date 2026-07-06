import { BASE_URL } from '@/lib/api';

function authHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'ngrok-skip-browser-warning': 'true',
  };
}

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/payroll${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string; error?: string }).detail ?? (err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface PayrollVariable {
  name:        string;
  label:       string;
  description?: string;
  scope:       'company' | 'employee';
}

export interface PayrollFormula {
  id:                   number;
  name:                 string;
  description?:         string;
  target_type:          'position' | 'user';
  position?:            number | null;
  position_name?:       string;
  user?:                number | null;
  user_name?:           string;
  expression:           string;
  is_active:            boolean;
  created_by?:          string;
  created_at?:          string;
  updated_at?:          string;
  referenced_variables?: string[];
}

export interface PayrollFormulaPayload {
  name:        string;
  description?: string;
  target_type: 'position' | 'user';
  position?:   number | null;
  user?:       number | null;
  expression:  string;
  is_active:   boolean;
}

export interface ValidateResult {
  valid:                boolean;
  referenced_variables?: string[];
  error?:               string;
}

export interface CalculatePayload {
  user_id:   number;
  date_from: string;
  date_to:   string;
}

export interface CalculateResult {
  result:          string;
  employee_id:     number;
  employee_name:   string;
  formula_id:      number;
  formula_name:    string;
  applied_scope:   string;
  period_start:    string;
  period_end:      string;
  variables:       Record<string, string>;
  calculation_id:  number;
}

export interface CalcHistory {
  id:            number;
  employee_name: string;
  formula_name:  string;
  period_start:  string;
  period_end:    string;
  result:        string;
  created_at:    string;
}

export const payrollService = {
  getFormulas:    ()                          => req<PayrollFormula[]>('GET',    '/formulas/'),
  createFormula:  (data: PayrollFormulaPayload) => req<PayrollFormula>('POST',   '/formulas/', data),
  updateFormula:  (id: number, data: Partial<PayrollFormulaPayload>) => req<PayrollFormula>('PATCH', `/formulas/${id}/`, data),
  deleteFormula:  (id: number)                => req<void>('DELETE', `/formulas/${id}/`),
  validateFormula:(expression: string)        => req<ValidateResult>('POST', '/formulas/validate/', { expression }),
  getVariables:   ()                          => req<PayrollVariable[]>('GET', '/variables/'),
  calculate:      (data: CalculatePayload)    => req<CalculateResult>('POST', '/calculate/', data),
  getHistory:     ()                          => req<CalcHistory[]>('GET', '/calculations/'),
};
