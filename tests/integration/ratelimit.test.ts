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
    // 5 requests at 1/sec → at least 4 seconds of inter-request spacing.
    expect(elapsed).toBeGreaterThanOrEqual(4_000);
  }, 15_000);
});
