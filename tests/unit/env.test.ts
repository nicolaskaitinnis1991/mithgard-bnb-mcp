import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('loadEnv', () => {
  it('uses defaults for missing vars', () => {
    const e = loadEnv({});
    expect(e.LOG_LEVEL).toBe('info');
    expect(e.CACHE_TTL_SEARCH_MS).toBe(900_000);
  });
  it('coerces numeric strings', () => {
    const e = loadEnv({ HTTP_RATE_PER_SEC: '5' });
    expect(e.HTTP_RATE_PER_SEC).toBe(5);
  });
  it('rejects invalid LOG_LEVEL', () => {
    expect(() => loadEnv({ LOG_LEVEL: 'banana' })).toThrow();
  });
  it('[OPS] rejects nonfinite, fractional and oversized resource budgets before allocation', () => {
    const invalid = [
      { CACHE_MAX_SEARCH: '1000000000' },
      { CACHE_MAX_LISTING: '10001' },
      { CACHE_TTL_SEARCH_MS: '1000000000000000' },
      { CACHE_TTL_LISTING_MS: '86400001' },
      { CACHE_MAX_BYTES_SEARCH: 'Infinity' },
      { CACHE_MAX_BYTES_LISTING: '67108865' },
      { CACHE_MAX_SEARCH: '1.5' },
      { HTTP_MAX_QUEUE_SIZE: '10001' },
      { HTTP_TIMEOUT_MS: '300001' },
    ];
    for (const raw of invalid) expect(() => loadEnv(raw)).toThrow();
    expect(loadEnv({})).toMatchObject({
      CACHE_MAX_BYTES_SEARCH: 16_777_216,
      CACHE_MAX_BYTES_LISTING: 16_777_216,
    });
  });
});
