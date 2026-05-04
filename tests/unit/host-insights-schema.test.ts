import { describe, it, expect } from 'vitest';
import { HostInsightsInput } from '../../src/tools/host-insights/schema.js';

describe('HostInsightsInput', () => {
  it('accepts a valid listing_id and defaults period', () => {
    const r = HostInsightsInput.parse({ listing_id: '12345' });
    expect(r.listing_id).toBe('12345');
    expect(r.period).toBe('last_30d');
  });

  it('rejects empty listing_id', () => {
    const r = HostInsightsInput.safeParse({ listing_id: '' });
    expect(r.success).toBe(false);
  });
});
