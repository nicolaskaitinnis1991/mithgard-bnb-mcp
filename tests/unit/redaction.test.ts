import { describe, expect, it } from 'vitest';
import { sanitize } from '../../src/lib/redaction.js';

describe('debug metadata redaction', () => {
  it('preserves counts, booleans, null and constrained enum metadata', () => {
    expect(
      sanitize({
        total: 4,
        approval_required: true,
        rating: null,
        _source: 'public',
        kind: 'RateLimited',
        sentiment: 'positive',
      }),
    ).toEqual({
      total: 4,
      approval_required: true,
      rating: null,
      _source: 'public',
      kind: 'RateLimited',
      sentiment: 'positive',
    });
    expect(sanitize(undefined)).toBeUndefined();
  });

  it('redacts raw and derived guest text at every depth', () => {
    const secret = 'Guest medical appointment and private address';
    const input = {
      last_message: secret,
      trip: { reason: secret },
      suggestions: [{ tone: 'friendly', text: secret }],
      draft: secret,
      brief: secret,
      checklist: [secret],
      _pitch: secret,
    };
    const sanitized = sanitize(input);
    expect(JSON.stringify(sanitized)).not.toContain(secret);
    expect(sanitized).toMatchObject({
      last_message: '[REDACTED]',
      trip: { reason: '[REDACTED]' },
      suggestions: [{ tone: 'friendly', text: '[REDACTED]' }],
      draft: '[REDACTED]',
      brief: '[REDACTED]',
      checklist: ['[REDACTED]'],
    });
  });

  it('redacts identifiers and contact fields even when numeric or nested', () => {
    expect(
      sanitize({
        listing_id: 12345,
        phone: 5551234567,
        email: 'guest@example.test',
        host_name: 'Private Host',
        guest_name: 'Private Guest',
      }),
    ).toEqual({
      listing_id: '[REDACTED]',
      phone: '[REDACTED]',
      email: '[REDACTED]',
      host_name: '[REDACTED]',
      guest_name: '[REDACTED]',
    });
  });

  it('does not expose secrets embedded in arbitrary field names or enum-shaped values', () => {
    const output = sanitize({
      'secret-token-in-key': 'secret-token-in-value',
      status: 'private-status',
      title: 'public',
    });
    expect(output).toEqual({ status: '[REDACTED]', title: '[REDACTED]', _redacted_fields: 1 });
    expect(JSON.stringify(output)).not.toContain('secret-token');
  });

  it('bounds deep and circular structures', () => {
    const circular: { results?: unknown } = {};
    circular.results = circular;
    expect(JSON.stringify(sanitize(circular))).toContain('[DEPTH_LIMIT]');
  });

  it('bounds large arrays and rejects non-JSON primitive values', () => {
    const result = sanitize(Array.from({ length: 110 }, () => 'private-message'));
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(101);
    expect(JSON.stringify(result)).toContain('[TRUNCATED 10 ITEMS]');
    expect(sanitize(Infinity)).toBe('[REDACTED]');
    expect(sanitize(1n)).toBe('[REDACTED]');
  });
});
