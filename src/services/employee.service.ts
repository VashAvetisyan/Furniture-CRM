import { request } from '@/lib/api';

export interface EmployeeDTO {
  id:       string;
  name:     string;
  email:    string;
  phone?:   string;
  gender:   'Male' | 'Female';
  birthday: string;
  fullAge:  number;
  position: string | number;
  level:    'Junior' | 'Middle' | 'Senior';
  color:    string;
  initials: string;
  onVacation?: boolean;
  isActive?: boolean;
  tasks: {
    backlog:    number;
    inProgress: number;
    inReview:   number;
  };
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
  position:  number;
  level:     'Junior' | 'Middle' | 'Senior';
  gender?:   'Male' | 'Female';
  birthday?: string;
  color:     string;
  password:  string;
}

export interface EmployeeListResponse {
  data:  EmployeeDTO[];
  total: number;
  page:  number;
}

export const employeeService = {
  getAll() {
    return request<EmployeeListResponse>('/employees', { method: 'GET' });
  },

  getById(id: string) {
    return request<EmployeeDTO>(`/employees/${id}`, { method: 'GET' });
  },

  create(data: CreateEmployeeRequest) {
    return request<EmployeeDTO>('/employees', {
      method: 'POST',
      body:   data,
    });
  },

  update(id: string, data: Partial<CreateEmployeeRequest>) {
    return request<EmployeeDTO>(`/employees/${id}`, {
      method: 'PATCH',
      body:   data,
    });
  },

  setActive(id: string, isActive: boolean) {
    return request<EmployeeDTO>(`/employees/${id}`, {
      method: 'PATCH',
      body:   { isActive },
    });
  },

  delete(id: string) {
    return request<void>(`/employees/${id}`, { method: 'DELETE' });
  },

  setPassword(id: string, password: string) {
    return request<{ detail: string }>(`/employees/${id}/set-password/`, {
      method: 'POST',
      body:   { password },
    });
  },
};
