import AsyncStorage from '@react-native-async-storage/async-storage';
import { Restaurant } from '../types';

const KEY = 'recently_viewed_v1';
const MAX = 20;

export async function trackView(restaurant: Restaurant): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list: Restaurant[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(r => r.id !== restaurant.id);
    const updated = [restaurant, ...filtered].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function getRecentlyViewed(): Promise<Restaurant[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearRecentlyViewed(): Promise<void> {
  try { await AsyncStorage.removeItem(KEY); } catch {}
}
