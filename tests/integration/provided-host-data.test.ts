import { describe, expect, it, vi } from 'vitest';
import type { z } from 'zod';
import { HostInsightsInput, HostInsightsOutput } from '../../src/tools/host-insights/schema.js';
import { hostInsightsHandler } from '../../src/tools/host-insights/handler.js';
import {
  GuestMessageInput,
  GuestMessageOutput,
} from '../../src/tools/guest-message-assistant/schema.js';
import { guestMessageHandler } from '../../src/tools/guest-message-assistant/handler.js';
import {
  BookingTriageInput,
  BookingTriageOutput,
} from '../../src/tools/booking-request-triage/schema.js';
import { bookingTriageHandler } from '../../src/tools/booking-request-triage/handler.js';
import { SmartPricingInput, SmartPricingOutput } from '../../src/tools/smart-pricing/schema.js';
import { smartPricingHandler } from '../../src/tools/smart-pricing/handler.js';
import {
  CalendarOptimizerInput,
  CalendarOptimizerOutput,
} from '../../src/tools/calendar-optimizer/schema.js';
import { calendarOptimizerHandler } from '../../src/tools/calendar-optimizer/handler.js';
import {
  ReviewResponderInput,
  ReviewResponderOutput,
} from '../../src/tools/review-responder/schema.js';
import { reviewResponderHandler } from '../../src/tools/review-responder/handler.js';
import { TurnoverInput, TurnoverOutput } from '../../src/tools/turnover-coordinator/schema.js';
import { turnoverHandler } from '../../src/tools/turnover-coordinator/handler.js';
import type { Night } from '../../src/host-data/contracts.js';
import { Metadata, dateRange, providedData } from '../../src/host-data/contracts.js';
import { mockTools } from '../../src/tools/index.js';
import { WorkflowEngine } from '../../src/workflows/engine.js';
import { buildWorkflowTool } from '../../src/workflows/tool.js';
import { WorkflowOutput } from '../../src/workflows/schema.js';
import type { Logger } from 'pino';

// Entirely synthetic caller-supplied facts. No provider account, real guest,
// network request, business write, or human user study is involved.
const metadata = Metadata.parse({
  as_of: '2026-06-01T09:00:00Z',
  timezone: 'Europe/Berlin',
  currency: 'EUR',
  complete: true,
});
const nights = (count: number, state: (index: number) => z.infer<typeof Night>['state']) =>
  Array.from({ length: count }, (_, index) => ({
    date: `2026-06-${String(index + 1).padStart(2, '0')}`,
    state: state(index),
    price: 100,
  }));
const insightsData = {
  ...metadata,
  from: '2026-06-01',
  to: '2026-07-01',
  nights: nights(30, (index) =>
    index < 5 ? 'owner_block' : index < 15 ? 'booked' : 'available',
  ).map((night) => ({ ...night, ...(night.state === 'booked' ? { revenue: 100 } : {}) })),
};
const triageBase = {
  mode: 'provided',
  thread_id: 'synthetic-thread',
  reference_date: '2026-06-01',
  guest_profile: { joined: '2018-01-01', reviews: 100, rating: 4.99, verified: true },
  trip: { adults: 2, children: 0, pets: false, nights: 3, reason: 'Business trip' },
};
const triageData = {
  ...metadata,
  policy: { max_guests: 4, min_nights: 2, pets_allowed: false, events_allowed: false },
  events_requested: false,
};
const pricingBase = {
  mode: 'provided',
  listing_id: 'synthetic-listing',
  from: '2026-06-01',
  to: '2026-06-03',
};
const pricingData = {
  ...metadata,
  nights: nights(3, () => 'available'),
  min_price: 80,
  max_price: 120,
  date_factors: [{ date: '2026-06-01', factor: 1.25 }],
};
const calendarBase = {
  mode: 'provided',
  listing_id: 'synthetic-listing',
  reference_date: '2026-06-01',
  horizon_days: 30,
};
const calendarData = {
  ...metadata,
  nights: nights(30, (index) => (index === 1 || index === 2 ? 'available' : 'booked')),
  min_nights: 3,
};
const turnoverBase = {
  mode: 'provided',
  listing_id: 'synthetic-listing',
  checkout_at: '2026-06-01T10:00:00Z',
  checkin_at: '2026-06-01T13:00:00Z',
};
const turnoverData = {
  ...metadata,
  tasks: [{ id: 'clean', title: 'Clean apartment', duration_min: 120 }],
  buffer_min: 30,
  cleaners: [
    {
      id: 'crew',
      available: [{ start: '2026-06-01T09:00:00Z', end: '2026-06-01T15:00:00Z' }],
      assignments: [],
    },
  ],
};
const runInsights = async (data: unknown, listing = 'synthetic-listing') =>
  HostInsightsOutput.parse(
    await hostInsightsHandler(
      HostInsightsInput.parse({ mode: 'provided', listing_id: listing, host_data: data }),
    ),
  );
const runMessage = async (message: string, data: unknown, voice = 'warm') =>
  GuestMessageOutput.parse(
    await guestMessageHandler(
      GuestMessageInput.parse({
        mode: 'provided',
        thread_id: 'synthetic-thread',
        last_message: message,
        host_voice: voice,
        host_data: data,
      }),
    ),
  );
const runTriage = async (data: unknown = triageData, input: unknown = triageBase) =>
  BookingTriageOutput.parse(
    await bookingTriageHandler(
      BookingTriageInput.parse({ ...triageBase, ...(input as object), host_data: data }),
    ),
  );
const runPricing = async (data: unknown = pricingData, input: unknown = pricingBase) =>
  SmartPricingOutput.parse(
    await smartPricingHandler(
      SmartPricingInput.parse({ ...pricingBase, ...(input as object), host_data: data }),
    ),
  );
const runCalendar = async (data: unknown = calendarData, input: unknown = calendarBase) =>
  CalendarOptimizerOutput.parse(
    await calendarOptimizerHandler(
      CalendarOptimizerInput.parse({ ...calendarBase, ...(input as object), host_data: data }),
    ),
  );
const runReview = async (
  review: string,
  rating = 5,
  data: unknown = { ...metadata, language: 'en' },
  voice = 'warm',
) =>
  ReviewResponderOutput.parse(
    await reviewResponderHandler(
      ReviewResponderInput.parse({
        mode: 'provided',
        review_id: 'synthetic-review',
        review_text: review,
        rating,
        host_voice: voice,
        host_data: data,
      }),
    ),
  );
const runTurnover = async (data: unknown = turnoverData, input: unknown = turnoverBase) =>
  TurnoverOutput.parse(
    await turnoverHandler(
      TurnoverInput.parse({ ...turnoverBase, ...(input as object), host_data: data }),
    ),
  );

const contracts = [
  ['HOST-INSIGHTS', HostInsightsInput, { listing_id: 'L' }],
  ['HOST-MESSAGE', GuestMessageInput, { thread_id: 'T', last_message: 'wifi' }],
  [
    'HOST-TRIAGE',
    BookingTriageInput,
    { thread_id: 'T', guest_profile: triageBase.guest_profile, trip: triageBase.trip },
  ],
  ['HOST-PRICING', SmartPricingInput, { listing_id: 'L', from: '2026-06-01', to: '2026-06-01' }],
  ['HOST-CALENDAR', CalendarOptimizerInput, { listing_id: 'L' }],
  ['HOST-REVIEW', ReviewResponderInput, { review_id: 'R', review_text: 'Great stay', rating: 5 }],
  [
    'HOST-TURNOVER',
    TurnoverInput,
    { listing_id: 'L', checkout_at: turnoverBase.checkout_at, checkin_at: turnoverBase.checkin_at },
  ],
] as const;

describe('Provided host-data contract', () => {
  it.each(contracts)(
    '[%s] never falls back when provided mode/data is absent or inconsistent',
    (_tag, schema, base) => {
      expect(schema.safeParse({ ...base, mode: 'provided' }).success).toBe(false);
      expect(schema.safeParse({ ...base, host_data: metadata }).success).toBe(false);
      expect(schema.safeParse({ ...base, mode: 'demo', host_data: metadata }).success).toBe(false);
      expect(schema.safeParse({ ...base, mode: 'demo', invented: 1 }).success).toBe(false);
    },
  );
  it('[HOST-INSIGHTS] rejects forged provenance and unsupported unbounded metadata', async () => {
    const out = await runInsights(insightsData);
    expect(HostInsightsOutput.safeParse({ ...out, _mock: true }).success).toBe(false);
    expect(
      HostInsightsOutput.safeParse({ ...out, data_evidence: { ...out.data_evidence, as_of: null } })
        .success,
    ).toBe(false);
    expect(HostInsightsOutput.safeParse({ ...out, _source: 'demo' }).success).toBe(false);
    expect(Metadata.safeParse({ ...metadata, timezone: 'Invented/Zone' }).success).toBe(false);
    expect(Metadata.safeParse({ ...metadata, currency: 'JPY' }).success).toBe(false);
    expect(Metadata.safeParse({ ...metadata, as_of: '2026-02-30T10:00:00Z' }).success).toBe(false);
    expect(Metadata.safeParse({ ...metadata, extra: 'secret' }).success).toBe(false);
  });
  it('[HOST-INSIGHTS] direct dispatch guard also fails closed and dates stay bounded', () => {
    expect(() => providedData({ mode: 'provided' })).toThrow();
    expect(() => providedData({ host_data: metadata })).toThrow();
    expect(providedData({ mode: 'demo' })).toBeUndefined();
    expect(() => dateRange('2026-01-01', '2028-01-01')).toThrow();
    expect(() => dateRange('2026-06-02', '2026-06-01')).toThrow();
  });
});

describe('[HOST-INSIGHTS] actual reporting arithmetic', () => {
  it('30 nights minus 5 owner blocks, 10 booked and 1000 revenue -> occupancy0.4, ADR100, RevPAR40', async () => {
    const out = await runInsights(insightsData);
    expect(out).toMatchObject({
      _source: 'provided',
      _mock: false,
      occupancy_rate: 0.4,
      revenue: 1000,
      revenue_eur: 1000,
      adr: 100,
      revpar: 40,
      available_nights: 25,
      occupied_nights: 10,
      delta_pct: null,
      competitor_avg_revenue_eur: null,
    });
    expect(out.pricing_recommendations).toEqual([]);
    expect(out.data_evidence).toEqual({ ...metadata, source: 'provided', missing_fields: [] });
    expect(out.insights.join(' ')).toContain('No benchmark supplied');
  });
  it('identical data with a different listing ID has identical metrics', async () => {
    expect(await runInsights(insightsData, 'another-listing')).toEqual(
      await runInsights(insightsData),
    );
  });
  it('zero denominator yields null occupancy/ADR/RevPAR; cancelled revenue is excluded', async () => {
    const out = await runInsights({
      ...insightsData,
      nights: nights(30, (index) => (index === 0 ? 'cancelled' : 'owner_block')).map((n) => ({
        ...n,
        revenue: 10000,
      })),
    });
    expect(out).toMatchObject({
      occupancy_rate: null,
      revenue: 0,
      adr: null,
      revpar: null,
      cancelled_nights: 1,
      available_nights: 0,
    });
  });
  it('missing coverage or incomplete source produces null aggregate basis', async () => {
    for (const data of [
      { ...insightsData, nights: [] },
      { ...insightsData, complete: false },
      { ...insightsData, nights: undefined },
    ]) {
      const out = await runInsights(data);
      expect(out.occupancy_rate).toBeNull();
      expect(out.revenue).toBeNull();
      expect(out.data_evidence.complete).toBe(false);
    }
  });
  it('missing booked revenue leaves occupancy valid but financial metrics unknown', async () => {
    const out = await runInsights({
      ...insightsData,
      nights: insightsData.nights.map(({ revenue: _revenue, ...n }) => n),
    });
    expect(out.occupancy_rate).toBe(0.4);
    expect(out.revenue).toBeNull();
    expect(out.adr).toBeNull();
    expect(out.data_evidence.missing_fields).toContain('booked_night_revenue');
  });
  it('matched caller benchmark retains currency and sample, never relabels GBP as EUR', async () => {
    const benchmark = {
      revenue: 2000,
      currency: 'GBP',
      from: insightsData.from,
      to: insightsData.to,
      sample_size: 12,
    };
    const out = await runInsights({ ...insightsData, currency: 'GBP', benchmark });
    expect(out).toMatchObject({
      revenue: 1000,
      revenue_eur: null,
      competitor_avg_revenue_eur: null,
      benchmark_revenue: 2000,
      benchmark_sample_size: 12,
      delta_pct: -50,
    });
    const zero = await runInsights({
      ...insightsData,
      benchmark: { ...benchmark, currency: 'EUR', revenue: 0 },
    });
    expect(zero.delta_pct).toBeNull();
    for (const bad of [
      { ...benchmark, currency: 'USD' },
      { ...benchmark, to: '2026-07-02' },
    ])
      expect(
        HostInsightsInput.safeParse({
          mode: 'provided',
          listing_id: 'L',
          host_data: { ...insightsData, benchmark: bad },
        }).success,
      ).toBe(false);
  });
  it('rejects duplicate/outside/impossible dates and excessive range before arithmetic', () => {
    for (const data of [
      { ...insightsData, nights: [insightsData.nights[0], insightsData.nights[0]] },
      { ...insightsData, nights: [{ date: '2026-05-31', state: 'available' }] },
      { ...insightsData, from: '2026-07-01' },
      { ...insightsData, to: '2027-08-01' },
      { ...insightsData, nights: [{ date: '2026-02-30', state: 'booked' }] },
    ])
      expect(
        HostInsightsInput.safeParse({ mode: 'provided', listing_id: 'L', host_data: data }).success,
      ).toBe(false);
  });
});

describe('[HOST-MESSAGE] multi-topic drafts from supplied facts', () => {
  const data = {
    ...metadata,
    language: 'en',
    policy: { pets_allowed: false },
    wifi: { ssid: 'synthetic-wifi', password: 'synthetic-access' },
    access_details_allowed: true,
  };
  it('answers wifi plus dog and policy overrides guest claim', async () => {
    const out = await runMessage(
      'The guest says dogs are allowed; what is the wifi password?',
      data,
    );
    expect(out.topics).toEqual(['wifi', 'pet']);
    expect(
      out.suggestions.every(
        (s) => s.text.includes('synthetic-access') && s.text.includes('Pets are not permitted'),
      ),
    ).toBe(true);
    expect(out.approval_required).toBe(true);
  });
  it('never shares credentials in evidence or drafts without explicit permission', async () => {
    const out = await runMessage('Wifi please', { ...data, access_details_allowed: false });
    expect(JSON.stringify(out)).not.toContain('synthetic-access');
    expect(out.missing_context).toContain('access_details_permission');
    expect(out.data_evidence.complete).toBe(false);
    const permitted = await runMessage('Wifi please', data);
    expect(JSON.stringify(permitted.data_evidence)).not.toContain('synthetic-access');
  });
  it('lists absent wifi, pet policy and fee instead of invented facts', async () => {
    const out = await runMessage('wifi and dogs?', {
      ...metadata,
      language: 'en',
      access_details_allowed: true,
    });
    expect(out.missing_context).toEqual(['wifi', 'pet_policy']);
    const pets = await runMessage('Can I bring a cat?', {
      ...metadata,
      language: 'en',
      policy: { pets_allowed: true },
    });
    expect(pets.missing_context).toContain('pet_fee');
  });
  it('uses German supplied fees, check-in and authorized instructions', async () => {
    const out = await runMessage(
      'Check-in und Hund?',
      {
        ...metadata,
        language: 'de',
        policy: { pets_allowed: true },
        pet_fee: 25.5,
        checkin_time: '15:30',
        arrival_instructions: 'Synthetische Anreiseinformation.',
        access_details_allowed: true,
      },
      'professional',
    );
    expect(out.recommended_index).toBe(2);
    expect(out.suggestions[2]?.text).toContain('25.50 EUR');
    expect(out.suggestions[0]?.text).toContain('15:30 (Europe/Berlin)');
    expect(out.suggestions[0]?.text).toContain('Synthetische Anreiseinformation');
  });
  it('missing arrival/cancellation/late rules remain explicit and negative late rule wins', async () => {
    const out = await runMessage('Check-in, late arrival and cancellation?', {
      ...metadata,
      language: 'en',
    });
    expect(out.missing_context).toEqual(
      expect.arrayContaining([
        'checkin_time',
        'arrival_instructions',
        'late_arrival_policy',
        'cancellation_policy',
      ]),
    );
    const no = await runMessage('Late arrival?', {
      ...metadata,
      language: 'en',
      late_arrival_allowed: false,
    });
    expect(no.suggestions[0]?.text).toContain('not allowed');
    const yes = await runMessage('Späte Anreise, Stornierung?', {
      ...metadata,
      language: 'de',
      late_arrival_allowed: true,
      checkin_time: '14:00',
      arrival_instructions: 'synthetic access code',
      access_details_allowed: false,
      cancellation_policy: 'Synthetisch: kostenlos bis sieben Tage vorher.',
    });
    expect(yes.suggestions[0]?.text).toContain('erlaubt');
    expect(yes.suggestions[0]?.text).toContain('kostenlos');
    expect(JSON.stringify(yes)).not.toContain('synthetic access code');
  });
  it('unsupported-only and mixed unsupported topics require human context and disclose language limits', async () => {
    const unknown = await runMessage('Can you book a taxi?', data, 'casual');
    expect(unknown.missing_context).toContain('supported_topic');
    expect(unknown.limitations?.join(' ')).toContain('EN/DE');
    expect(unknown.recommended_index).toBe(0);
    const mixed = await runMessage('Wifi and can you book a taxi?', data);
    expect(mixed.missing_context).toContain('unsupported_topic');
    expect(
      GuestMessageInput.safeParse({
        mode: 'provided',
        thread_id: 'T',
        last_message: 'bonjour',
        host_data: { ...data, language: 'fr' },
      }).success,
    ).toBe(false);
  });
  it('a safety concern alongside wifi is flagged for urgent personal attention', async () => {
    const out = await runMessage('There is a fire. What is the wifi?', data);
    expect(out.needs_escalation).toBe(true);
    expect(out.suggestions[0]?.text).toContain('urgent personal attention');
    expect(out.approval_required).toBe(true);
  });
});

describe('[HOST-TRIAGE] rule precedence over profile', () => {
  it('capacity4 against20guests cannot accept even an old highly-rated verified profile', async () => {
    const out = await runTriage(triageData, { trip: { ...triageBase.trip, adults: 20 } });
    expect(out.recommendation).toBe('decline_after_review');
    expect(out.risk_score).toBeNull();
    expect(out.red_flags).toContain('Rule failed: capacity');
    expect(out.approval_required).toBe(true);
  });
  it.each([
    { pets: true, nights: 3, reason: 'business' },
    { pets: false, nights: 1, reason: 'business' },
    { pets: false, nights: 3, reason: 'We want a loud party' },
  ])('pet/min-stay/event violation overrides profile %#', async (trip) => {
    const out = await runTriage(triageData, { trip: { ...triageBase.trip, ...trip } });
    expect(out.recommendation).toBe('decline_after_review');
  });
  it('unknown rules, event context or incomplete source require review', async () => {
    for (const data of [
      { ...metadata },
      { ...triageData, events_requested: undefined },
      { ...triageData, complete: false },
    ])
      expect((await runTriage(data)).recommendation).toBe('review');
  });
  it('long trip reason creates no trust bonus and all known passing rules only suggest reviewed acceptance', async () => {
    const a = await runTriage(),
      b = await runTriage(triageData, { trip: { ...triageBase.trip, reason: 'x'.repeat(4000) } });
    expect(a.recommendation).toBe('accept_after_review');
    expect(b).toEqual(a);
    expect(a.approval_required).toBe(true);
  });
  it('negated or contradictory event text never creates a policy pass', async () => {
    const out = await runTriage(triageData, {
      trip: { ...triageBase.trip, reason: 'No party planned, but maybe a celebration party' },
    });
    expect(out.recommendation).toBe('review');
    expect(out.policy_checks?.find((c) => c.rule === 'events')?.status).toBe('unknown');
  });
  it('explicit true event context still defeats negation and as_of defaults to UTC reference', async () => {
    const out = await runTriage(
      { ...triageData, as_of: '2026-06-01T00:30:00+02:00', events_requested: true },
      { reference_date: undefined, trip: { ...triageBase.trip, reason: 'No party' } },
    );
    expect(out.recommendation).toBe('decline_after_review');
    expect(out.reference_date).toBe('2026-05-31');
    expect(
      BookingTriageInput.safeParse({
        ...triageBase,
        reference_date: undefined,
        guest_profile: { ...triageBase.guest_profile, joined: '2026-06-02' },
        host_data: triageData,
      }).success,
    ).toBe(false);
  });
});

describe('[HOST-PRICING] supplied bases, factors and bounds', () => {
  it('100 ×1.25 clamps to120 with an auditable reason and explicit full occupancy assumption', async () => {
    const out = await runPricing();
    expect(out.daily_prices[0]).toMatchObject({ current: 100, suggested: 120, delta_pct: 20 });
    expect(out.daily_prices[0]?.reasons.join(' ')).toContain('Clamped');
    expect(out.summary).toEqual({ avg_suggested: 106.67, total_revenue_estimate: 320 });
    expect(out.estimate_basis).toBe('all_nights_booked_before_fees');
  });
  it('omits booked/blocked/cancelled/unknown nights and never synthesizes a missing baseline', async () => {
    const states = ['booked', 'owner_block', 'cancelled', 'unknown', 'available'] as const;
    const out = await runPricing(
      {
        ...pricingData,
        nights: nights(5, (i) => states[i] ?? 'unknown').map(({ price: _price, ...n }) => n),
      },
      { to: '2026-06-05' },
    );
    expect(out.daily_prices).toEqual([]);
    expect(out.summary.avg_suggested).toBeNull();
    expect(out.skipped_dates?.map((d) => d.reason)).toEqual([
      ...states.slice(0, 4),
      'missing_price',
    ]);
    expect(out.data_evidence.complete).toBe(false);
  });
  it('explicit base fallback, weekday factors, zero price, lower bound and GBP are preserved', async () => {
    const out = await runPricing(
      {
        ...pricingData,
        currency: 'GBP',
        nights: [{ date: '2026-06-01', state: 'available' }],
        base_price: 100,
        weekday_factors: [1, 0.5, 1, 1, 1, 1, 1],
        date_factors: [],
      },
      { to: '2026-06-01' },
    );
    expect(out).toMatchObject({
      currency: 'GBP',
      daily_prices: [{ current: 100, suggested: 80, delta_pct: -20 }],
    });
    const zero = await runPricing(
      {
        ...pricingData,
        nights: [{ date: '2026-06-01', state: 'available', price: 0 }],
        min_price: 0,
        max_price: 0,
      },
      { to: '2026-06-01' },
    );
    expect(zero.daily_prices[0]).not.toHaveProperty('delta_pct');
    expect(zero.summary.total_revenue_estimate).toBe(0);
  });
  it('missing dates are unknown; price ordering, decimals, duplicate factors and >30dates fail validation', async () => {
    const out = await runPricing({ ...pricingData, nights: [] });
    expect(out.skipped_dates?.every((d) => d.reason === 'unknown')).toBe(true);
    for (const data of [
      { ...pricingData, min_price: 121 },
      { ...pricingData, base_price: 1.001 },
      { ...pricingData, date_factors: [pricingData.date_factors[0], pricingData.date_factors[0]] },
      {
        ...pricingData,
        nights: Array.from({ length: 367 }, () => ({ date: '2026-06-01', state: 'available' })),
      },
    ])
      expect(SmartPricingInput.safeParse({ ...pricingBase, host_data: data }).success).toBe(false);
    expect(
      SmartPricingInput.safeParse({ ...pricingBase, to: '2026-07-01', host_data: pricingData })
        .success,
    ).toBe(false);
  });
});

describe('[HOST-CALENDAR] real calendar states', () => {
  it('fully booked calendar has no gaps or fabricated lost nights', async () => {
    const out = await runCalendar({ ...calendarData, nights: nights(30, () => 'booked') });
    expect(out.gaps).toEqual([]);
    expect(out.opportunity_total).toBe(0);
    expect(out.unknown_dates).toEqual([]);
  });
  it('two available nights bounded by bookings with min-stay3 are a real conflict', async () => {
    const out = await runCalendar();
    expect(out.gaps).toEqual([
      {
        start: '2026-06-02',
        end: '2026-06-04',
        nights: 2,
        cost_estimate_eur: 200,
        opportunity_amount: 200,
        gap_kind: 'orphan_gap',
        min_stay_conflict: true,
        suggestion: 'min_stay_relax',
      },
    ]);
    expect(out.opportunity_total).toBe(200);
    expect(out.estimate_basis).toContain('not_recoverable_revenue');
  });
  it('unknown/absent/cancelled dates do not become available or establish a complete total', async () => {
    const out = await runCalendar({
      ...calendarData,
      nights: [
        { date: '2026-06-01', state: 'unknown' },
        { date: '2026-06-02', state: 'cancelled' },
      ],
    });
    expect(out.gaps).toEqual([]);
    expect(out.unknown_dates).toHaveLength(30);
    expect(out.opportunity_total).toBeNull();
    expect(out.data_evidence.complete).toBe(false);
  });
  it('no supplied prices or min-stay rule yields null amounts/unknown conflict; open runs are labeled', async () => {
    const out = await runCalendar({
      ...metadata,
      currency: 'USD',
      nights: nights(30, () => 'available').map(({ price: _price, ...n }) => n),
    });
    expect(out.gaps[0]).toMatchObject({
      gap_kind: 'open_run',
      opportunity_amount: null,
      cost_estimate_eur: null,
      min_stay_conflict: null,
      suggestion: 'review',
    });
    expect(out.opportunity_total).toBeNull();
    expect(out.data_evidence.missing_fields).toEqual(['minimum_stay', 'gap_prices']);
  });
  it('a long available run needs no relaxation and incomplete source stays incomplete', async () => {
    const out = await runCalendar({
      ...calendarData,
      currency: 'GBP',
      complete: false,
      nights: nights(30, () => 'available'),
    });
    expect(out.gaps[0]).toMatchObject({
      suggestion: 'none',
      min_stay_conflict: false,
      opportunity_amount: 3000,
      cost_estimate_eur: null,
    });
    expect(out.opportunity_total).toBeNull();
    expect(out.data_evidence.missing_fields).toContain('source_completeness');
  });
  it('implicit reference derives the UTC as_of date, not the supplied offset date', async () => {
    const out = await runCalendar(
      { ...calendarData, as_of: '2026-06-01T00:30:00+02:00' },
      { reference_date: undefined },
    );
    expect(out.reference_date).toBe('2026-05-31');
    expect(out.unknown_dates).toContain('2026-05-31');
  });
});

describe('[HOST-REVIEW] concerns outrank stars', () => {
  it.each([
    'The apartment has dangerous exposed electrical wires.',
    'The electrical wires are exposed.',
    'Freiliegende Stromkabel, obwohl fünf Sterne.',
  ])('five-star electrical complaint escalates: %s', async (review) => {
    const out = await runReview(review);
    expect(out.needs_escalation).toBe(true);
    expect(out.sentiment).toBe('mixed');
    expect(out.concerns).toContain('electrical_safety');
    expect(out.draft).not.toContain('kind words');
    expect(out.draft).not.toMatch(/fixed|repaired|resolved/i);
    expect(out.approval_required).toBe(true);
  });
  it('does not invent completed repairs; only explicit caller confirmations can be included', async () => {
    const out = await runReview('Broken lock', 4, {
      ...metadata,
      language: 'en',
      completed_actions: [{ description: 'Synthetic confirmed lock replacement', confirmed: true }],
    });
    expect(out.draft).toContain('Synthetic confirmed lock replacement');
    expect(out.classification_limits?.join(' ')).toContain('caller assertions');
    expect(
      ReviewResponderInput.safeParse({
        mode: 'provided',
        review_id: 'R',
        rating: 4,
        review_text: 'Broken lock',
        host_data: {
          ...metadata,
          language: 'en',
          completed_actions: [{ description: 'Unverified repair', confirmed: false }],
        },
      }).success,
    ).toBe(false);
  });
  it('provided concerns and low rating require review; German positive/neutral replies disclose classifier limits', async () => {
    expect(
      (
        await runReview('Fantastic', 5, {
          ...metadata,
          language: 'en',
          concerns: ['Host reports a safety concern'],
        })
      ).needs_escalation,
    ).toBe(true);
    expect((await runReview('Unpleasant', 1)).sentiment).toBe('negative');
    const neutral = await runReview(
      'Average stay',
      3,
      { ...metadata, language: 'de' },
      'professional',
    );
    expect(neutral.sentiment).toBe('neutral');
    expect(neutral.draft).toContain('Vielen Dank');
    expect(neutral.classification_limits?.join(' ')).toContain('non-exhaustive');
    const positive = await runReview('Great stay', 5, { ...metadata, language: 'de' });
    expect(positive.needs_escalation).toBe(false);
    expect(positive.draft).toContain('Aufenthalt');
  });
});

describe('[HOST-TURNOVER] actual tasks, availability and elapsed time', () => {
  it('120minute tasks plus30buffer fit180minutes without claiming a confirmed assignment', async () => {
    const out = await runTurnover();
    expect(out).toMatchObject({
      window_minutes: 180,
      estimated_duration_min: 120,
      required_duration_min: 150,
      feasible: true,
      proposed_cleaner_id: 'crew',
      assignment_status: 'proposed_only',
      planned_start: '2026-06-01T10:00:00.000Z',
      planned_end: '2026-06-01T12:30:00.000Z',
      approval_required: true,
    });
    expect(out.scheduled_tasks?.[0]?.end).toBe('2026-06-01T12:00:00.000Z');
    expect(out.warnings.join(' ')).toContain('no cleaner assignment');
  });
  it.each([
    { start: '2026-06-01T12:00:00Z', end: '2026-06-01T15:00:00Z' },
    { start: '2026-06-01T09:00:00Z', end: '2026-06-01T11:00:00Z' },
  ])(
    'late start or limited availability makes otherwise long window infeasible %#',
    async (available) => {
      const out = await runTurnover({
        ...turnoverData,
        cleaners: [{ id: 'crew', available: [available], assignments: [] }],
      });
      expect(out.feasible).toBe(false);
      expect(out.planned_start).toBeNull();
      expect(out.scheduled_tasks).toEqual([]);
    },
  );
  it('conflicting assignment blocks a plan, or shifts it after a short conflict when it still fits', async () => {
    const conflict = await runTurnover({
      ...turnoverData,
      cleaners: [
        {
          ...turnoverData.cleaners[0],
          assignments: [{ start: '2026-06-01T10:30:00Z', end: '2026-06-01T12:00:00Z' }],
        },
      ],
    });
    expect(conflict.feasible).toBe(false);
    const shifted = await runTurnover({
      ...turnoverData,
      cleaners: [
        {
          ...turnoverData.cleaners[0],
          assignments: [{ start: '2026-06-01T09:00:00Z', end: '2026-06-01T10:15:00Z' }],
        },
      ],
    });
    expect(shifted.feasible).toBe(true);
    expect(shifted.planned_start).toBe('2026-06-01T10:15:00.000Z');
  });
  it('chooses earliest eligible cleaner, respects requested ID, and never turns missing source into feasible', async () => {
    const data = {
      ...turnoverData,
      cleaners: [
        {
          id: 'later',
          available: [{ start: '2026-06-01T10:30:00Z', end: '2026-06-01T14:00:00Z' }],
          assignments: [],
        },
        ...turnoverData.cleaners,
      ],
    };
    expect((await runTurnover(data)).proposed_cleaner_id).toBe('crew');
    expect((await runTurnover(data, { cleaner_id: 'later' })).proposed_cleaner_id).toBe('later');
    expect((await runTurnover(data, { cleaner_id: 'absent' })).feasible).toBe(false);
    expect((await runTurnover({ ...data, complete: false })).feasible).toBe(false);
    expect((await runTurnover({ ...data, cleaners: [] })).proposed_cleaner_id).toBeNull();
  });
  it('offset-equivalent timestamps and DST transition use elapsed UTC arithmetic', async () => {
    const equivalent = await runTurnover(turnoverData, {
      checkout_at: '2026-06-01T12:00:00+02:00',
      checkin_at: '2026-06-01T15:00:00+02:00',
    });
    expect(equivalent).toEqual(await runTurnover());
    expect(equivalent.local_window).toContain('Europe/Berlin');
    const dst = await runTurnover(
      {
        ...turnoverData,
        tasks: [{ id: 'short', title: 'Short cleaning', duration_min: 30 }],
        buffer_min: 15,
        cleaners: [
          {
            id: 'crew',
            available: [{ start: '2026-10-25T01:00:00+02:00', end: '2026-10-25T05:00:00+01:00' }],
            assignments: [],
          },
        ],
      },
      { checkout_at: '2026-10-25T01:30:00+02:00', checkin_at: '2026-10-25T03:30:00+01:00' },
    );
    expect(dst.window_minutes).toBe(180);
    expect(dst.required_duration_min).toBe(45);
    expect(dst.feasible).toBe(true);
  });
  it('rejects duplicate task/cleaner IDs, excessive tasks, reversed intervals and timezone-free dates', () => {
    for (const data of [
      { ...turnoverData, tasks: [turnoverData.tasks[0], turnoverData.tasks[0]] },
      { ...turnoverData, cleaners: [turnoverData.cleaners[0], turnoverData.cleaners[0]] },
      {
        ...turnoverData,
        tasks: Array.from({ length: 31 }, (_, i) => ({
          id: String(i),
          title: 'x',
          duration_min: 1,
        })),
      },
      {
        ...turnoverData,
        cleaners: [
          {
            id: 'crew',
            available: [{ start: '2026-06-01T11:00:00Z', end: '2026-06-01T10:00:00Z' }],
            assignments: [],
          },
        ],
      },
    ])
      expect(TurnoverInput.safeParse({ ...turnoverBase, host_data: data }).success).toBe(false);
    expect(
      TurnoverInput.safeParse({
        ...turnoverBase,
        checkout_at: '2026-06-01T10:00:00',
        host_data: turnoverData,
      }).success,
    ).toBe(false);
  });
});

describe('[FLOW] actual provided-data host composition', () => {
  it('plans, executes and validates three actual engines while retaining provenance and approval', async () => {
    const log = { info: vi.fn(), error: vi.fn() } as unknown as Logger;
    const tools = mockTools(log);
    const engine = new WorkflowEngine(tools),
      tool = buildWorkflowTool(engine);
    const steps = [
      {
        id: 'report',
        tool: 'host_insights',
        arguments: { mode: 'provided', listing_id: 'L', host_data: insightsData },
      },
      {
        id: 'prices',
        tool: 'smart_pricing',
        depends_on: ['report'],
        arguments: { ...pricingBase, host_data: pricingData },
      },
      {
        id: 'review',
        tool: 'review_responder',
        depends_on: ['prices'],
        arguments: {
          mode: 'provided',
          review_id: 'R',
          review_text: 'Five stars but dangerous exposed electrical wires',
          rating: 5,
          host_data: { ...metadata, language: 'en' },
        },
      },
    ];
    const plan = WorkflowOutput.parse((await tool.handler({ steps })).structuredContent);
    expect(plan.execution_status).toBe('planned');
    expect(plan.results).toEqual([]);
    const response = await tool.handler({ mode: 'execute', steps });
    expect(response.isError).toBe(false);
    const out = WorkflowOutput.parse(response.structuredContent);
    expect(out.execution_status).toBe('verified');
    expect(out.summary.completed).toBe(3);
    expect(out.results.map((r) => r.source)).toEqual(['provided', 'provided', 'provided']);
    expect(out.summary.approval_required).toBe(true);
    expect(out.results[0]?.output).toMatchObject({ occupancy_rate: 0.4, revenue: 1000 });
    expect(out.results[1]?.output).toMatchObject({
      daily_prices: [{ suggested: 120 }, { suggested: 100 }, { suggested: 100 }],
    });
    expect(out.results[2]?.output).toMatchObject({
      needs_escalation: true,
      approval_required: true,
    });
    engine.close();
  });
});
