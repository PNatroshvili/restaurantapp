import { apiClient } from './client';
import { PaginatedResponse, Restaurant, MenuCategory, Review, Cuisine, MenuItem, WorkingHour, RestaurantPhoto, RestaurantOffer } from '../types';

export interface RestaurantFilters {
  city?: string;
  district?: string;
  cuisine_id?: string;
  min_rating?: number;
  max_price?: number;
  is_open?: boolean;
  has_booking?: boolean;
  offers?: boolean;
  q?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  sort?: 'rating' | 'name' | 'discount' | 'distance';
  page?: number;
  limit?: number;
}

export const restaurantsApi = {
  getAll: (filters?: RestaurantFilters) =>
    apiClient.get<PaginatedResponse<Restaurant>>('/restaurants', { params: filters }),

  getNearby: (lat: number, lng: number, radius = 2000) =>
    apiClient.get<Restaurant[]>('/restaurants/nearby', { params: { lat, lng, radius } }),

  getById: (id: string) => apiClient.get<Restaurant>(`/restaurants/${id}`),

  getMenu: (id: string) => apiClient.get<MenuCategory[]>(`/restaurants/${id}/menu`),

  getReviews: (id: string, page = 1) =>
    apiClient.get<PaginatedResponse<Review>>('/reviews', { params: { restaurant_id: id, page } }),

  getRecommended: (limit = 12) => apiClient.get<Restaurant[]>('/restaurants/recommended', { params: { limit } }),
  getRecommendedForUser: (limit = 12) => apiClient.get<Restaurant[]>('/restaurants/recommended/me', { params: { limit } }),
  getOffers: (id?: string, date?: string, time?: string, guests = 1) =>
    apiClient.get<RestaurantOffer[]>('/offers', { params: { restaurant_id: id, date, time, guests } }),
  getCollections: () => apiClient.get<{ id:string; titleKa:string; subtitle?:string|null; emoji:string; accent:string; bg:string; filterType:string; filterValue?:string|null; isActive:boolean; sortOrder:number }[]>('/collections'),

  addFavorite: (restaurantId: string) => apiClient.post(`/favorites`, { restaurant_id: restaurantId }),
  removeFavorite: (restaurantId: string) => apiClient.delete(`/favorites/${restaurantId}`),
  getFavorites: () => apiClient.get<Restaurant[]>('/favorites'),
};

export const cuisinesApi = {
  getAll: () => apiClient.get<Cuisine[]>('/cuisines'),
};

// ── Manager API ────────────────────────────────────────────────────────────

export const managerApi = {
  getMyRestaurant: () =>
    apiClient.get<Restaurant>('/restaurants/mine'),
  getTables: (restaurantId: string) => apiClient.get<RestaurantTable[]>('/restaurants/' + encodeURIComponent(restaurantId) + '/tables'),
  createTable: (restaurantId: string, data: Partial<RestaurantTable> & { name: string; capacity: number }) => apiClient.post<RestaurantTable>('/restaurants/' + encodeURIComponent(restaurantId) + '/tables', data),
  updateTable: (id: string, data: Partial<RestaurantTable>) => apiClient.patch<RestaurantTable>('/restaurants/tables/' + encodeURIComponent(id), data),
  deleteTable: (id: string) => apiClient.delete('/restaurants/tables/' + encodeURIComponent(id)),
  getAnalytics: () => apiClient.get<{ totalBookings:number; todayBookings:number; confirmedBookings:number; cancelledBookings:number; guests:number; ratingAvg:number; reviewsCount:number; daily:{date:string;bookings:number;guests:number}[] }>('/restaurants/mine/analytics'),

  updateInfo: (id: string, data: {
    name?: string; description?: string; address?: string;
    city?: string; district?: string; phone?: string;
  }) => apiClient.patch<Restaurant>(`/restaurants/${id}/info`, data),

  updateDiscount: (id: string, discountPercent: number) =>
    apiClient.patch<Restaurant>(`/restaurants/${id}/discount`, { discountPercent }),

  updateWorkingHours: (id: string, hours: WorkingHour[]) =>
    apiClient.put<WorkingHour[]>(`/restaurants/${id}/working-hours`, { hours }),

  // menu categories
  addCategory: (id: string, name: string) =>
    apiClient.post<MenuCategory>(`/restaurants/${id}/menu-categories`, { name }),

  updateCategory: (id: string, catId: string, name: string) =>
    apiClient.patch<MenuCategory>(`/restaurants/${id}/menu-categories/${catId}`, { name }),

  deleteCategory: (id: string, catId: string) =>
    apiClient.delete(`/restaurants/${id}/menu-categories/${catId}`),

  // menu items
  addItem: (id: string, catId: string, data: {
    name: string; description?: string; price: number; isAvailable?: boolean;
  }, photoUri?: string) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => form.append(k, String(v)));
    if (photoUri) {
      const name = photoUri.split('/').pop() || 'photo.jpg';
      form.append('photo', { uri: photoUri, name, type: 'image/jpeg' } as any);
    }
    return apiClient.post<MenuItem>(`/restaurants/${id}/menu-categories/${catId}/items`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updateItem: (id: string, itemId: string, data: {
    name?: string; description?: string; price?: number; isAvailable?: boolean;
  }, photoUri?: string) => {
    const form = new FormData();
    Object.entries(data).forEach(([k, v]) => form.append(k, String(v)));
    if (photoUri) {
      const name = photoUri.split('/').pop() || 'photo.jpg';
      form.append('photo', { uri: photoUri, name, type: 'image/jpeg' } as any);
    }
    return apiClient.patch<MenuItem>(`/restaurants/${id}/menu-items/${itemId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteItem: (id: string, itemId: string) =>
    apiClient.delete(`/restaurants/${id}/menu-items/${itemId}`),

  // waitlist
  getWaitlist: (restaurantId: string) => apiClient.get<any[]>('/waitlist/restaurant/' + encodeURIComponent(restaurantId)),
  updateWaitlistStatus: (id: string, status: string) => apiClient.patch<any>('/waitlist/' + encodeURIComponent(id) + '/status', { status }),

  // offers
  getOffers: () => apiClient.get<RestaurantOffer[]>('/offers/mine'),
  createOffer: (restaurantId: string, data: Partial<RestaurantOffer> & { title: string }) =>
    apiClient.post<RestaurantOffer>(`/offers/${restaurantId}`, data),
  updateOffer: (id: string, data: Partial<RestaurantOffer>) =>
    apiClient.patch<RestaurantOffer>(`/offers/${id}`, data),
  deleteOffer: (id: string) => apiClient.delete(`/offers/${id}`),

  // photos
  uploadPhoto: (id: string, photoUri: string, isCover = false) => {
    const form = new FormData();
    const name = photoUri.split('/').pop() || 'photo.jpg';
    form.append('photo', { uri: photoUri, name, type: 'image/jpeg' } as any);
    form.append('isCover', String(isCover));
    return apiClient.post<RestaurantPhoto>(`/restaurants/${id}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  setCoverPhoto: (id: string, photoId: string) =>
    apiClient.patch<RestaurantPhoto>(`/restaurants/${id}/photos/${photoId}/cover`, {}),

  deletePhoto: (id: string, photoId: string) =>
    apiClient.delete(`/restaurants/${id}/photos/${photoId}`),
};
