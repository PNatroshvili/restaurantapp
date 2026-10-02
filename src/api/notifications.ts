import { apiClient } from './client';

export interface UserNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
}

export const notificationsApi = {
  getAll: () => apiClient.get<{ data: UserNotification[]; unreadCount: number }>('/notifications'),
  markRead: (id: string) => apiClient.patch<UserNotification>(`/notifications/${encodeURIComponent(id)}/read`),
  markAllRead: () => apiClient.patch<{ ok: boolean }>('/notifications/read-all'),
};
