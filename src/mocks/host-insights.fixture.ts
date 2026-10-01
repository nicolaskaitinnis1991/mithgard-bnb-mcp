import type { DemoOutput } from '../host-data/contracts.js';
import { currentUtcDate } from '../lib/validation.js';
import type { HostInsightsOutputT } from '../tools/host-insights/schema.js';

export type Profile = 'under_performing' | 'at_market' | 'over_performing';

export const HOST_INSIGHTS_PITCH = 'Surfaces revenue gaps and concrete pricing actions per listing';

const PROFILES: Record<
  Profile,
  Omit<HostInsightsOutputT, '_mock' | '_pitch' | 'reference_date' | '_source' | 'data_evidence'>
> = {
  under_performing: {
    occupancy_rate: 0.52,
    revenue_eur: 3120,
    competitor_avg_revenue_eur: 4480,
    delta_pct: -30.4,
    pricing_recommendations: [
      {
        date_range: 'illustrative_window_1',
        current: 89,
        suggested: 119,
        reason: 'Mid-week dip + local trade fair drives demand',
      },
      {
        date_range: 'illustrative_window_2',
        current: 89,
        suggested: 99,
        reason: 'Weekend uplift, competition averaging 105 EUR',
      },
    ],
    insights: [
      'Occupancy 30% below local benchmark — pricing is too rigid for weekday/weekend split.',
      'Competitor avg nightly: 112 EUR. You charge 89 EUR flat. Loss estimated at 1.4K EUR/30d.',
      'Recommend: enable smart_pricing tool for daily price tuning.',
    ],
  },
  at_market: {
    occupancy_rate: 0.71,
    revenue_eur: 4280,
    competitor_avg_revenue_eur: 4350,
    delta_pct: -1.6,
    pricing_recommendations: [
      {
        date_range: 'illustrative_window_1',
        current: 109,
        suggested: 119,
        reason: 'Sold-out competitors within 1km — small uplift safe',
      },
    ],
    insights: [
      'Listing performs at market. Small upside via event-based pricing.',
      'Average daily rate within 2% of competitors.',
      'Recommend: monitor calendar gaps via calendar_optimizer.',
    ],
  },
  over_performing: {
    occupancy_rate: 0.86,
    revenue_eur: 5640,
    competitor_avg_revenue_eur: 4280,
    delta_pct: 31.8,
    pricing_recommendations: [
      {
        date_range: 'illustrative_window_1',
        current: 139,
        suggested: 149,
        reason: 'Demand pressure: 86% occupancy, ladder up cautiously',
      },
    ],
    insights: [
      'Top-quartile performance vs comparable listings.',
      'Headroom for +7% ADR without occupancy hit.',
      'Recommend: protect superhost streak via review_responder.',
    ],
  },
};

export const PROFILE_ORDER: Profile[] = ['under_performing', 'at_market', 'over_performing'];

export const fixtureFor = (
  profile: Profile,
  referenceDate = currentUtcDate(),
): DemoOutput<HostInsightsOutputT> => {
  const addDays = (days: number): string =>
    new Date(Date.parse(`${referenceDate}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
  return {
    ...PROFILES[profile],
    reference_date: referenceDate,
    pricing_recommendations: PROFILES[profile].pricing_recommendations.map(
      (recommendation, index) => ({
        ...recommendation,
        date_range: `${addDays(7 + index * 7)}..${addDays(14 + index * 7)}`,
      }),
    ),
    _mock: true,
    _pitch: HOST_INSIGHTS_PITCH,
  };
};
