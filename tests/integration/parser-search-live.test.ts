import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { parseSearchResults, parseListingDetails } from '../../src/parsers/airbnb-public.js';
import { isOk } from '../../src/lib/result.js';

// Real Airbnb HTML captured 2026-05-04 from
//   https://www.airbnb.com/s/Berlin/homes
//   https://www.airbnb.com/rooms/1867179
// These fixtures exercise the modern niobeClientData / stayProductDetailPage shape
// (the live shape as of 2026-05). The legacy synthesized fixture in
// `tests/integration/fixtures/search-berlin.html` exercises the fallback walker.

const SEARCH_FIXTURE = 'tests/integration/fixtures/live-2026-05-04/search-berlin.html';
const LISTING_FIXTURE = 'tests/integration/fixtures/live-2026-05-04/listing-1867179.html';

describe('parseSearchResults — live fixture (2026-05-04)', () => {
  if (!existsSync(SEARCH_FIXTURE)) {
    it.skip('live fixture not present', () => {
      // intentionally empty: skip stub
    });
    return;
  }
  const html = readFileSync(SEARCH_FIXTURE, 'utf-8');

  it('extracts at least 5 listings from real Airbnb HTML', () => {
    const r = parseSearchResults(html, {
      location: 'Berlin',
      adults: 2,
      children: 0,
      currency: 'EUR',
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.listings.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('every listing has numeric id, title, and a positive price', () => {
    const r = parseSearchResults(html, {
      location: 'Berlin',
      adults: 2,
      children: 0,
      currency: 'EUR',
    });
    if (isOk(r)) {
      for (const l of r.value.listings) {
        expect(l.id).toMatch(/^\d+$/);
        expect(l.title.length).toBeGreaterThan(0);
        expect(l.price_per_night).toBeGreaterThan(0);
        expect(l.url).toBe(`https://www.airbnb.com/rooms/${l.id}`);
      }
    }
  });

  it('captures rating + review_count when present', () => {
    const r = parseSearchResults(html, {
      location: 'Berlin',
      adults: 2,
      children: 0,
      currency: 'EUR',
    });
    if (isOk(r)) {
      const withRating = r.value.listings.filter((l) => l.rating !== undefined);
      // At least some listings carry a rating; we don't require all (new listings have none)
      expect(withRating.length).toBeGreaterThan(0);
      for (const l of withRating) {
        expect(l.rating).toBeGreaterThan(0);
        expect(l.rating).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe('parseListingDetails — live fixture (2026-05-04)', () => {
  if (!existsSync(LISTING_FIXTURE)) {
    it.skip('live fixture not present', () => {
      // intentionally empty: skip stub
    });
    return;
  }
  const html = readFileSync(LISTING_FIXTURE, 'utf-8');

  it('extracts core listing fields', () => {
    const r = parseListingDetails(html, '1867179');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.listing.title.length).toBeGreaterThan(0);
      expect(r.value.listing.bedrooms).toBeGreaterThan(0);
      expect(r.value.listing.max_guests).toBeGreaterThan(0);
      expect(r.value.listing.amenities.length).toBeGreaterThan(0);
      expect(r.value.listing.location).toBe('Berlin');
      expect(r.value.listing.url).toBe('https://www.airbnb.com/rooms/1867179');
    }
  });

  it('extracts reviews summary with category ratings', () => {
    const r = parseListingDetails(html, '1867179');
    if (isOk(r)) {
      expect(r.value.reviews_summary.total).toBeGreaterThan(0);
      expect(r.value.reviews_summary.average).toBeGreaterThan(0);
      expect(r.value.reviews_summary.average).toBeLessThanOrEqual(5);
      const cat = r.value.reviews_summary.by_category;
      expect(cat).toBeDefined();
      if (cat !== undefined) {
        expect(cat.cleanliness).toBeGreaterThan(0);
      }
    }
  });

  it('extracts host name + superhost flag', () => {
    const r = parseListingDetails(html, '1867179');
    if (isOk(r)) {
      expect(r.value.host_summary.name.length).toBeGreaterThan(0);
      expect(typeof r.value.host_summary.superhost).toBe('boolean');
    }
  });
});
