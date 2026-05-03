import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import { createHttpClient } from '../../src/lib/http.js';
import { isOk, isErr } from '../../src/lib/result.js';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(() => {
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);

  const pool = mockAgent.get('https://example.test');
  pool.intercept({ path: '/ok', method: 'GET' }).reply(200, 'hello');
  pool.intercept({ path: '/500', method: 'GET' }).reply(500, 'boom');
});

afterAll(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

describe('http client', () => {
  const client = createHttpClient({ ratePerSec: 100, ratePerHour: 100_000, userAgent: 'test' });
  it('returns body on 200', async () => {
    const r = await client.get('https://example.test/ok');
    expect(isOk(r)).toBe(true);
    if (isOk(r)) expect(r.value).toBe('hello');
  });
  it('surfaces 500', async () => {
    const r = await client.get('https://example.test/500');
    expect(isErr(r)).toBe(true);
  });
});
