import { z } from 'zod';
import { boundedId, isoDate, isoDatetime } from '../lib/validation.js';

export const HostCurrency = z.enum(['EUR', 'GBP', 'USD', 'CAD', 'AUD', 'CHF']);
export const Amount = z
  .number()
  .finite()
  .min(0)
  .max(1000000)
  .refine(
    (n) => Math.abs(n * 100 - Math.round(n * 100)) < 0.000001,
    'Amounts support at most two decimal places',
  );
export const Timezone = z
  .string()
  .min(1)
  .max(80)
  .refine((timezone) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format(0);
      return true;
    } catch {
      return false;
    }
  }, 'Expected a supported IANA time zone');
export const Metadata = z
  .object({
    as_of: isoDatetime,
    timezone: Timezone,
    currency: HostCurrency,
    complete: z.boolean(),
  })
  .strict();
export type MetadataT = z.infer<typeof Metadata>;
export const DataEvidence = z.object({
  source: z.enum(['provided', 'demo']),
  as_of: isoDatetime.nullable(),
  timezone: Timezone,
  currency: HostCurrency,
  complete: z.boolean(),
  missing_fields: z.array(z.string().max(200)).max(400),
});
// Fixtures are internal partials; handlers attach mandatory provenance before exposure.
export type DemoOutput<T> = Omit<T, '_source' | 'data_evidence'>;
export const ResultFields = {
  _mock: z.boolean(),
  _source: z.enum(['provided', 'demo']),
  data_evidence: DataEvidence,
  _pitch: z.string().max(500).optional(),
};
export const validateResult = (
  value: {
    _mock: boolean;
    _source?: 'provided' | 'demo' | undefined;
    data_evidence?: z.infer<typeof DataEvidence> | undefined;
  },
  context: z.RefinementCtx,
): void => {
  if (
    value._source === 'provided' &&
    (value._mock ||
      value.data_evidence?.source !== 'provided' ||
      value.data_evidence.as_of === null)
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Provided result requires provided evidence and mock=false',
    });
  }
  if (!value._mock && value._source !== 'provided')
    context.addIssue({ code: 'custom', message: 'Non-demo result requires provided source' });
  if (value._source === 'demo' && (!value._mock || value.data_evidence?.complete))
    context.addIssue({ code: 'custom', message: 'Demo result cannot establish completeness' });
};
export const validateMode = (
  value: { mode?: 'provided' | 'demo' | undefined; host_data?: unknown },
  context: z.RefinementCtx,
): void => {
  if (value.mode === 'provided' && value.host_data === undefined)
    context.addIssue({
      code: 'custom',
      path: ['host_data'],
      message: 'Provided mode requires explicit host_data',
    });
  if (value.mode !== 'provided' && value.host_data !== undefined)
    context.addIssue({
      code: 'custom',
      path: ['mode'],
      message: 'Host data requires provided mode; no fixture fallback',
    });
};
export const providedData = <T>(input: {
  mode?: 'provided' | 'demo' | undefined;
  host_data?: T | undefined;
}): T | undefined => {
  if (input.mode === 'provided') {
    if (input.host_data === undefined) throw new Error('Provided mode requires host_data');
    return input.host_data;
  }
  if (input.host_data !== undefined) throw new Error('Host data requires provided mode');
  return undefined;
};
export const providedEvidence = (meta: MetadataT, missing: string[] = []) => ({
  _source: 'provided' as const,
  _mock: false,
  data_evidence: {
    source: 'provided' as const,
    as_of: meta.as_of,
    timezone: meta.timezone,
    currency: meta.currency,
    complete: meta.complete && missing.length === 0,
    missing_fields: [...new Set([...(meta.complete ? [] : ['source_completeness']), ...missing])],
  },
});
export const demoResult = <T extends { _mock: boolean }>(out: T) => ({
  ...out,
  _source: 'demo' as const,
  data_evidence: {
    source: 'demo' as const,
    as_of: null,
    timezone: 'UTC',
    currency: 'EUR' as const,
    complete: false,
    missing_fields: ['synthetic_data'],
  },
});
export const roundMoney = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
export const asOfDate = (asOf: string): string => new Date(asOf).toISOString().slice(0, 10);
export const addDays = (date: string, count: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + count * 86400000).toISOString().slice(0, 10);
export const dateRange = (from: string, toExclusive: string): string[] => {
  const count = (Date.parse(toExclusive) - Date.parse(from)) / 86400000;
  if (!Number.isInteger(count) || count < 0 || count > 366) throw new Error('Unbounded date range');
  return Array.from({ length: count }, (_, index) => addDays(from, index));
};
export const Night = z
  .object({
    date: isoDate,
    state: z.enum(['available', 'booked', 'owner_block', 'cancelled', 'unknown']),
    price: Amount.optional(),
    revenue: Amount.optional(),
  })
  .strict();
export const Nights = z
  .array(Night)
  .max(366)
  .superRefine((nights, context) => {
    if (new Set(nights.map((night) => night.date)).size !== nights.length)
      context.addIssue({ code: 'custom', message: 'Duplicate calendar date' });
  });
export type NightT = z.infer<typeof Night>;
const validRange = (data: { from: string; to: string }, ctx: z.RefinementCtx): void => {
  const count = (Date.parse(data.to) - Date.parse(data.from)) / 86400000;
  if (count < 1 || count > 366)
    ctx.addIssue({
      code: 'custom',
      path: ['to'],
      message: 'Expected 1–366 nights; to is exclusive',
    });
};
export const InsightsData = Metadata.extend({
  from: isoDate,
  to: isoDate,
  nights: Nights.optional(),
  benchmark: z
    .object({
      revenue: Amount,
      currency: HostCurrency,
      from: isoDate,
      to: isoDate,
      sample_size: z.number().int().min(1).max(10000),
    })
    .strict()
    .optional(),
})
  .strict()
  .superRefine((data, ctx) => {
    validRange(data, ctx);
    if (data.nights?.some((n) => n.date < data.from || n.date >= data.to))
      ctx.addIssue({ code: 'custom', path: ['nights'], message: 'Night outside reporting range' });
    if (
      data.benchmark &&
      (data.benchmark.currency !== data.currency ||
        data.benchmark.from !== data.from ||
        data.benchmark.to !== data.to)
    )
      ctx.addIssue({
        code: 'custom',
        path: ['benchmark'],
        message: 'Benchmark currency and period must match',
      });
  });
export const HousePolicy = z
  .object({
    max_guests: z.number().int().min(1).max(100).optional(),
    min_nights: z.number().int().min(1).max(365).optional(),
    pets_allowed: z.boolean().optional(),
    events_allowed: z.boolean().optional(),
  })
  .strict();
export const MessageData = Metadata.extend({
  language: z.enum(['en', 'de']),
  policy: HousePolicy.optional(),
  wifi: z
    .object({ ssid: z.string().min(1).max(100), password: z.string().min(1).max(200) })
    .strict()
    .optional(),
  access_details_allowed: z.boolean().optional(),
  checkin_time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  arrival_instructions: z.string().min(1).max(2000).optional(),
  late_arrival_allowed: z.boolean().optional(),
  pet_fee: Amount.optional(),
  cancellation_policy: z.string().min(1).max(2000).optional(),
}).strict();
export const TriageData = Metadata.extend({
  policy: HousePolicy.optional(),
  events_requested: z.boolean().optional(),
}).strict();
export const PricingData = Metadata.extend({
  nights: Nights,
  base_price: Amount.optional(),
  min_price: Amount,
  max_price: Amount,
  weekday_factors: z.array(z.number().finite().min(0.1).max(5)).length(7).optional(),
  date_factors: z
    .array(z.object({ date: isoDate, factor: z.number().finite().min(0.1).max(5) }).strict())
    .max(30)
    .optional(),
})
  .strict()
  .superRefine((data, ctx) => {
    if (data.min_price > data.max_price)
      ctx.addIssue({ code: 'custom', path: ['max_price'], message: 'Price bounds reversed' });
    if (
      data.date_factors &&
      new Set(data.date_factors.map((d) => d.date)).size !== data.date_factors.length
    )
      ctx.addIssue({ code: 'custom', path: ['date_factors'], message: 'Duplicate factor date' });
  });
export const CalendarData = Metadata.extend({
  nights: Nights,
  min_nights: z.number().int().min(1).max(365).optional(),
}).strict();
export const ReviewData = Metadata.extend({
  language: z.enum(['en', 'de']),
  concerns: z.array(z.string().min(1).max(200)).max(20).optional(),
  completed_actions: z
    .array(
      z.object({ description: z.string().min(1).max(500), confirmed: z.literal(true) }).strict(),
    )
    .max(10)
    .optional(),
}).strict();
const Interval = z
  .object({ start: isoDatetime, end: isoDatetime })
  .strict()
  .superRefine((d, ctx) => {
    if (Date.parse(d.end) <= Date.parse(d.start))
      ctx.addIssue({
        code: 'custom',
        path: ['end'],
        message: 'Interval must have positive duration',
      });
  });
export const TurnoverData = Metadata.extend({
  tasks: z
    .array(
      z
        .object({
          id: boundedId.max(80),
          title: z.string().min(1).max(100),
          duration_min: z.number().int().min(1).max(480),
        })
        .strict(),
    )
    .min(1)
    .max(30),
  buffer_min: z.number().int().min(0).max(240),
  cleaners: z
    .array(
      z
        .object({
          id: boundedId,
          available: z.array(Interval).max(50),
          assignments: z.array(Interval).max(50),
        })
        .strict(),
    )
    .max(20),
})
  .strict()
  .superRefine((d, ctx) => {
    if (new Set(d.tasks.map((t) => t.id)).size !== d.tasks.length)
      ctx.addIssue({ code: 'custom', path: ['tasks'], message: 'Duplicate task ID' });
    if (new Set(d.cleaners.map((c) => c.id)).size !== d.cleaners.length)
      ctx.addIssue({ code: 'custom', path: ['cleaners'], message: 'Duplicate cleaner ID' });
  });
