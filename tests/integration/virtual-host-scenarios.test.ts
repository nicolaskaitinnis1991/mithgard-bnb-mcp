import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { SearchInput } from '../../src/tools/search/schema.js';
import {
  ListingDetailsInput,
  ListingDetailsOutput,
} from '../../src/tools/listing-details/schema.js';
import { SmartPricingInput } from '../../src/tools/smart-pricing/schema.js';
import { BookingTriageInput } from '../../src/tools/booking-request-triage/schema.js';
import { TurnoverInput } from '../../src/tools/turnover-coordinator/schema.js';
import { searchHandler, type SearchDeps } from '../../src/tools/search/handler.js';
import { listingHandler, type ListingDeps } from '../../src/tools/listing-details/handler.js';
import { guestMessageHandler } from '../../src/tools/guest-message-assistant/handler.js';
import { bookingTriageHandler } from '../../src/tools/booking-request-triage/handler.js';
import { turnoverHandler } from '../../src/tools/turnover-coordinator/handler.js';
import { calendarOptimizerHandler } from '../../src/tools/calendar-optimizer/handler.js';
import { ReviewResponderInput } from '../../src/tools/review-responder/schema.js';
import { reviewResponderHandler } from '../../src/tools/review-responder/handler.js';
import { hostInsightsHandler } from '../../src/tools/host-insights/handler.js';
import { parseSearchResults, parseListingDetails } from '../../src/parsers/airbnb-public.js';
import { ok } from '../../src/lib/result.js';

// Synthetic role-based acceptance scenarios, not a human usability study.
const html = (data: unknown): string =>
  `<script id="data-deferred-state-0">${JSON.stringify(data)}</script>`;
const searchPage = (price: unknown, title: unknown = 'Apartment in Berlin'): string =>
  html({
    niobeClientData: [
      [
        null,
        {
          data: {
            presentation: {
              staysSearch: {
                results: {
                  searchResults: [
                    {
                      demandStayListing: {
                        id: Buffer.from('DemandStayListing:1').toString('base64'),
                      },
                      title,
                      structuredDisplayPrice: price,
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    ],
  });
const query = SearchInput.parse({ location: 'Berlin' });

const modernListingPage = (
  sharing: unknown = { title: '1 bedroom · 1.5 baths', personCapacity: 2 },
): string =>
  html({
    niobeClientData: [
      [
        null,
        {
          data: {
            presentation: {
              stayProductDetailPage: {
                sections: { metadata: { sharingConfig: sharing }, sections: [] },
              },
            },
          },
        },
      ],
    ],
  });

describe('virtual host: trustworthy public market research', () => {
  it('keeps stay total separate from explicit nightly amount in the saved live fixture', () => {
    const result = parseSearchResults(
      readFileSync('tests/integration/fixtures/live-2026-05-04/search-berlin.html', 'utf8'),
      query,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const listing = result.value.listings[0];
    expect(listing?.display_price).toBe(736);
    expect(listing?.price_basis).toBe('stay_total');
    expect(listing?.price_per_night).toBe(147.17);
  });

  it.each([
    ['€ 1.234,56', 1234.56, 'EUR'],
    ['€ 99,99', 99.99, 'EUR'],
    ['£1,234.56', 1234.56, 'GBP'],
    ['CHF 1\u202f234.50', 1234.5, 'CHF'],
  ])('preserves localized price %s', (price, amount, currency) => {
    const result = parseSearchResults(
      searchPage({ primaryLine: { price, qualifier: 'night' } }),
      query,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.listings[0]?.price_per_night).toBe(amount);
    expect(result.value.listings[0]?.currency).toBe(currency);
  });

  it('does not present a stay-total-only or missing quote as a nightly price', () => {
    for (const price of [{ primaryLine: { price: '€ 600', qualifier: 'total' } }, null]) {
      const result = parseSearchResults(searchPage(price), query);
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value.listings[0]?.price_per_night).toBeNull();
    }
  });

  it('returns unknown details as null and preserves fractional bathrooms', () => {
    const result = parseListingDetails(modernListingPage(), '1');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.listing.price_per_night).toBeNull();
    expect(result.value.listing.currency).toBeNull();
    expect(result.value.listing.bathrooms).toBe(1.5);
    expect(result.value.reviews_summary.average).toBeNull();
    expect(result.value.reviews_summary.by_category).toBeUndefined();
    expect(result.value.host_summary.superhost).toBeNull();
    expect(ListingDetailsOutput.safeParse({ ...result.value, _source: 'public' }).success).toBe(
      true,
    );
  });

  it('handles hostile but valid embedded JSON shapes without throwing', () => {
    const prices = [
      null,
      12,
      { primaryLine: { price: 12 } },
      { primaryLine: { accessibilityLabel: [] } },
    ];
    for (const price of prices)
      expect(() => parseSearchResults(searchPage(price, {}), query)).not.toThrow();
    for (const sharing of [null, [], 5, { title: [], personCapacity: 'two' }]) {
      expect(() => parseListingDetails(modernListingPage(sharing), '1')).not.toThrow();
    }
    const novel = parseSearchResults(html({ completely_new_shape: true }), query);
    expect(novel.ok).toBe(false);
    const empty = parseSearchResults(
      html({
        niobeClientData: [
          [null, { data: { presentation: { staysSearch: { results: { searchResults: [] } } } } }],
        ],
      }),
      query,
    );
    expect(empty.ok && empty.value.listings.length).toBe(0);
  });

  it('isolates EUR and USD cache keys and passes requested currency upstream', async () => {
    const values = new Map<string, unknown>();
    const http = vi.fn().mockResolvedValue(ok('<html/>'));
    const deps: SearchDeps = {
      http: { get: http },
      cache: {
        get: (key) => values.get(key),
        set: (key, value) => {
          values.set(key, value);
        },
      },
      parse: () => ok({ listings: [], total: 0 }),
    };
    const handler = searchHandler(deps);
    await handler(query);
    const result = await handler({ ...query, currency: 'USD' });
    await handler(query);
    expect(http).toHaveBeenCalledTimes(2);
    expect(new URL(String(http.mock.calls[0]?.[0])).searchParams.get('currency')).toBe('EUR');
    expect(new URL(String(http.mock.calls[1]?.[0])).searchParams.get('currency')).toBe('USD');
    expect(result.ok && result.value).toMatchObject({ query: { currency: 'USD' } });
  });

  it('isolates listing date windows and forwards the requested dates', async () => {
    const values = new Map<string, unknown>();
    const http = vi.fn().mockResolvedValue(ok('<html/>'));
    const parsed = parseListingDetails(modernListingPage(), '1');
    const deps: ListingDeps = {
      http: { get: http },
      cache: {
        get: (key) => values.get(key),
        set: (key, value) => {
          values.set(key, value);
        },
      },
      parse: () => parsed,
    };
    const handler = listingHandler(deps);
    await handler({ listing_id: '1', checkin: '2026-10-01', checkout: '2026-10-04' });
    await handler({ listing_id: '1', checkin: '2026-10-11', checkout: '2026-10-14' });
    expect(http).toHaveBeenCalledTimes(2);
    expect(new URL(String(http.mock.calls[1]?.[0])).searchParams.get('check_in')).toBe(
      '2026-10-11',
    );
    expect(new URL(String(http.mock.calls[1]?.[0])).searchParams.get('check_out')).toBe(
      '2026-10-14',
    );
  });
});

describe('virtual host: reject misleading dates and impossible schedules', () => {
  it.each(['2026-02-30', '2026-06-31', '2026-13-01'])('rejects impossible date %s', (date) => {
    expect(
      SearchInput.safeParse({ location: 'Berlin', checkin: date, checkout: '2027-01-01' }).success,
    ).toBe(false);
    expect(
      SmartPricingInput.safeParse({ listing_id: '1', from: date, to: '2027-01-01' }).success,
    ).toBe(false);
  });

  it('rejects reversed stays, partial dates, reversed price bounds, and unsafe listing paths', () => {
    expect(
      SearchInput.safeParse({ location: 'Berlin', checkin: '2026-10-04', checkout: '2026-10-01' })
        .success,
    ).toBe(false);
    expect(SearchInput.safeParse({ location: 'Berlin', checkin: '2026-10-01' }).success).toBe(
      false,
    );
    expect(
      SearchInput.safeParse({ location: 'Berlin', min_price: 200, max_price: 100 }).success,
    ).toBe(false);
    expect(ListingDetailsInput.safeParse({ listing_id: '../s/Berlin/homes' }).success).toBe(false);
    expect(ListingDetailsInput.safeParse({ listing_id: Number.MAX_SAFE_INTEGER + 1 }).success).toBe(
      false,
    );
  });

  it('rejects silent pricing truncation and reversed windows', () => {
    expect(
      SmartPricingInput.safeParse({ listing_id: '1', from: '2026-10-01', to: '2026-10-31' })
        .success,
    ).toBe(false);
    expect(
      SmartPricingInput.safeParse({ listing_id: '1', from: '2026-10-31', to: '2026-10-01' })
        .success,
    ).toBe(false);
  });

  it.each([
    '2026-02-30T11:00:00Z',
    '2026-10-01T25:00:00Z',
    '2026-10-01T11:00',
    '2026-10-01T11:00garbage',
  ])('rejects impossible or timezone-ambiguous datetime %s', (datetime) => {
    expect(
      TurnoverInput.safeParse({
        listing_id: '1',
        checkout_at: datetime,
        checkin_at: '2027-01-01T15:00:00Z',
      }).success,
    ).toBe(false);
  });

  it('flags a 30-minute turnover which cannot fit a 90-150 minute cleaning estimate', async () => {
    const input = TurnoverInput.parse({
      listing_id: '1',
      checkout_at: '2026-10-01T11:00:00+02:00',
      checkin_at: '2026-10-01T11:30:00+02:00',
    });
    const result = await turnoverHandler(input);
    expect(result.window_minutes).toBe(30);
    expect(result.feasible).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('exceeds'))).toBe(true);
    expect(result.approval_required).toBe(true);
    expect(result.brief).toContain('09:00 UTC');
    expect(
      TurnoverInput.safeParse({ ...input, checkin_at: '2026-10-01T10:00:00+02:00' }).success,
    ).toBe(false);
  });

  it('keeps all synthetic gaps in the requested horizon without overlap or block revenue', async () => {
    for (const horizon of [30, 60, 90] as const) {
      for (let i = 0; i < 100; i++) {
        const result = await calendarOptimizerHandler({
          listing_id: `host-${String(i)}`,
          reference_date: '2026-10-01',
          horizon_days: horizon,
        });
        let previousEnd = '2026-10-01';
        for (const gap of result.gaps) {
          expect(gap.start >= previousEnd).toBe(true);
          expect(Date.parse(gap.end) - Date.parse('2026-10-01')).toBeLessThanOrEqual(
            horizon * 86400000,
          );
          expect(Date.parse(gap.end) - Date.parse(gap.start)).toBe(gap.nights * 86400000);
          previousEnd = gap.end;
        }
        expect(result.potential_recovery_eur).toBe(
          result.gaps
            .filter((gap) => gap.suggestion !== 'block')
            .reduce((sum, gap) => sum + gap.cost_estimate_eur, 0),
        );
      }
    }
  });

  it('uses the requested reference date for account age and insight windows', async () => {
    const request = {
      thread_id: 't',
      guest_profile: { joined: '2026-01-01', reviews: 0, verified: false },
      trip: { adults: 2, children: 0, pets: false, nights: 1 },
    };
    const spring = await bookingTriageHandler({ ...request, reference_date: '2026-05-03' });
    const autumn = await bookingTriageHandler({ ...request, reference_date: '2026-10-01' });
    expect(spring.risk_score).toBe(100);
    expect(autumn.risk_score).toBe(85);
    expect(autumn.approval_required).toBe(true);
    expect(autumn.recommendation).toBe('decline_after_review');
    expect(BookingTriageInput.safeParse({ ...request, reference_date: '2025-01-01' }).success).toBe(
      false,
    );
    const insights = await hostInsightsHandler({
      listing_id: '1',
      period: 'last_30d',
      reference_date: '2026-10-01',
    });
    expect(
      insights.pricing_recommendations.every((recommendation) =>
        recommendation.date_range.startsWith('2026-10-'),
      ),
    ).toBe(true);
  });
});

describe('virtual host: messages require verified facts and human review', () => {
  it.each(['What is the wifi password?', 'Is late check-in okay?', 'Can I bring my dog?'])(
    'does not invent house facts for %s',
    async (lastMessage) => {
      const result = await guestMessageHandler({
        thread_id: 't',
        last_message: lastMessage,
        host_voice: 'warm',
      });
      const drafts = result.suggestions.map((suggestion) => suggestion.text).join(' ');
      expect(drafts).not.toMatch(/welcome2026|BnBGuest|15:00|24\/7|20 EUR|pets are welcome/i);
      expect(result.missing_context.length).toBeGreaterThan(0);
      expect(result.approval_required).toBe(true);
      expect(result._mock).toBe(true);
    },
  );

  it('does not mistake vacation or translation for pet or late-arrival topics', async () => {
    for (const message of ['I am on vacation', 'Please translate this']) {
      const result = await guestMessageHandler({
        thread_id: 't',
        last_message: message,
        host_voice: 'warm',
      });
      expect(result.missing_context).toEqual(['Reservation and message context']);
    }
  });

  it.each([
    { rating: 5, reviewText: 'The gas leak made us feel unsafe.' },
    { rating: 4, reviewText: 'We saw mold in the bathroom.' },
    { rating: 1, reviewText: 'Never again.' },
    { rating: 3, reviewText: 'Die Wohnung hatte Schimmel.' },
  ])(
    'requires review for rating $rating and serious/negative text',
    async ({ rating, reviewText }) => {
      const result = await reviewResponderHandler(
        ReviewResponderInput.parse({
          review_id: 'r',
          review_text: reviewText,
          rating,
          host_voice: 'warm',
        }),
      );
      expect(result.needs_escalation).toBe(true);
      expect(result.approval_required).toBe(true);
      expect(result.sentiment).not.toBe('positive');
    },
  );
});
