import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import type { Socket } from 'node:net';
import { expect, it } from 'vitest';

it('[OPS] stdin EOF alone cancels in-flight HTTP, clears caches and exits without fallback signals', async () => {
  const sockets = new Set<Socket>();
  let markStarted: () => void = () => undefined;
  let markClosed: () => void = () => undefined;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const closed = new Promise<void>((resolve) => {
    markClosed = resolve;
  });
  const upstream = createServer((_req, res) => {
    markStarted();
    res.once('close', markClosed);
    // Deliberately never send headers; shutdown must cancel real local I/O.
  });
  upstream.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => {
      sockets.delete(socket);
    });
  });
  await new Promise<void>((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  const address = upstream.address();
  if (address === null || typeof address === 'string') throw new Error('No test server address');
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', '--import', './tests/e2e/fixtures/loopback-http.ts', 'src/index.ts'],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        LOG_LEVEL: 'info',
        OPS_TEST_HTTP_PORT: String(address.port),
        HTTP_TIMEOUT_MS: '60000',
        HTTP_RATE_PER_SEC: '1000',
      },
    },
  );
  let stdout = '';
  let stderr = '';
  let initialized: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    initialized = resolve;
  });
  child.stdout.on('data', (chunk: Buffer) => {
    stdout += chunk.toString();
    if (stdout.split('\n').some((line) => line.includes('"id":1') && line.includes('"result"')))
      initialized();
  });
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>(
    (resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => {
        resolve({ code, signal });
      });
    },
  );
  const send = (value: object) => {
    child.stdin.write(`${JSON.stringify(value)}\n`);
  };
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`EOF shutdown did not finish: ${stderr}`));
    }, 4000);
  });
  try {
    await Promise.race([
      (async () => {
        send({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-11-25',
            capabilities: {},
            clientInfo: { name: 'eof-user', version: '1' },
          },
        });
        await ready;
        send({ jsonrpc: '2.0', method: 'notifications/initialized' });
        send({
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: { name: 'airbnb_listing_details', arguments: { listing_id: '12345' } },
        });
        await started;
        const beginning = Date.now();
        child.stdin.end();
        const exit = await exited;
        await closed;
        expect(exit).toEqual({ code: 0, signal: null });
        expect(Date.now() - beginning).toBeLessThan(2000);
        const responses = stdout
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as { id?: number; result?: { isError?: boolean } });
        expect(
          responses
            .filter((response) => response.id === 2)
            .every((response) => response.result?.isError !== false),
        ).toBe(true);
        const stopped = stderr
          .split('\n')
          .filter(Boolean)
          .map(
            (line) =>
              JSON.parse(line) as {
                msg: string;
                http?: object;
                search_cache?: object;
                listing_cache?: object;
              },
          )
          .find((line) => line.msg === 'server.stopped');
        expect(stopped?.http).toMatchObject({ closed: true, active: 0, queued: 0, in_flight: 0 });
        expect(stopped?.search_cache).toMatchObject({ entries: 0, bytes: 0 });
        expect(stopped?.listing_cache).toMatchObject({ entries: 0, bytes: 0 });
      })(),
      deadline,
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (child.exitCode === null) {
      child.kill('SIGKILL');
      await exited;
    }
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) =>
      upstream.close(() => {
        resolve();
      }),
    );
  }
}, 6000);
