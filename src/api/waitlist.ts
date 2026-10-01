import { apiClient } from './client';

export interface WaitlistEntry {
  id: string;
  restaurantId: string;
  userId: string;
  date: string;
  timeFrom?: string | null;
  timeTo?: string | null;
  guestsCount: number;
  status: string;
  expiresAt?: string | null;
  createdAt: string;
}

export const waitlistApi = {
  join: (payload: { restaurant_id: string; date: string; time_from?: string; time_to?: string; guests_count: number }) =>
    apiClient.post<WaitlistEntry>('/waitlist', payload),
  getMine: () => apiClient.get<WaitlistEntry[]>('/waitlist/mine'),
  cancel: (id: string) => apiClient.delete<WaitlistEntry>('/waitlist/' + encodeURIComponent(id)),
};
