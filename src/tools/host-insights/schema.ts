import { z } from 'zod';

export const HostInsightsInput = z.object({
  listing_id: z.string().min(1),
  period: z.enum(['last_30d', 'last_90d', 'last_year']).default('last_30d'),
});
export type HostInsightsInputT = z.infer<typeof HostInsightsInput>;

export const PricingRecommendation = z.object({
  date_range: z.string(),
  current: z.number(),
  suggested: z.number(),
  reason: z.string(),
});

export const HostInsightsOutput = z.object({
  occupancy_rate: z.number(),
  revenue_eur: z.number(),
  competitor_avg_revenue_eur: z.number(),
  delta_pct: z.number(),
  pricing_recommendations: z.array(PricingRecommendation),
  insights: z.array(z.string()),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type HostInsightsOutputT = z.infer<typeof HostInsightsOutput>;
