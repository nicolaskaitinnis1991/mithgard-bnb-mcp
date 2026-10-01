import { z } from 'zod';
import { boundedId, isoDate } from '../../lib/validation.js';

export const CalendarOptimizerInput = z
  .object({
    listing_id: boundedId,
    reference_date: isoDate.optional(),
    horizon_days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
  })
  .strict();
export type CalendarOptimizerInputT = z.infer<typeof CalendarOptimizerInput>;

export const CalendarGap = z.object({
  start: isoDate,
  end: isoDate,
  nights: z.number().int().positive(),
  cost_estimate_eur: z.number().nonnegative(),
  suggestion: z.enum(['discount', 'min_stay_relax', 'block']),
});

export const CalendarOptimizerOutput = z.object({
  gaps: z.array(CalendarGap),
  reference_date: isoDate,
  potential_recovery_eur: z.number().nonnegative(),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type CalendarOptimizerOutputT = z.infer<typeof CalendarOptimizerOutput>;
