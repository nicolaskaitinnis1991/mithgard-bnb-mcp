import { z } from 'zod';
import {
  InsightsData,
  ResultFields,
  validateMode,
  validateResult,
} from '../../host-data/contracts.js';
import { boundedId, isoDate } from '../../lib/validation.js';

export const HostInsightsInput = z
  .object({
    mode: z.enum(['demo', 'provided']).optional(),
    host_data: InsightsData.optional(),
    listing_id: boundedId,
    reference_date: isoDate.optional(),
    period: z.enum(['last_30d', 'last_90d', 'last_year']).default('last_30d'),
  })
  .strict()
  .superRefine(validateMode);
export type HostInsightsInputT = z.infer<typeof HostInsightsInput>;

export const PricingRecommendation = z.object({
  date_range: z.string(),
  current: z.number().nonnegative(),
  suggested: z.number().nonnegative(),
  reason: z.string(),
});

export const HostInsightsOutput = z
  .object({
    occupancy_rate: z.number().min(0).max(1).nullable(),
    reference_date: isoDate,
    revenue_eur: z.number().nonnegative().nullable(),
    revenue: z.number().nonnegative().nullable().optional(),
    adr: z.number().nonnegative().nullable().optional(),
    revpar: z.number().nonnegative().nullable().optional(),
    available_nights: z.number().int().nonnegative().nullable().optional(),
    occupied_nights: z.number().int().nonnegative().nullable().optional(),
    unknown_nights: z.number().int().nonnegative().optional(),
    cancelled_nights: z.number().int().nonnegative().optional(),
    reporting_range: z.object({ from: z.string(), to: z.string() }).optional(),
    benchmark_revenue: z.number().nonnegative().nullable().optional(),
    benchmark_sample_size: z.number().int().positive().nullable().optional(),
    competitor_avg_revenue_eur: z.number().nonnegative().nullable(),
    delta_pct: z.number().nullable(),
    pricing_recommendations: z.array(PricingRecommendation),
    insights: z.array(z.string()),
    ...ResultFields,
  })
  .superRefine(validateResult);
export type HostInsightsOutputT = z.infer<typeof HostInsightsOutput>;
