import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { User, AuthTokens } from '../types';
import { authApi } from '../api/auth';
import { registerForPushNotifications } from '../services/notifications';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens, user: User) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (tokens, user) => {
    await SecureStore.setItemAsync('access_token', tokens.access_token);
    await SecureStore.setItemAsync('refresh_token', tokens.refresh_token);
    set({ user, accessToken: tokens.access_token, refreshToken: tokens.refresh_token, isAuthenticated: true });
    registerForPushNotifications().catch(() => {});
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('access_token');
    await SecureStore.deleteItemAsync('refresh_token');
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },

  refreshTokens: async () => {
    const rt = get().refreshToken;
    if (!rt) throw new Error('No refresh token');
    const { data } = await authApi.refresh(rt);
    await SecureStore.setItemAsync('access_token', data.access_token);
    await SecureStore.setItemAsync('refresh_token', data.refresh_token);
    set({ accessToken: data.access_token, refreshToken: data.refresh_token });
  },

  loadFromStorage: async () => {
    try {
      const access = await SecureStore.getItemAsync('access_token');
      const refresh = await SecureStore.getItemAsync('refresh_token');
      if (access && refresh) {
        set({ accessToken: access, refreshToken: refresh });
        const { data: user } = await authApi.me();
        set({ user, isAuthenticated: true });
        registerForPushNotifications().catch(() => {});
      }
    } catch {
      await get().logout();
    } finally {
      set({ isLoading: false });
    }
  },
}));
