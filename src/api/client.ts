import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '../constants';

let getAuthState: (() => { accessToken: string | null; refreshTokens: () => Promise<void>; logout: () => Promise<void> }) | null = null;

export function setAuthStateGetter(fn: typeof getAuthState) {
  getAuthState = fn;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAuthState?.().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry && !original.url?.includes('auth/refresh') && getAuthState) {
      original._retry = true;
      try {
        await getAuthState().refreshTokens();
        const newToken = getAuthState().accessToken;
        if (original.headers) original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch {
        await getAuthState().logout();
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  },
);
