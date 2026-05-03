import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  max: number;
  ttlMs: number;
}
export interface ICache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
}

export const createCache = <V extends object>(opts: CacheOptions): ICache<V> => {
  const lru = new LRUCache<string, V>({ max: opts.max, ttl: opts.ttlMs });
  return {
    get: (k) => lru.get(k),
    set: (k, v) => {
      lru.set(k, v);
    },
    has: (k) => lru.has(k),
    clear: () => {
      lru.clear();
    },
    size: () => lru.size,
  };
};
