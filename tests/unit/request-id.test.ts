import { describe, it, expect } from 'vitest';
import { newRequestId } from '../../src/lib/request-id.js';

describe('newRequestId', () => {
  it('returns 16-char hex', () => {
    const id = newRequestId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });
  it('returns unique values', () => {
    const a = newRequestId();
    const b = newRequestId();
    expect(a).not.toBe(b);
  });
});
