import { describe, it, expect } from 'vitest';
import { ListingDetailsInput } from '../../src/tools/listing-details/schema.js';

describe('ListingDetailsInput', () => {
  it('accepts string listing_id', () => {
    const r = ListingDetailsInput.parse({ listing_id: '12345' });
    expect(r.listing_id).toBe('12345');
  });
  it('accepts numeric listing_id', () => {
    const r = ListingDetailsInput.parse({ listing_id: 12345 });
    expect(r.listing_id).toBe(12345);
  });
  it('rejects bad checkin format', () => {
    expect(() =>
      ListingDetailsInput.parse({ listing_id: '12345', checkin: '2026/06/01' }),
    ).toThrow();
  });
});
