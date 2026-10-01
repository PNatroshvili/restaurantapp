import { apiClient } from './client';
import { Booking } from '../types';

export const bookingsApi = {
  getAvailability: (restaurantId: string, date: string, guests = 2) =>
    apiClient.get<{ date: string; open: boolean; openTime?: string; closeTime?: string; reason?: string; slots: { time: string; available: boolean }[] }>(`/bookings/availability?restaurant_id=${encodeURIComponent(restaurantId)}&date=${encodeURIComponent(date)}&guests=${guests}`),

  create: (data: {
    restaurant_id: string;
    date: string;
    time: string;
    guests_count: number;
    comment?: string;
  }) => apiClient.post<Booking>('/bookings', data),

  getMy: () => apiClient.get<Booking[]>('/bookings/my'),

  getMyRestaurant: () => apiClient.get<Booking[]>('/bookings/my-restaurant'),

  cancel: (id: string) =>
    apiClient.patch(`/bookings/${id}/status`, { status: 'cancelled' }),

  updateStatus: (id: string, status: 'confirmed' | 'rejected' | 'cancelled') =>
    apiClient.patch(`/bookings/${id}/status`, { status }),
};
