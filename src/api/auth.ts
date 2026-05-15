import { apiClient } from './client';
import { AuthTokens, User } from '../types';

export const authApi = {
  register: (data: { name: string; lastName: string; phone: string; email: string; password: string; referralCode?: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/register', data),

  login: (data: { identifier: string; password: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/login', data),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken }),

  me: () => apiClient.get<User>('/auth/me'),

  updateMe: (data: { name?: string; lastName?: string; phone?: string; email?: string; currentPassword?: string; newPassword?: string }) =>
    apiClient.patch<any>('/auth/me', data),

  googleLogin: (data: { idToken: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/google', data),

  verifyEmail: (data: { email: string; code: string }) =>
    apiClient.post<{ user: User; tokens: AuthTokens }>('/auth/verify-email', data),

  resendCode: (email: string) =>
    apiClient.post('/auth/resend-code', { email }),

  updatePushToken: (pushToken: string) =>
    apiClient.patch('/auth/me/push-token', { pushToken }),

  getLoyalty: () =>
    apiClient.get<{ points: number; tier: string; nextTier: string | null; progress: number; referralCode: string }>('/auth/me/loyalty'),
};
