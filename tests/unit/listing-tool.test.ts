import { describe, it, expect, vi } from 'vitest';
import { buildListingDetailsTool } from '../../src/tools/listing-details/tool.js';
import { ok } from '../../src/lib/result.js';
import type { ListingDeps } from '../../src/tools/listing-details/handler.js';

describe('buildListingDetailsTool', () => {
  it('exposes airbnb_listing_details name', () => {
    const deps: ListingDeps = {
      http: { get: vi.fn() },
      cache: { get: () => undefined, set: () => undefined },
      parse: () =>
        ok({
          listing: {
            id: '1',
            title: '',
            url: 'https://x',
            price_per_night: 0,
            currency: 'EUR',
            location: '',
            description: '',
            amenities: [],
            bedrooms: 0,
            bathrooms: 0,
            max_guests: 0,
          },
          reviews_summary: { total: 0, average: 0 },
          host_summary: { name: '', superhost: false, joined: '' },
        }),
    };
    const t = buildListingDetailsTool(deps);
    expect(t.name).toBe('airbnb_listing_details');
  });
});
