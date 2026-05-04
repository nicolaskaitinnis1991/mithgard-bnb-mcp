import type {
  CalendarOptimizerInputT,
  CalendarOptimizerOutputT,
} from '../tools/calendar-optimizer/schema.js';
import { fnv1a } from './hash.js';

export const CALENDAR_OPTIMIZER_PITCH =
  'Surfaces calendar gaps and concrete actions to recover lost nights';

const TODAY = '2026-05-03';

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const SUGGESTIONS: ('discount' | 'min_stay_relax' | 'block')[] = [
  'discount',
  'min_stay_relax',
  'discount',
  'block',
  'min_stay_relax',
];

export const computeCalendar = (input: CalendarOptimizerInputT): CalendarOptimizerOutputT => {
  const seed = fnv1a(`${input.listing_id}:${String(input.horizon_days)}`);
  const numGaps = 3 + (seed % 3); // 3..5 gaps

  const gaps: CalendarOptimizerOutputT['gaps'] = [];
  let recovery = 0;
  // distribute gaps across horizon
  const stride = Math.floor(input.horizon_days / (numGaps + 1));

  for (let i = 0; i < numGaps; i++) {
    const offset = stride * (i + 1) + ((seed >> (i * 3)) & 0x07);
    const nights = 1 + ((seed >> (i * 5)) & 0x03); // 1..4 nights
    const start = addDays(TODAY, offset);
    const end = addDays(start, nights);
    const nightlyEstimate = 90 + ((seed >> (i * 7)) & 0x1f); // 90..121
    const cost = nights * nightlyEstimate;
    recovery += cost;
    const suggestion = SUGGESTIONS[i % SUGGESTIONS.length] ?? 'discount';
    gaps.push({ start, end, nights, cost_estimate_eur: cost, suggestion });
  }

  return {
    gaps,
    potential_recovery_eur: recovery,
    _mock: true,
    _pitch: CALENDAR_OPTIMIZER_PITCH,
  };
};
