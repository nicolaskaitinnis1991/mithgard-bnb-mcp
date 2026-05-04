import { describe, it, expect } from 'vitest';
import { calendarOptimizerHandler } from '../../src/tools/calendar-optimizer/handler.js';

describe('calendarOptimizerHandler', () => {
  it('returns 3-5 gaps with positive cost and a suggestion', async () => {
    const out = await calendarOptimizerHandler({ listing_id: 'L-A', horizon_days: 30 });
    expect(out._mock).toBe(true);
    expect(out.gaps.length).toBeGreaterThanOrEqual(3);
    expect(out.gaps.length).toBeLessThanOrEqual(5);
    for (const g of out.gaps) {
      expect(g.cost_estimate_eur).toBeGreaterThan(0);
      expect(['discount', 'min_stay_relax', 'block']).toContain(g.suggestion);
    }
  });

  it('is deterministic for same input', async () => {
    const a = await calendarOptimizerHandler({ listing_id: 'L-X', horizon_days: 60 });
    const b = await calendarOptimizerHandler({ listing_id: 'L-X', horizon_days: 60 });
    expect(a).toEqual(b);
  });
});
