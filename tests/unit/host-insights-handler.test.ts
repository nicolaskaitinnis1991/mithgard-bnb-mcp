import { describe, it, expect } from 'vitest';
import { hostInsightsHandler } from '../../src/tools/host-insights/handler.js';

describe('hostInsightsHandler', () => {
  it('returns a fixture with _mock=true and _pitch', async () => {
    const out = await hostInsightsHandler({ listing_id: '42', period: 'last_30d' });
    expect(out._mock).toBe(true);
    expect(out._pitch).toContain('revenue');
    expect(typeof out.occupancy_rate).toBe('number');
  });

  it('is deterministic — same input → same output', async () => {
    const a = await hostInsightsHandler({ listing_id: 'L-001', period: 'last_90d' });
    const b = await hostInsightsHandler({ listing_id: 'L-001', period: 'last_90d' });
    expect(a).toEqual(b);
  });
});
