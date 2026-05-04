import { z } from 'zod';

export const CalendarOptimizerInput = z.object({
  listing_id: z.string().min(1),
  horizon_days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
});
export type CalendarOptimizerInputT = z.infer<typeof CalendarOptimizerInput>;

export const CalendarGap = z.object({
  start: z.string(),
  end: z.string(),
  nights: z.number().int().positive(),
  cost_estimate_eur: z.number(),
  suggestion: z.enum(['discount', 'min_stay_relax', 'block']),
});

export const CalendarOptimizerOutput = z.object({
  gaps: z.array(CalendarGap),
  potential_recovery_eur: z.number(),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type CalendarOptimizerOutputT = z.infer<typeof CalendarOptimizerOutput>;
