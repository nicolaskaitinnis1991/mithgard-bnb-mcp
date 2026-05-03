import { describe, it, expect, vi } from 'vitest';
import { searchHandler, type SearchDeps } from '../../src/tools/search/handler.js';
import { ok } from '../../src/lib/result.js';

describe('searchHandler', () => {
  it('returns parsed results', async () => {
    const deps: SearchDeps = {
      http: { get: vi.fn().mockResolvedValue(ok('<html/>')) },
      cache: { get: vi.fn(), set: vi.fn() },
      parse: vi.fn().mockReturnValue(
        ok({
          listings: [
            {
              id: '1',
              title: 'Hut',
              url: 'https://x',
              price_per_night: 50,
              currency: 'EUR',
              location: 'B',
            },
          ],
          total: 1,
        }),
      ),
    };
    const h = searchHandler(deps);
    const r = await h({ location: 'Berlin', adults: 2, children: 0, currency: 'EUR' });
    expect(r.ok).toBe(true);
  });
});
