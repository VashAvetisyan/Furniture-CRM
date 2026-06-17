import { request } from '@/lib/api';

export interface NotificationDTO {
  id:           number;
  event_type:   'call_reminder' | 'task_assigned' | 'task_status' | 'task_deadline' | 'task_comment' | 'manual';
  channel:      'in_app' | 'telegram';
  status:       string;
  title:        string;
  message:      string;
  object_type:  string | null;
  object_id:    number | null;
  scheduled_at: string | null;
  sent_at:      string | null;
  is_read:      boolean;
  read_at:      string | null;
  created_at:   string;
}

export interface NotificationListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  NotificationDTO[];
}

export interface TelegramMeLinked {
  id:                number;
  telegram_chat_id:  number;
  telegram_username: string;
  is_active:         boolean;
  linked_at:         string;
}

export type TelegramMeDTO = TelegramMeLinked | { linked: false };

export interface TelegramLinkDTO {
  token:      string;
  expires_at: string;
  link_url:   string;
}

export const notificationService = {
  getAll(params?: { is_read?: boolean }) {
    const q = params?.is_read !== undefined ? `?is_read=${params.is_read}` : '';
    return request<NotificationListResponse>(`/notifications/${q}`);
  },

  getUnreadCount() {
    return request<{ unread: number }>('/notifications/unread_count/');
  },

  markRead(id: number) {
    return request<{ ok: boolean }>(`/notifications/${id}/read/`, { method: 'POST' });
  },

  markAllRead() {
    return request<{ ok: boolean }>('/notifications/read_all/', { method: 'POST' });
  },

  delete(id: number) {
    return request<void>(`/notifications/${id}/`, { method: 'DELETE' });
  },
};

export const telegramService = {
  getMe() {
    return request<TelegramMeDTO>('/telegram/me/');
  },

  link() {
    return request<TelegramLinkDTO>('/telegram/link/', { method: 'POST' });
  },

  unlink() {
    return request<{ unlinked: boolean }>('/telegram/unlink/', { method: 'DELETE' });
  },
};
