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
  };
  // pino's Logger type has many methods; the wrapper only touches info/error.
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
    expect(payload.error_kind).toBe('CustomError');
    expect(typeof payload.duration_ms).toBe('number');
  });

  it('emits a request_id matching the hex16 shape from newRequestId', async () => {
    const log = fakeLogger();
    const wrapped = withTelemetry(log, 'rid', () => Promise.resolve('ok'));

    await wrapped(null);

    const [payload] = firstCall(vi.mocked(log.info));
    expect(payload.request_id).toMatch(/^[0-9a-f]{16}$/);
  });
});
