import { describe, it, expect } from 'vitest';
import { CalendarOptimizerInput } from '../../src/tools/calendar-optimizer/schema.js';

describe('CalendarOptimizerInput', () => {
  it('accepts default horizon', () => {
    const r = CalendarOptimizerInput.parse({ listing_id: 'L-1' });
    expect(r.horizon_days).toBe(30);
  });

  it('rejects invalid horizon', () => {
    const r = CalendarOptimizerInput.safeParse({ listing_id: 'L-1', horizon_days: 45 });
    expect(r.success).toBe(false);
  });
});
