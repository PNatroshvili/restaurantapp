import { apiClient } from './client';
import { Restaurant } from '../types';
import { Booking } from '../types';

export const bookingsApi = {
  availabilitySummary: (date: string, guests = 2, limit = 24) =>
    apiClient.get<{ date: string; guests: number; restaurants: Restaurant[] }>('/bookings/availability-summary', { params: { date, guests, limit } }),
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
