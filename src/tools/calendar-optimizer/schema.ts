import { z } from 'zod';
import {
  CalendarData,
  ResultFields,
  validateMode,
  validateResult,
} from '../../host-data/contracts.js';
import { boundedId, isoDate } from '../../lib/validation.js';

export const CalendarOptimizerInput = z
  .object({
    mode: z.enum(['demo', 'provided']).optional(),
    host_data: CalendarData.optional(),
    listing_id: boundedId,
    reference_date: isoDate.optional(),
    horizon_days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30),
  })
  .strict()
  .superRefine(validateMode);
export type CalendarOptimizerInputT = z.infer<typeof CalendarOptimizerInput>;

export const CalendarGap = z.object({
  start: isoDate,
  end: isoDate,
  nights: z.number().int().positive(),
  cost_estimate_eur: z.number().nonnegative().nullable(),
  opportunity_amount: z.number().nonnegative().nullable().optional(),
  gap_kind: z.enum(['orphan_gap', 'open_run']).optional(),
  min_stay_conflict: z.boolean().nullable().optional(),
  suggestion: z.enum(['discount', 'min_stay_relax', 'block', 'review', 'none']),
});

export const CalendarOptimizerOutput = z
  .object({
    gaps: z.array(CalendarGap),
    reference_date: isoDate,
    potential_recovery_eur: z.number().nonnegative().nullable(),
    opportunity_total: z.number().nonnegative().nullable().optional(),
    unknown_dates: z.array(z.string()).optional(),
    estimate_basis: z.string().optional(),
    ...ResultFields,
  })
  .superRefine(validateResult);
export type CalendarOptimizerOutputT = z.infer<typeof CalendarOptimizerOutput>;
