import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import { createHttpClient } from '../../src/lib/http.js';
import { isOk } from '../../src/lib/result.js';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(() => {
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);

  const pool = mockAgent.get('https://rl.example.test');
  for (let i = 0; i < 10; i++) {
    pool.intercept({ path: `/r${String(i)}`, method: 'GET' }).reply(200, 'ok');
  }
});

afterAll(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

describe('rate limiter', () => {
  it('enforces 1 req/sec across 5 sequential calls', async () => {
    const client = createHttpClient({ ratePerSec: 1, ratePerHour: 100, userAgent: 'test' });
    const start = Date.now();
    for (let i = 0; i < 5; i++) {
      const r = await client.get(`https://rl.example.test/r${String(i)}`);
      expect(isOk(r)).toBe(true);
    }
    const elapsed = Date.now() - start;
    // 5 requests at 1/sec → 4 inter-request gaps of ≥1s each.
    // Tolerance band:
    //   lower (3_800ms): catches "rate limiter is broken" (no spacing at all).
    //   upper (5_500ms): catches "something is hanging" / pathological scheduler.
    // A small slack below 4_000ms absorbs sub-second clock jitter that vitest
    // retry: 1 doesn't help with on the lower bound.
    expect(elapsed).toBeGreaterThan(3_800);
    expect(elapsed).toBeLessThan(5_500);
  }, 15_000);
});
