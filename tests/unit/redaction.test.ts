import { describe, it, expect } from 'vitest';
import { sanitize } from '../../src/lib/redaction.js';

describe('sanitize', () => {
  it('redacts top-level email field', () => {
    expect(sanitize({ email: 'a@b.c', other: 'keep' })).toEqual({
      email: '[REDACTED]',
      other: 'keep',
    });
  });

  it('redacts nested email field', () => {
    expect(sanitize({ user: { email: 'a@b.c', id: 42 } })).toEqual({
      user: { email: '[REDACTED]', id: 42 },
    });
  });

  it('redacts email in array of objects', () => {
    expect(sanitize([{ email: 'x@y.z' }, { email: 'p@q.r', kept: true }])).toEqual([
      { email: '[REDACTED]' },
      { email: '[REDACTED]', kept: true },
    ]);
  });

  it('preserves non-sensitive fields unchanged', () => {
    const input = { listing_id: '123', price: 99, available: true, tags: ['a', 'b'] };
    expect(sanitize(input)).toEqual(input);
  });

  it('returns primitives as-is', () => {
    expect(sanitize('hello')).toBe('hello');
    expect(sanitize(42)).toBe(42);
    expect(sanitize(true)).toBe(true);
    expect(sanitize(null)).toBe(null);
    expect(sanitize(undefined)).toBe(undefined);
  });

  it('redacts all known sensitive keys', () => {
    const input = {
      email: 'e',
      phone: 'p',
      review_text: 'rt',
      last_message: 'lm',
      host_name: 'hn',
      guest_name: 'gn',
      message_text: 'mt',
    };
    const out = sanitize(input) as Record<string, unknown>;
    for (const k of Object.keys(input)) {
      expect(out[k]).toBe('[REDACTED]');
    }
  });

  it('matches keys case-insensitively', () => {
    expect(sanitize({ Email: 'a@b.c', PHONE: '+1' })).toEqual({
      Email: '[REDACTED]',
      PHONE: '[REDACTED]',
    });
  });

  it('hits depth limit on very deep nesting', () => {
    // Build an 11-deep object: { a: { a: { ... } } }
    let deep: Record<string, unknown> = { leaf: 'bottom' };
    for (let i = 0; i < 11; i++) deep = { a: deep };
    const out = JSON.stringify(sanitize(deep));
    expect(out).toContain('[DEPTH_LIMIT]');
  });
});
