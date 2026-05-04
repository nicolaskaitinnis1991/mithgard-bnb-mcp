import { describe, it, expect } from 'vitest';
import { turnoverHandler } from '../../src/tools/turnover-coordinator/handler.js';

describe('turnoverHandler', () => {
  it('returns 8-item checklist, brief, crew message, and duration', async () => {
    const out = await turnoverHandler({
      listing_id: 'L-A',
      checkout_at: '2026-06-12T11:00:00Z',
      checkin_at: '2026-06-12T15:00:00Z',
    });
    expect(out._mock).toBe(true);
    expect(out.checklist).toHaveLength(8);
    expect([90, 120, 150]).toContain(out.estimated_duration_min);
    expect(out.brief).toContain('L-A');
    expect(out.crew_message_draft).toContain('L-A');
  });

  it('is deterministic per listing+cleaner', async () => {
    const a = await turnoverHandler({
      listing_id: 'L-X',
      checkout_at: '2026-06-12T11:00:00Z',
      checkin_at: '2026-06-12T15:00:00Z',
      cleaner_id: 'erin',
    });
    const b = await turnoverHandler({
      listing_id: 'L-X',
      checkout_at: '2026-06-12T11:00:00Z',
      checkin_at: '2026-06-12T15:00:00Z',
      cleaner_id: 'erin',
    });
    expect(a).toEqual(b);
  });
});
