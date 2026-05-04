import { describe, it, expect } from 'vitest';
import { SmartPricingInput } from '../../src/tools/smart-pricing/schema.js';

describe('SmartPricingInput', () => {
  it('accepts valid ISO date range', () => {
    const r = SmartPricingInput.parse({
      listing_id: 'L-1',
      from: '2026-06-01',
      to: '2026-06-14',
    });
    expect(r.listing_id).toBe('L-1');
  });

  it('rejects malformed date', () => {
    const r = SmartPricingInput.safeParse({
      listing_id: 'L-1',
      from: '06/01/2026',
      to: '2026-06-14',
    });
    expect(r.success).toBe(false);
  });
});
