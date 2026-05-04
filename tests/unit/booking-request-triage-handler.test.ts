import { describe, it, expect } from 'vitest';
import { bookingTriageHandler } from '../../src/tools/booking-request-triage/handler.js';

describe('bookingTriageHandler', () => {
  it('low risk for old verified guest with reviews', async () => {
    const out = await bookingTriageHandler({
      thread_id: 't',
      guest_profile: { joined: '2018-01-01', reviews: 12, rating: 4.95, verified: true },
      trip: { adults: 2, children: 0, pets: false, nights: 4, reason: 'birthday weekend trip' },
    });
    expect(out._mock).toBe(true);
    expect(out.recommendation).toBe('auto_accept');
    expect(out.green_flags.length).toBeGreaterThan(0);
  });

  it('high risk for new unverified guest single night', async () => {
    const out = await bookingTriageHandler({
      thread_id: 't',
      guest_profile: { joined: '2026-04-15', reviews: 0, verified: false },
      trip: { adults: 4, children: 0, pets: false, nights: 1 },
    });
    expect(out.recommendation).toBe('auto_decline');
    expect(out.red_flags.length).toBeGreaterThan(0);
  });
});
