import { describe, it, expect, vi } from 'vitest';
import type { Logger } from 'pino';
import { withTelemetry } from '../../src/lib/telemetry.js';

interface TelemetryPayload {
  tool: string;
  request_id: string;
  duration_ms: number;
  status: 'ok' | 'error';
  error_kind?: string;
}

const fakeLogger = (): Logger => {
  const log = {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  };
  // pino's Logger type has many methods; the wrapper only touches info/error/debug.
  // The cast is safe because withTelemetry never reaches anything else.
  return log as unknown as Logger;
};

const firstCall = (mock: ReturnType<typeof vi.fn>): [TelemetryPayload, string] => {
  const calls = mock.mock.calls[0];
  if (!calls) throw new Error('log not called');
  return calls as [TelemetryPayload, string];
};

describe('withTelemetry', () => {
  it('logs tool.done with status=ok on success and returns the wrapped value', async () => {
    const log = fakeLogger();
    const fn = vi.fn((input: number) => Promise.resolve(input * 2));
    const wrapped = withTelemetry(log, 'demo', fn);

    const result = await wrapped(21);

    expect(result).toBe(42);
    expect(fn).toHaveBeenCalledWith(21);
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(log.error).not.toHaveBeenCalled();
    const [payload, msg] = firstCall(vi.mocked(log.info));
    expect(msg).toBe('tool.done');
    expect(payload.tool).toBe('demo');
    expect(payload.status).toBe('ok');
    expect(typeof payload.duration_ms).toBe('number');
    expect(payload.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('logs tool.error with error_kind on throw and re-throws', async () => {
    const log = fakeLogger();
    class CustomError extends Error {}
    const fn = vi.fn((_input: string): Promise<never> => Promise.reject(new CustomError('boom')));
    const wrapped = withTelemetry(log, 'breakable', fn);

    await expect(wrapped('hi')).rejects.toThrow('boom');

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.info).not.toHaveBeenCalled();
    const [payload, msg] = firstCall(vi.mocked(log.error));
    expect(msg).toBe('tool.error');
    expect(payload.tool).toBe('breakable');
    expect(payload.status).toBe('error');
    expect(payload.error_kind).toBe('UnexpectedError');
    expect(typeof payload.duration_ms).toBe('number');
  });

  it('emits a request_id matching the hex16 shape from newRequestId', async () => {
    const log = fakeLogger();
    const wrapped = withTelemetry(log, 'rid', () => Promise.resolve('ok'));

    await wrapped(null);

    const [payload] = firstCall(vi.mocked(log.info));
    expect(payload.request_id).toMatch(/^[0-9a-f]{16}$/);
  });

  it('logs returned domain errors with status=error', async () => {
    const log = fakeLogger();
    const wrapped = withTelemetry(log, 'upstream', () =>
      Promise.resolve({ error: 'Unavailable', kind: 'RateLimited' }),
    );
    await wrapped(null);
    const [payload, message] = firstCall(vi.mocked(log.error));
    expect(message).toBe('tool.failed');
    expect(payload.status).toBe('error');
    expect(payload.error_kind).toBe('RateLimited');
    expect(log.info).not.toHaveBeenCalled();
  });

  it('does not include raw exception messages in debug logs', async () => {
    const log = fakeLogger();
    const secret = 'password=secret-test-value';
    const wrapped = withTelemetry(log, 'unsafe', () => Promise.reject(new Error(secret)), {
      debug: true,
    });
    await expect(wrapped({ last_message: secret })).rejects.toThrow(secret);
    const logged = JSON.stringify([
      vi.mocked(log.debug).mock.calls,
      vi.mocked(log.error).mock.calls,
    ]);
    expect(logged).not.toContain(secret);
    expect(logged).toContain('Tool execution failed');
  });

  it('does NOT emit tool.envelope when debug is off', async () => {
    const log = fakeLogger();
    const wrapped = withTelemetry(log, 'no-debug', (i: { email: string }) => Promise.resolve(i));
    await wrapped({ email: 'a@b.c' });
    expect(log.debug).not.toHaveBeenCalled();
  });

  it('emits tool.envelope with sanitised input+output when debug is on', async () => {
    const log = fakeLogger();
    const wrapped = withTelemetry(
      log,
      'debug-on',
      (_i: { email: string; total: number }) =>
        Promise.resolve({ host_name: 'Nico', listing_id: '1' }),
      { debug: true },
    );
    await wrapped({ email: 'a@b.c', total: 42 });
    expect(log.debug).toHaveBeenCalledTimes(1);
    const debugMock = vi.mocked(log.debug);
    const args = debugMock.mock.calls[0];
    if (!args) throw new Error('debug not called');
    const [payload, msg] = args as [
      { tool: string; request_id: string; input: unknown; output: unknown },
      string,
    ];
    expect(msg).toBe('tool.envelope');
    expect(payload.tool).toBe('debug-on');
    expect(payload.input).toEqual({ email: '[REDACTED]', total: 42 });
    expect(payload.output).toEqual({ host_name: '[REDACTED]', listing_id: '[REDACTED]' });
  });
});
