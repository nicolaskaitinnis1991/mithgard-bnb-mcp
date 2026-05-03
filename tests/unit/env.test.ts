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
});
