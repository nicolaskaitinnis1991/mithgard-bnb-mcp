import { z } from 'zod';
import { boundedId, isoDate } from '../../lib/validation.js';

export const HostInsightsInput = z
  .object({
    listing_id: boundedId,
    reference_date: isoDate.optional(),
    period: z.enum(['last_30d', 'last_90d', 'last_year']).default('last_30d'),
  })
  .strict();
export type HostInsightsInputT = z.infer<typeof HostInsightsInput>;

export const PricingRecommendation = z.object({
  date_range: z.string(),
  current: z.number().nonnegative(),
  suggested: z.number().nonnegative(),
  reason: z.string(),
});

export const HostInsightsOutput = z.object({
  occupancy_rate: z.number().min(0).max(1),
  reference_date: isoDate,
  revenue_eur: z.number().nonnegative(),
  competitor_avg_revenue_eur: z.number().nonnegative(),
  delta_pct: z.number(),
  pricing_recommendations: z.array(PricingRecommendation),
  insights: z.array(z.string()),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type HostInsightsOutputT = z.infer<typeof HostInsightsOutput>;
