import { apiClient } from './client';
import { AuthTokens, User } from '../types';

export const authApi = {
  register: (data: { name: string; phone?: string; email?: string; password: string; referralCode?: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/register', data),

  login: (data: { identifier: string; password: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken }),

  me: () => apiClient.get<User>('/auth/me'),

  updateMe: (data: { name?: string; phone?: string }) =>
    apiClient.patch<User>('/auth/me', data),

  googleLogin: (data: { idToken: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/google', data),

  updatePushToken: (pushToken: string) =>
    apiClient.patch('/auth/me/push-token', { pushToken }),

  getLoyalty: () =>
    apiClient.get<{ points: number; tier: string; nextTier: string | null; progress: number; referralCode: string }>('/auth/me/loyalty'),
};
