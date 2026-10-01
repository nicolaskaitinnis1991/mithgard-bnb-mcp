import { createServer, type Server } from 'node:http';
import type { Socket } from 'node:net';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createHttpClient } from '../../src/lib/http.js';

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

  it('includes queue waiting in the deadline', async () => {
    const http = client({ ratePerSec: 1, timeoutMs: 80 });
    expect(await http.get(`${origin}/ok`)).toMatchObject({ ok: true });
    expect(await http.get(`${origin}/ok`)).toMatchObject({
      ok: false,
      error: { reason: 'Timeout' },
    });
    expect(http.status().attempts).toBe(1);
    await http.close();
  });
});
