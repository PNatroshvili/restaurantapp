const store = new Map<string, { data: any; ts: number }>();
const TTL = 5 * 60 * 1000; // 5 minutes

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) { store.delete(key); return null; }
  return entry.data as T;
}

export function cacheSet(key: string, data: any) {
  store.set(key, { data, ts: Date.now() });
}

export function cacheClear(prefix?: string) {
  if (!prefix) { store.clear(); return; }
  store.forEach((_, key) => { if (key.startsWith(prefix)) store.delete(key); });
}

export async function cachedFetch<T>(key: string, fetcher: () => Promise<T>, ttl = TTL): Promise<T> {
  const cached = store.get(key);
  if (cached && Date.now() - cached.ts < ttl) return cached.data as T;
  const data = await fetcher();
  store.set(key, { data, ts: Date.now() });
  return data;
}
