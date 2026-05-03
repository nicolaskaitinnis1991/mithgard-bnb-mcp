import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseListingDetails } from '../../src/parsers/airbnb-public.js';
import { isOk } from '../../src/lib/result.js';

describe('parseListingDetails', () => {
  const html = readFileSync('tests/integration/fixtures/listing-12345.html', 'utf-8');
  it('extracts listing title and bedrooms', () => {
    const r = parseListingDetails(html, '12345');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) {
      expect(r.value.listing.title).toBe('Sunny apartment with skyline view');
      expect(r.value.listing.bedrooms).toBe(2);
    }
  });
  it('extracts reviews summary average', () => {
    const r = parseListingDetails(html, '12345');
    if (isOk(r)) {
      expect(r.value.reviews_summary.average).toBeCloseTo(4.87, 2);
      expect(r.value.reviews_summary.total).toBe(128);
    }
  });
  it('extracts host summary', () => {
    const r = parseListingDetails(html, '12345');
    if (isOk(r)) {
      expect(r.value.host_summary.name).toBe('Anna');
      expect(r.value.host_summary.superhost).toBe(true);
    }
  });
});
