import { describe, it, expect, vi } from 'vitest';
import { listingHandler, type ListingDeps } from '../../src/tools/listing-details/handler.js';
import { ok } from '../../src/lib/result.js';

describe('listingHandler', () => {
  it('returns parsed listing details', async () => {
    const deps: ListingDeps = {
      http: { get: vi.fn().mockResolvedValue(ok('<html/>')) },
      cache: { get: vi.fn(), set: vi.fn() },
      parse: vi.fn().mockReturnValue(
        ok({
          listing: {
            id: '12345',
            title: 'Hut',
            url: 'https://www.airbnb.com/rooms/12345',
            price_per_night: 110,
            currency: 'EUR',
            location: 'Berlin',
            description: 'desc',
            amenities: ['Wifi'],
            bedrooms: 2,
            bathrooms: 1,
            max_guests: 4,
          },
          reviews_summary: { total: 128, average: 4.87 },
          host_summary: { name: 'Anna', superhost: true, joined: '2018-03-01' },
        }),
      ),
    };
    const h = listingHandler(deps);
    const r = await h({ listing_id: '12345' });
    expect(r.ok).toBe(true);
  });
});
