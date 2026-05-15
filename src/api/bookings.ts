import { apiClient } from './client';
import { Booking } from '../types';

export const bookingsApi = {
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
