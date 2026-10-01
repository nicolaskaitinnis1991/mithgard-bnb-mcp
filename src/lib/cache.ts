import { LRUCache } from 'lru-cache';

export interface CacheOptions {
  max: number;
  ttlMs: number;
  /** Budget for retained serialized values and keys, measured in UTF8 bytes. */
  maxBytes?: number;
}
export interface CacheStatus {
  entries: number;
  bytes: number;
  max_entries: number;
  max_bytes: number;
  ttl_ms: number;
  rejected_entries: number;
}
export interface ICache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): void;
  has(key: string): boolean;
  clear(): void;
  size(): number;
  status(): CacheStatus;
}

const bounded = (value: number, maximum: number) =>
  Number.isSafeInteger(value) && value >= 1 && value <= maximum;

export const createCache = <V extends object>(opts: CacheOptions): ICache<V> => {
  const maxBytes = opts.maxBytes ?? 16_777_216;
  if (
    !bounded(opts.max, 10_000) ||
    !bounded(opts.ttlMs, 86_400_000) ||
    !bounded(maxBytes, 67_108_864)
  ) {
    throw new Error('Invalid cache limits');
  }
  // Store serialized copies: mutable callers cannot enlarge retained values
  // after admission. Byte accounting is storage payload, not a heap/RSS SLA.
  const lru = new LRUCache<string, string>({
    max: opts.max,
    ttl: opts.ttlMs,
    ttlAutopurge: true,
    ttlResolution: 0,
    maxSize: maxBytes,
    sizeCalculation: (value, key) =>
      Buffer.byteLength(value, 'utf8') + Buffer.byteLength(key, 'utf8'),
  });
  let rejectedEntries = 0;
  const purge = () => {
    lru.purgeStale();
  };
  return {
    get: (key) => {
      const encoded = lru.get(key);
      return encoded === undefined ? undefined : (JSON.parse(encoded) as V);
    },
    set: (key, value) => {
      try {
        const encoded: unknown = JSON.stringify(value);
        if (
          typeof encoded !== 'string' ||
          (!encoded.startsWith('{') && !encoded.startsWith('[')) ||
          Buffer.byteLength(encoded, 'utf8') + Buffer.byteLength(key, 'utf8') > maxBytes
        ) {
          rejectedEntries++;
          // A failed replacement must not retain stale data under the same key.
          lru.delete(key);
          return;
        }
        lru.set(key, encoded);
      } catch {
        rejectedEntries++;
        lru.delete(key);
      }
    },
    has: (k) => lru.has(k),
    clear: () => {
      lru.clear();
    },
    size: () => {
      purge();
      return lru.size;
    },
    status: () => {
      purge();
      return {
        entries: lru.size,
        bytes: lru.calculatedSize,
        max_entries: opts.max,
        max_bytes: maxBytes,
        ttl_ms: opts.ttlMs,
        rejected_entries: rejectedEntries,
      };
    },
  };
};
