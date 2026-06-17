import { request } from '@/lib/api';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access:  string;
  refresh: string;
  user: {
    id:         number;
    username:   string;
    first_name: string;
    last_name:  string;
    email:      string;
    phone:      string;
    role:          string;
    position:      string | number;
    position_name: string | null;
    avatar:        string | null;
    company:       string | number | null;
    company_name:  string | null;
    is_active:     boolean;
  };
}

export interface TokenPayload {
  id:    string;
  name:  string;
  email: string;
  role:  string;
}

function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as TokenPayload;
  } catch {
    return null;
  }
}

export interface UpdateProfileRequest {
  first_name?: string;
  last_name?:  string;
  email?:      string;
  phone?:      string;
  position?:   string;
}

export const authService = {
  login(data: LoginRequest) {
    return request<LoginResponse>('/auth/login', {
      method: 'POST',
      body:   data,
      auth:   false,
    });
  },

  updateProfile(userId: string, data: UpdateProfileRequest) {
    return request<LoginResponse['user']>(`/users/${userId}/`, {
      method: 'PATCH',
      body:   data,
    });
  },

  getUserFromToken(): TokenPayload | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem('token');
    if (!token) return null;
    return decodeToken(token);
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
    }
  },
};
