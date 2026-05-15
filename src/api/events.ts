import { apiClient } from './client';

export interface RestaurantEvent {
  id: string;
  restaurantId: string;
  title: string;
  description?: string;
  emoji?: string;
  eventDate?: string;
  isActive: boolean;
  createdAt: string;
}

export const eventsApi = {
  getForRestaurant: (restaurantId: string) =>
    apiClient.get<RestaurantEvent[]>(`/events/restaurant/${restaurantId}`),

  getMy: () => apiClient.get<RestaurantEvent[]>('/events/my'),

  create: (restaurantId: string, dto: { title: string; description?: string; emoji?: string; eventDate?: string }) =>
    apiClient.post<RestaurantEvent>(`/events/restaurant/${restaurantId}`, dto),

  remove: (id: string) => apiClient.delete(`/events/${id}`),
};
