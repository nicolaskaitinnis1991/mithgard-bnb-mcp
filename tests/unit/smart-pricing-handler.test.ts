import { describe, it, expect } from 'vitest';
import { smartPricingHandler } from '../../src/tools/smart-pricing/handler.js';

describe('smartPricingHandler', () => {
  it('returns one entry per day with reasons and _mock=true', async () => {
    const out = await smartPricingHandler({
      listing_id: 'L-A',
      from: '2026-06-01',
      to: '2026-06-07',
    });
    expect(out._mock).toBe(true);
    expect(out.daily_prices).toHaveLength(7);
    for (const d of out.daily_prices) {
      expect(d.reasons.length).toBeGreaterThan(0);
      expect(d.suggested).toBeGreaterThan(0);
    }
    expect(out.summary.total_revenue_estimate).toBeGreaterThan(0);
  });

  it('caps horizon at 30 days', async () => {
    const out = await smartPricingHandler({
      listing_id: 'L-A',
      from: '2026-06-01',
      to: '2026-12-31',
    });
    expect(out.daily_prices).toHaveLength(30);
  });

  it('is deterministic — same input → same prices', async () => {
    const a = await smartPricingHandler({
      listing_id: 'L-X',
      from: '2026-07-01',
      to: '2026-07-05',
    });
    const b = await smartPricingHandler({
      listing_id: 'L-X',
      from: '2026-07-01',
      to: '2026-07-05',
    });
    expect(a).toEqual(b);
  });
});
