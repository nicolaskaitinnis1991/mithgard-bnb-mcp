import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createCache } from '../../src/lib/cache.js';

describe('cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', () => {
    const c = createCache<{ x: number }>({ max: 10, ttlMs: 1000 });
    c.set('a', { x: 1 });
    expect(c.get('a')).toEqual({ x: 1 });
  });
  it('expires after TTL', async () => {
    vi.useRealTimers();
    const c = createCache<{ x: number }>({ max: 10, ttlMs: 10 });
    c.set('a', { x: 1 });
    await new Promise((r) => setTimeout(r, 25));
    expect(c.get('a')).toBeUndefined();
  });
  it('evicts LRU when full', () => {
    const c = createCache<{ x: number }>({ max: 2, ttlMs: 60_000 });
    c.set('a', { x: 1 });
    c.set('b', { x: 2 });
    c.set('c', { x: 3 });
    expect(c.has('a')).toBe(false);
  });
});
