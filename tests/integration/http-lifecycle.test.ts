import { createServer, type Server } from 'node:http';
import type { Socket } from 'node:net';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpClient } from '../../src/lib/http.js';
import { OperationsAgent } from '../../src/operations/agent.js';
import { buildOperationsTool } from '../../src/operations/tool.js';
import { createTool, toolError } from '../../src/tools/registry.js';
import { z } from 'zod';
import pino from 'pino';

let server: Server;
let otherServer: Server;
let origin: string;
let otherOrigin: string;
const sockets = new Set<Socket>();
let retryCalls = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === '/hang') return;
    if (req.url === '/retry-wait') {
      retryCalls += 1;
      if (retryCalls === 1) {
        res.writeHead(429, { 'retry-after': '0.1' });
        res.end('wait');
      } else res.end('retried');
      return;
    }
    if (req.url === '/slow-body') {
      res.writeHead(200);
      res.write('x');
      const timer = setInterval(() => res.write('x'), 10);
      res.on('close', () => {
        clearInterval(timer);
      });
      return;
    }
    res.end('ok');
  });
  otherServer = createServer((_req, res) => res.end('ok'));
  for (const listener of [server, otherServer]) {
    listener.on('connection', (socket) => {
      sockets.add(socket);
      socket.on('close', () => sockets.delete(socket));
    });
  }
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('No test server address');
  origin = `http://127.0.0.1:${String(address.port)}`;
  await new Promise<void>((resolve) => otherServer.listen(0, '127.0.0.1', resolve));
  const otherAddress = otherServer.address();
  if (otherAddress === null || typeof otherAddress === 'string')
    throw new Error('No second test server address');
  otherOrigin = `http://127.0.0.1:${String(otherAddress.port)}`;
});

afterAll(async () => {
  for (const socket of sockets) socket.destroy();
  await Promise.all(
    [server, otherServer].map(
      (listener) =>
        new Promise<void>((resolve) =>
          listener.close(() => {
            resolve();
          }),
        ),
    ),
  );
});

const client = (options: Partial<Parameters<typeof createHttpClient>[0]> = {}) =>
  createHttpClient({
    ratePerSec: 1000,
    ratePerHour: 1000,
    userAgent: 'test',
    jitterMs: 0,
    ...options,
  });

describe('HTTP deadline, backpressure and shutdown', () => {
  it('enforces a deadline while headers never arrive', async () => {
    const http = client({ timeoutMs: 80 });
    const start = Date.now();
    expect(await http.get(`${origin}/hang`)).toMatchObject({
      ok: false,
      error: { kind: 'TransportFailed', reason: 'Timeout' },
    });
    expect(Date.now() - start).toBeLessThan(1000);
    await http.close();
  });

  it('enforces total deadline even when body chunks keep arriving', async () => {
    const http = client({ timeoutMs: 80 });
    expect(await http.get(`${origin}/slow-body`)).toMatchObject({
      ok: false,
      error: { kind: 'TransportFailed', reason: 'Timeout' },
    });
    await http.close();
  });

  it('bounds queued work and closes active and queued calls promptly', async () => {
    const http = client({ maxQueueSize: 1 });
    const started = new Promise<void>((resolve) =>
      server.once('request', () => {
        resolve();
      }),
    );
    const first = http.get(`${origin}/hang`);
    await started;
    const second = http.get(`${origin}/ok`);
    expect(await http.get(`${origin}/ok`)).toMatchObject({
      ok: false,
      error: { kind: 'TransportFailed', reason: 'QueueFull' },
    });
    expect(http.status()).toMatchObject({ active: 1, queued: 1, in_flight: 2 });
    await http.close();
    expect(await first).toMatchObject({ ok: false, error: { reason: 'Closed' } });
    expect(await second).toMatchObject({ ok: false, error: { reason: 'Closed' } });
    expect(http.status()).toMatchObject({ closed: true, active: 0, queued: 0, in_flight: 0 });
    expect(await http.get(`${origin}/ok`)).toMatchObject({
      ok: false,
      error: { reason: 'Closed' },
    });
  });

  it('settles cancelled queued callers without waiting for the active request', async () => {
    const http = client();
    const started = new Promise<void>((resolve) =>
      server.once('request', () => {
        resolve();
      }),
    );
    const first = http.get(`${origin}/hang`);
    await started;
    const controller = new AbortController();
    const second = http.get(`${origin}/ok`, controller.signal);
    const start = Date.now();
    controller.abort();
    expect(await second).toMatchObject({ ok: false, error: { reason: 'Cancelled' } });
    expect(Date.now() - start).toBeLessThan(1000);
    await http.close();
    expect(await first).toMatchObject({ ok: false, error: { reason: 'Closed' } });
  });

  it('releases the queue slot while a retry waits', async () => {
    retryCalls = 0;
    const http = client();
    const started = new Promise<void>((resolve) =>
      server.once('request', () => {
        resolve();
      }),
    );
    let firstFinished = false;
    const first = http.get(`${origin}/retry-wait`).then((result) => {
      firstFinished = true;
      return result;
    });
    await started;
    expect(await http.get(`${otherOrigin}/ok`)).toMatchObject({ ok: true });
    expect(firstFinished).toBe(false);
    expect(await first).toEqual({ ok: true, value: 'retried' });
    await http.close();
  });

  it('[OPS] shutdown cancels retry backoff and releases call accounting without another attempt', async () => {
    retryCalls = 0;
    const http = client();
    const started = new Promise<void>((resolve) =>
      server.once('request', () => {
        resolve();
      }),
    );
    const first = http.get(`${origin}/retry-wait`);
    await started;
    // This independent origin can complete only after the retry released the queue.
    expect(await http.get(`${otherOrigin}/ok`)).toMatchObject({ ok: true });
    await http.close();
    expect(await first).toMatchObject({ ok: false, error: { reason: 'Closed' } });
    expect(retryCalls).toBe(1);
    expect(http.status()).toMatchObject({ closed: true, in_flight: 0, active: 0, queued: 0 });
  });

  it('[OPS] distinguishes local rate-spacing deadline from an upstream timeout', async () => {
    const http = client({ ratePerSec: 1, timeoutMs: 80 });
    expect(await http.get(`${origin}/ok`)).toMatchObject({ ok: true });
    expect(await http.get(`${origin}/ok`)).toMatchObject({
      ok: false,
      error: { reason: 'QueueTimeout' },
    });
    expect(http.status().attempts).toBe(1);
    expect(http.status()).toMatchObject({ queue_timeouts: 1, upstream_timeouts: 0 });
    await http.close();
  });

  it('[OPS] exposes actual HTTP resources and survives a concurrent local queue-timeout burst without an upstream circuit', async () => {
    const http = client({ ratePerSec: 1, timeoutMs: 150 });
    const agent = new OperationsAgent(pino({ enabled: false }), { httpStatus: http.status });
    const tool = agent.supervise(
      createTool({
        name: 'healthy_public',
        description: 'Public test',
        schema: z.object({}).strict(),
        output: z.object({ ok: z.boolean(), _source: z.literal('public') }),
        handler: async () => {
          const result = await http.get(`${origin}/ok`);
          return result.ok ? { ok: true, _source: 'public' } : toolError(result.error);
        },
      }),
    );
    try {
      const results = await Promise.all(Array.from({ length: 8 }, () => tool.handler({})));
      expect(results.filter((result) => !result.isError)).toHaveLength(1);
      expect(results.filter((result) => result.isError)).toHaveLength(7);
      for (const result of results.filter((response) => response.isError)) {
        expect(JSON.parse(result.content[0]?.text ?? '{}')).toMatchObject({
          kind: 'TransportFailed',
          reason: 'QueueTimeout',
        });
      }
      const diagnostics = agent.snapshot();
      expect(diagnostics.recovery_count).toBe(0);
      expect(diagnostics.tools[0]).toMatchObject({ consecutive_failures: 0, cooldown_until: null });
      expect(diagnostics.resources.http).toMatchObject({
        requests: 8,
        attempts: 1,
        completed: 1,
        failures: 7,
        queue_timeouts: 7,
        upstream_timeouts: 0,
      });
      expect((await buildOperationsTool(agent).handler({})).isError).toBe(false);
    } finally {
      await http.close();
    }
  });
});
