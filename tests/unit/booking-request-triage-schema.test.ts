import { describe, it, expect } from 'vitest';
import { BookingTriageInput } from '../../src/tools/booking-request-triage/schema.js';

describe('BookingTriageInput', () => {
  it('accepts a valid request', () => {
    const r = BookingTriageInput.parse({
      thread_id: 't1',
      guest_profile: { joined: '2020-01-01', reviews: 7, verified: true },
      trip: { adults: 2, children: 0, pets: false, nights: 4 },
    });
    expect(r.guest_profile.reviews).toBe(7);
  });

  it('rejects malformed joined date', () => {
    const r = BookingTriageInput.safeParse({
      thread_id: 't1',
      guest_profile: { joined: '2020', reviews: 0, verified: false },
      trip: { adults: 1, children: 0, pets: false, nights: 1 },
    });
    expect(r.success).toBe(false);
  });
});
