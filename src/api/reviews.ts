import { apiClient } from './client';
import { Review } from '../types';

export const reviewsApi = {
  create: (data: { restaurant_id: string; rating: number; food_rating?: number; service_rating?: number; ambience_rating?: number; comment?: string; photos?: string[] }) =>
    apiClient.post<Review>('/reviews', data),
};


export async function uploadReviewPhoto(reviewId: string, uri: string) {
  const form = new FormData();
  const name = uri.split('/').pop() || 'review.jpg';
  form.append('photo', { uri, name, type: 'image/jpeg' } as any);
  return apiClient.post('/reviews/' + encodeURIComponent(reviewId) + '/photos', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}


export async function replyToReview(reviewId: string, reply: string) {
  return apiClient.patch("/reviews/" + encodeURIComponent(reviewId) + "/reply", { reply });
}
