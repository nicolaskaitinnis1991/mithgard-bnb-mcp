import { z } from 'zod';

import { boundedId, isoDate } from '../../lib/validation.js';

export const SmartPricingInput = z
  .object({
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
  });
export type SmartPricingInputT = z.infer<typeof SmartPricingInput>;

export const DailyPrice = z.object({
  date: isoDate,
  suggested: z.number().nonnegative(),
  current: z.number().nonnegative().optional(),
  delta_pct: z.number().optional(),
  reasons: z.array(z.string()),
});

export const SmartPricingOutput = z.object({
  daily_prices: z.array(DailyPrice),
  currency: z.literal('EUR'),
  estimate_basis: z.literal('all_nights_booked_before_fees'),
  summary: z.object({
    avg_suggested: z.number().nonnegative(),
    total_revenue_estimate: z.number().nonnegative(),
  }),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type SmartPricingOutputT = z.infer<typeof SmartPricingOutput>;
