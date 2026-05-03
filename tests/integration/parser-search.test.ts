import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseSearchResults } from '../../src/parsers/airbnb-public.js';
import { isOk } from '../../src/lib/result.js';

describe('parseSearchResults', () => {
  const html = readFileSync('tests/integration/fixtures/search-berlin.html', 'utf-8');
  it('extracts at least 10 listings', () => {
    const r = parseSearchResults(html, {
      location: 'Berlin',
      adults: 2,
      children: 0,
      currency: 'EUR',
    });
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value.listings.length).toBeGreaterThanOrEqual(10);
  });
  it('each listing has id, title, price', () => {
    const r = parseSearchResults(html, {
      location: 'Berlin',
      adults: 2,
      children: 0,
      currency: 'EUR',
    });
    if (isOk(r)) {
      for (const l of r.value.listings) {
        expect(l.id).toBeTruthy();
        expect(l.title).toBeTruthy();
        expect(l.price_per_night).toBeGreaterThan(0);
      }
    }
  });
});
