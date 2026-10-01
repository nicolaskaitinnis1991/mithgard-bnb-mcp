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

  it('[OPS] bounds UTF8 value and key bytes, evicts by bytes and rejects an oversized replacement', () => {
    const c = createCache<{ text: string }>({ max: 10, ttlMs: 1000, maxBytes: 50 });
    c.set('ä', { text: '😀' });
    const bytes =
      Buffer.byteLength('ä', 'utf8') + Buffer.byteLength(JSON.stringify({ text: '😀' }), 'utf8');
    expect(c.status()).toMatchObject({ entries: 1, bytes, max_bytes: 50 });
    c.set('second', { text: 'x'.repeat(20) });
    expect(c.has('ä')).toBe(false);
    expect(c.status().bytes).toBeLessThanOrEqual(50);
    c.set('second', { text: 'x'.repeat(100) });
    expect(c.status()).toMatchObject({ entries: 0, bytes: 0, rejected_entries: 1 });
  });

  it('[OPS] stores isolated copies so callers cannot bypass the byte budget through mutations', () => {
    const c = createCache<{ text: string }>({ max: 10, ttlMs: 1000, maxBytes: 50 });
    const original = { text: 'small' };
    c.set('a', original);
    original.text = 'x'.repeat(1000);
    const copy = c.get('a');
    expect(copy).toEqual({ text: 'small' });
    if (copy) copy.text = 'y'.repeat(1000);
    expect(c.get('a')).toEqual({ text: 'small' });
    expect(c.status().bytes).toBeLessThanOrEqual(50);
    c.clear();
    expect(c.status()).toMatchObject({ entries: 0, bytes: 0 });
  });

  it('[OPS] purges expired entries from idle cache counts without reading the key', async () => {
    vi.useRealTimers();
    const c = createCache<{ x: number }>({ max: 10, ttlMs: 10 });
    c.set('a', { x: 1 });
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(c.size()).toBe(0);
    expect(c.status()).toMatchObject({ entries: 0, bytes: 0 });
  });

  it('[OPS] rejects unsafe cache allocation limits and discards unserializable values safely', () => {
    for (const options of [
      { max: 1_000_000_000, ttlMs: 1000 },
      { max: 1, ttlMs: 1e15 },
      { max: 1, ttlMs: 1000, maxBytes: Infinity },
    ]) {
      expect(() => createCache(options)).toThrow('Invalid cache limits');
    }
    const c = createCache<object>({ max: 1, ttlMs: 1000 });
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    c.set('a', cyclic);
    expect(c.status()).toMatchObject({ entries: 0, rejected_entries: 1 });
  });
});
