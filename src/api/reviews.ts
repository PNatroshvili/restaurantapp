import { apiClient } from './client';
import { Review } from '../types';

export const reviewsApi = {
  create: (data: { restaurant_id: string; rating: number; food_rating?: number; service_rating?: number; ambience_rating?: number; comment?: string; photos?: string[] }) =>
    apiClient.post<Review>('/reviews', data),
};
