import type { SmartPricingInputT, SmartPricingOutputT } from '../tools/smart-pricing/schema.js';
import { fnv1a } from './hash.js';

export const SMART_PRICING_PITCH = 'Per-day pricing with explainable factors';

const MAX_HORIZON_DAYS = 30;

const SEASONAL_FACTOR: Record<number, number> = {
  // 0=Jan ... 11=Dec
  0: 0.85,
  1: 0.85,
  2: 0.95,
  3: 1.05,
  4: 1.1,
  5: 1.15,
  6: 1.2,
  7: 1.2,
  8: 1.05,
  9: 1.0,
  10: 0.9,
  11: 1.1,
};

const WEEKDAY_UPLIFT: Record<number, number> = {
  // 0=Sun .. 6=Sat
  0: 0,
  1: 0,
  2: 0,
  3: 5,
  4: 15,
  5: 25,
  6: 25,
};

const dayDiff = (from: string, to: string): number => {
  const f = new Date(`${from}T00:00:00Z`).getTime();
  const t = new Date(`${to}T00:00:00Z`).getTime();
  return Math.floor((t - f) / (1000 * 60 * 60 * 24));
};

const addDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const computePricing = (input: SmartPricingInputT): SmartPricingOutputT => {
  const totalDays = Math.max(1, dayDiff(input.from, input.to) + 1);
  const horizon = Math.min(totalDays, MAX_HORIZON_DAYS);

  // Deterministic listing-specific base price between 70 and 150
  const base = 70 + (fnv1a(input.listing_id) % 81);

  const daily: SmartPricingOutputT['daily_prices'] = [];
  let total = 0;

  for (let i = 0; i < horizon; i++) {
    const date = addDays(input.from, i);
    const d = new Date(`${date}T00:00:00Z`);
    const dow = d.getUTCDay();
    const month = d.getUTCMonth();
    const seasonal = SEASONAL_FACTOR[month] ?? 1.0;
    const weekday = WEEKDAY_UPLIFT[dow] ?? 0;

    const suggested = Math.round((base + weekday) * seasonal);

    const reasons: string[] = [];
    if (weekday >= 25) reasons.push('Weekend uplift (+25 EUR)');
    else if (weekday > 0) reasons.push(`Weekday uplift (+${String(weekday)} EUR)`);
    else reasons.push('Off-peak weekday baseline');

    if (seasonal >= 1.15) reasons.push(`High-season factor (×${seasonal.toFixed(2)})`);
    else if (seasonal <= 0.9) reasons.push(`Low-season factor (×${seasonal.toFixed(2)})`);

    daily.push({ date, suggested, reasons });
    total += suggested;
  }

  const avg = Math.round(total / daily.length);

  return {
    daily_prices: daily,
    currency: 'EUR',
    estimate_basis: 'all_nights_booked_before_fees',
    summary: {
      avg_suggested: avg,
      total_revenue_estimate: total,
    },
    _mock: true,
    _pitch: SMART_PRICING_PITCH,
  };
};
