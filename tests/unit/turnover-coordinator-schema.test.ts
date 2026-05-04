import { describe, it, expect } from 'vitest';
import { TurnoverInput } from '../../src/tools/turnover-coordinator/schema.js';

describe('TurnoverInput', () => {
  it('accepts ISO datetime input', () => {
    const r = TurnoverInput.parse({
      listing_id: 'L-1',
      checkout_at: '2026-06-12T11:00:00Z',
      checkin_at: '2026-06-12T15:00:00Z',
    });
    expect(r.listing_id).toBe('L-1');
  });

  it('rejects malformed datetime', () => {
    const r = TurnoverInput.safeParse({
      listing_id: 'L-1',
      checkout_at: 'tomorrow',
      checkin_at: '2026-06-12T15:00:00Z',
    });
    expect(r.success).toBe(false);
  });
});
