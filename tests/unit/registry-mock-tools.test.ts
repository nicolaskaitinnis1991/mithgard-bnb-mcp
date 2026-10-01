import { describe, it, expect, vi } from 'vitest';
import type { Logger } from 'pino';
import { mockTools, allTools, type AppDeps } from '../../src/tools/index.js';

const silentLogger = (): Logger => ({ info: vi.fn(), error: vi.fn() }) as unknown as Logger;

const stubDeps: AppDeps = {
  search: {
    http: { get: () => Promise.resolve({ ok: true as const, value: '<html/>' }) },
    cache: { get: () => undefined, set: () => undefined },
    parse: () => ({ ok: true as const, value: { listings: [], total: 0 } }),
  },
  listing: {
    http: { get: () => Promise.resolve({ ok: true as const, value: '<html/>' }) },
    cache: { get: () => undefined, set: () => undefined },
    parse: () => ({
      ok: true as const,
      value: {
        listing: {
          id: 'x',
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
      },
    }),
  },
  log: silentLogger(),
};

describe('tool registry — mock tools', () => {
  it('exposes exactly 7 mock tools by expected names', () => {
    const names = mockTools(silentLogger()).map((t) => t.name);
    expect(names).toEqual([
      'host_insights',
      'guest_message_assistant',
      'booking_request_triage',
      'smart_pricing',
      'calendar_optimizer',
      'review_responder',
      'turnover_coordinator',
    ]);
  });

  it('exposes 9 tools total (2 live + 7 mock)', () => {
    expect(allTools(stubDeps)).toHaveLength(9);
  });

  it('every host tool is described as local analysis with an explicit demo fallback', () => {
    for (const t of mockTools(silentLogger())) {
      expect(t.description).toMatch(/^\[LOCAL\]/);
      expect(t.description).toMatch(/demo/i);
      expect(t.inputSchema.properties).toHaveProperty('host_data');
      expect(t.inputSchema.properties).toHaveProperty('mode');
    }
  });

  const findMock = (name: string) => {
    const t = mockTools(silentLogger()).find((m) => m.name === name);
    if (t === undefined) throw new Error(`mock tool not found: ${name}`);
    return t;
  };

  const decode = (r: { content: { type: 'text'; text: string }[] }): unknown => {
    const first = r.content[0];
    if (first === undefined) throw new Error('empty content');
    return JSON.parse(first.text);
  };

  it('host_insights — handler returns _mock and _pitch', async () => {
    const tool = findMock('host_insights');
    const out = decode(await tool.handler({ listing_id: 'L-1' })) as Record<string, unknown>;
    expect(out._mock).toBe(true);
    expect(typeof out._pitch).toBe('string');
  });

  it('guest_message_assistant — handler returns 3 suggestions', async () => {
    const tool = findMock('guest_message_assistant');
    const out = decode(
      await tool.handler({
        thread_id: 't',
        last_message: 'wifi please',
        host_voice: 'warm',
      }),
    ) as { suggestions: unknown[]; _mock: boolean };
    expect(out._mock).toBe(true);
    expect(out.suggestions).toHaveLength(3);
  });

  it('smart_pricing — handler returns daily prices', async () => {
    const tool = findMock('smart_pricing');
    const out = decode(
      await tool.handler({
        listing_id: 'L-1',
        from: '2026-06-01',
        to: '2026-06-03',
      }),
    ) as { daily_prices: unknown[]; _mock: boolean };
    expect(out._mock).toBe(true);
    expect(out.daily_prices.length).toBeGreaterThan(0);
  });
});
