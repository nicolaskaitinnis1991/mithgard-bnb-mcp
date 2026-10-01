import { z } from 'zod';
import {
  PricingData,
  ResultFields,
  validateMode,
  validateResult,
} from '../../host-data/contracts.js';

import { boundedId, isoDate } from '../../lib/validation.js';

export const SmartPricingInput = z
  .object({
    mode: z.enum(['demo', 'provided']).optional(),
    host_data: PricingData.optional(),
    listing_id: boundedId,
    from: isoDate,
    to: isoDate,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.to < value.from)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'to must be on or after from',
      });
    const span = (Date.parse(value.to) - Date.parse(value.from)) / 86400000 + 1;
    if (span > 30)
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['to'],
        message: 'Pricing horizon cannot exceed 30 days',
      });
  })
  .superRefine(validateMode);
export type SmartPricingInputT = z.infer<typeof SmartPricingInput>;

export const DailyPrice = z.object({
  date: isoDate,
  suggested: z.number().nonnegative(),
  current: z.number().nonnegative().optional(),
  delta_pct: z.number().optional(),
  reasons: z.array(z.string()),
});

export const SmartPricingOutput = z
  .object({
    daily_prices: z.array(DailyPrice),
    currency: z.string(),
    skipped_dates: z.array(z.object({ date: z.string(), reason: z.string() })).optional(),
    estimate_basis: z.literal('all_nights_booked_before_fees'),
    summary: z.object({
      avg_suggested: z.number().nonnegative().nullable(),
      total_revenue_estimate: z.number().nonnegative(),
    }),
    ...ResultFields,
  })
  .superRefine(validateResult);
export type SmartPricingOutputT = z.infer<typeof SmartPricingOutput>;
