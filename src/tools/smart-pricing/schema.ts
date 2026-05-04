import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const SmartPricingInput = z.object({
  listing_id: z.string().min(1),
  from: z.string().regex(ISO_DATE),
  to: z.string().regex(ISO_DATE),
});
export type SmartPricingInputT = z.infer<typeof SmartPricingInput>;

export const DailyPrice = z.object({
  date: z.string(),
  suggested: z.number(),
  current: z.number().optional(),
  delta_pct: z.number().optional(),
  reasons: z.array(z.string()),
});

export const SmartPricingOutput = z.object({
  daily_prices: z.array(DailyPrice),
  summary: z.object({
    avg_suggested: z.number(),
    total_revenue_estimate: z.number(),
  }),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type SmartPricingOutputT = z.infer<typeof SmartPricingOutput>;
