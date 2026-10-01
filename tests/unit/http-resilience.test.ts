import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MockAgent, setGlobalDispatcher, getGlobalDispatcher, type Dispatcher } from 'undici';
import { createHttpClient } from '../../src/lib/http.js';

let originalDispatcher: Dispatcher;
let mockAgent: MockAgent;

beforeAll(() => {
  originalDispatcher = getGlobalDispatcher();
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterAll(async () => {
  await mockAgent.close();
  setGlobalDispatcher(originalDispatcher);
});

const client = (options: Partial<Parameters<typeof createHttpClient>[0]> = {}) =>
  createHttpClient({
    ratePerSec: 1000,
    ratePerHour: 1000,
    userAgent: 'test',
    jitterMs: 0,
    ...options,
  });

describe('bounded HTTP transport', () => {
  it('rejects invalid numeric configuration before starting the queue', () => {
    expect(() => client({ ratePerSec: 0 })).toThrow('Invalid HTTP option');
    expect(() => client({ timeoutMs: Infinity })).toThrow('Invalid HTTP option');
    expect(() => client({ maxRetries: -1 })).toThrow('Invalid HTTP option');
  });
  it('returns network exceptions as a Result', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/network' })
      .replyWithError(new Error('offline'));
    const http = client();
    expect(await http.get('https://resilience.test/network')).toMatchObject({
      ok: false,
      error: { kind: 'TransportFailed', reason: 'Network' },
    });
    await http.close();
  });

  it('consumes 429 bodies and retries exactly within the configured budget', async () => {
    const pool = mockAgent.get('https://resilience.test');
    pool
      .intercept({ path: '/retry' })
      .reply(429, 'rate-limit-body', { headers: { 'retry-after': '0' } });
    pool.intercept({ path: '/retry' }).reply(200, 'ok');
    const http = client();
    expect(await http.get('https://resilience.test/retry')).toEqual({ ok: true, value: 'ok' });
    expect(http.status()).toMatchObject({ attempts: 2, response_bytes: 17, completed: 1 });
    await http.close();
  });

  it('returns the final 429 after maxRetries without an additional attempt', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/exhausted' })
      .reply(429, 'x', { headers: { 'retry-after': '0' } })
      .times(3);
    const http = client({ maxRetries: 2 });
    expect(await http.get('https://resilience.test/exhausted')).toMatchObject({
      ok: false,
      error: { kind: 'RateLimited', retry_after_ms: 0 },
    });
    expect(http.status().attempts).toBe(3);
    await http.close();
  });

  it('parses HTTP-date Retry-After and returns long delays without retrying early', async () => {
    const retryAt = new Date(Date.now() + 60_000).toUTCString();
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/date' })
      .reply(429, '', { headers: { 'retry-after': retryAt } });
    const http = client({ maxRetryAfterMs: 100, timeoutMs: 500 });
    const result = await http.get('https://resilience.test/date');
    expect(result).toMatchObject({ ok: false, error: { kind: 'RateLimited' } });
    if (!result.ok && result.error.kind === 'RateLimited') {
      expect(result.error.retry_after_ms).toBeGreaterThan(58_000);
      expect(result.error.retry_after_ms).toBeLessThanOrEqual(60_000);
    }
    expect(http.status().attempts).toBe(1);
    await http.close();
  });

  it('uses a finite backoff for malformed Retry-After', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/malformed' })
      .reply(429, '', { headers: { 'retry-after': '-1' } });
    const http = client({ timeoutMs: 100 });
    expect(await http.get('https://resilience.test/malformed')).toMatchObject({
      ok: false,
      error: { kind: 'RateLimited', retry_after_ms: 5000 },
    });
    await http.close();
  });

  it('applies upstream Retry-After to independent calls on the same origin', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/origin-limit' })
      .reply(429, '', { headers: { 'retry-after': '60' } });
    const http = client({ timeoutMs: 100 });
    expect(await http.get('https://resilience.test/origin-limit')).toMatchObject({
      ok: false,
      error: { kind: 'RateLimited' },
    });
    expect(await http.get('https://resilience.test/another-path')).toMatchObject({
      ok: false,
      error: { kind: 'RateLimited' },
    });
    expect(http.status().attempts).toBe(1);
    await http.close();
  });

  it('does not shorten a numeric Retry-After that overflows a timer', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/overflow' })
      .reply(429, '', { headers: { 'retry-after': '9'.repeat(100) } });
    const http = client();
    expect(await http.get('https://resilience.test/overflow')).toMatchObject({
      ok: false,
      error: { kind: 'RateLimited', retry_after_ms: Number.MAX_SAFE_INTEGER },
    });
    expect(http.status().attempts).toBe(1);
    await http.close();
  });

  it('bounds body size before parsing or retaining the whole response', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/large' })
      .reply(200, 'too much data');
    const http = client({ maxResponseBytes: 4 });
    expect(await http.get('https://resilience.test/large')).toMatchObject({
      ok: false,
      error: { kind: 'TransportFailed', reason: 'ResponseTooLarge' },
    });
    await http.close();
  });

  it('returns an hourly budget error without waiting for a one-hour queue timer', async () => {
    const pool = mockAgent.get('https://resilience.test');
    pool.intercept({ path: '/hour' }).reply(200, 'ok');
    const http = client({ ratePerHour: 1 });
    expect(await http.get('https://resilience.test/hour')).toMatchObject({ ok: true });
    const start = Date.now();
    expect(await http.get('https://resilience.test/hour')).toMatchObject({
      ok: false,
      error: { kind: 'RateLimited' },
    });
    expect(Date.now() - start).toBeLessThan(1000);
    expect(http.status().attempts).toBe(1);
    await http.close();
  });

  it('rejects redirects as an upstream HTTP error', async () => {
    mockAgent
      .get('https://resilience.test')
      .intercept({ path: '/redirect' })
      .reply(302, '', { headers: { location: 'https://other.test/' } });
    const http = client();
    expect(await http.get('https://resilience.test/redirect')).toMatchObject({
      ok: false,
      error: { kind: 'UpstreamHTTP', status: 302 },
    });
    await http.close();
  });
});
