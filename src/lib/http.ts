import { request } from 'undici';
import PQueue from 'p-queue';
import { type Result, ok, err } from './result.js';
import {
  type McpError,
  type TransportFailureReason,
  rateLimited,
  transportFailed,
  upstreamHTTP,
} from './errors.js';

export interface HttpOptions {
  ratePerSec: number;
  ratePerHour: number;
  userAgent: string;
  /** Complete call deadline, including queueing, retries and response body. */
  timeoutMs?: number;
  maxQueueSize?: number;
  maxResponseBytes?: number;
  maxRetries?: number;
  /** Longer Retry-After values are returned to the caller instead of shortened. */
  maxRetryAfterMs?: number;
  jitterMs?: number;
}

export interface HttpStatus {
  closed: boolean;
  active: number;
  queued: number;
  in_flight: number;
  requests: number;
  attempts: number;
  completed: number;
  failures: number;
  rate_limited: number;
  response_bytes: number;
  queue_timeouts: number;
  upstream_timeouts: number;
  rejected_full: number;
  cancelled: number;
  limits: {
    timeout_ms: number;
    max_queue_size: number;
    max_response_bytes: number;
    max_retries: number;
    max_retry_after_ms: number;
    rate_per_sec: number;
    rate_per_hour: number;
  };
}

const abortError = (signal: AbortSignal): Error => {
  const reason: unknown = signal.reason;
  return reason instanceof Error ? reason : new Error('HTTP request aborted');
};

const delay = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError(signal));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError(signal));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

// p-queue observes a queued task's signal only after that task starts. This race
// makes queue cancellation/deadlines settle immediately and still observes the
// task's eventual rejection, preventing an unhandled rejection.
const abortable = <T>(operation: Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise((resolve, reject) => {
    const onAbort = () => {
      reject(abortError(signal));
    };
    if (signal.aborted) reject(abortError(signal));
    else signal.addEventListener('abort', onAbort, { once: true });
    operation.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error instanceof Error ? error : new Error('HTTP operation failed'));
      },
    );
  });

const retryAfterMs = (header: string | string[] | undefined, attempt: number): number => {
  const value = Array.isArray(header) ? header[0] : header;
  if (value !== undefined) {
    if (/^\s*\d+(?:\.\d+)?\s*$/.test(value)) {
      return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(Number(value) * 1000));
    }
    if (
      /^(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)[, ]/i.test(
        value,
      )
    ) {
      const date = Date.parse(value);
      if (Number.isFinite(date)) return Math.max(0, date - Date.now());
    }
  }
  return 5000 * 2 ** attempt;
};

const boundedInt = (name: string, value: number, minimum: number, maximum: number): number => {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`Invalid HTTP option: ${name}`);
  }
  return value;
};

export const createHttpClient = (opts: HttpOptions) => {
  const ratePerSec = boundedInt('ratePerSec', opts.ratePerSec, 1, 1000);
  const ratePerHour = boundedInt('ratePerHour', opts.ratePerHour, 1, 1_000_000);
  const timeoutMs = boundedInt('timeoutMs', opts.timeoutMs ?? 15_000, 1, 300_000);
  const maxQueueSize = boundedInt('maxQueueSize', opts.maxQueueSize ?? 64, 1, 10_000);
  const maxResponseBytes = boundedInt(
    'maxResponseBytes',
    opts.maxResponseBytes ?? 2_000_000,
    1,
    50_000_000,
  );
  const maxRetries = boundedInt('maxRetries', opts.maxRetries ?? 3, 0, 5);
  const maxRetryAfterMs = boundedInt('maxRetryAfterMs', opts.maxRetryAfterMs ?? 60_000, 0, 300_000);
  const jitterMs = boundedInt('jitterMs', opts.jitterMs ?? 250, 0, 1000);
  const queue = new PQueue({ concurrency: 1 });
  const calls = new Set<AbortController>();
  const hourStarts: number[] = [];
  const originCooldowns = new Map<string, number>();
  let nextStartAt = 0;
  const counters = {
    requests: 0,
    attempts: 0,
    completed: 0,
    failures: 0,
    rate_limited: 0,
    response_bytes: 0,
    queue_timeouts: 0,
    upstream_timeouts: 0,
    rejected_full: 0,
    cancelled: 0,
  };
  let closed = false;

  const status = (): HttpStatus => ({
    closed,
    active: queue.pending,
    queued: queue.size,
    in_flight: calls.size,
    ...counters,
    limits: {
      timeout_ms: timeoutMs,
      max_queue_size: maxQueueSize,
      max_response_bytes: maxResponseBytes,
      max_retries: maxRetries,
      max_retry_after_ms: maxRetryAfterMs,
      rate_per_sec: ratePerSec,
      rate_per_hour: ratePerHour,
    },
  });

  const attemptGet = async (
    url: string,
    signal: AbortSignal,
    attempt: number,
    onUpstreamStart: () => void,
  ): Promise<{ result: Result<string, McpError>; retryAfter?: number }> => {
    const now = Date.now();
    const origin = new URL(url).origin;
    for (const [key, until] of originCooldowns) {
      if (until <= now) originCooldowns.delete(key);
    }
    const originCooldown = originCooldowns.get(origin);
    if (originCooldown !== undefined) {
      return { result: err(rateLimited(originCooldown - now, new URL(url).host)) };
    }
    // Bound long-lived origin state too, even if a caller supplies many hosts
    // with very long Retry-After values. Existing cooldowns are never evicted.
    if (originCooldowns.size >= 128) {
      return {
        result: err(transportFailed(url, 'QueueFull', 'Origin cooldown capacity was reached')),
      };
    }
    while ((hourStarts[0] ?? Infinity) <= now - 3_600_000) hourStarts.shift();
    if (hourStarts.length >= ratePerHour) {
      return {
        result: err(
          rateLimited((hourStarts[0] ?? now) + 3_600_000 - now, new URL(url).host, 'local'),
        ),
      };
    }
    // Space starts rather than fixed-window caps, which can burst at boundaries.
    await delay(Math.max(0, nextStartAt - now) + Math.random() * jitterMs, signal);
    signal.throwIfAborted();
    const startedAt = Date.now();
    nextStartAt = startedAt + Math.ceil(1000 / ratePerSec);
    hourStarts.push(startedAt);
    counters.attempts++;
    onUpstreamStart();
    const res = await request(url, {
      method: 'GET',
      headers: { 'user-agent': opts.userAgent },
      signal,
      headersTimeout: timeoutMs,
      bodyTimeout: timeoutMs,
    });
    const chunks: Buffer[] = [];
    let size = 0;
    // Consume every response, including 429/error responses, so pooled sockets
    // remain reusable. Abort/destroy oversized bodies instead of buffering them.
    for await (const chunk of res.body) {
      const value: unknown = chunk;
      if (!Buffer.isBuffer(value)) {
        res.body.destroy();
        return { result: err(transportFailed(url, 'Network', 'Unexpected response chunk')) };
      }
      size += value.byteLength;
      counters.response_bytes += value.byteLength;
      if (size > maxResponseBytes) {
        res.body.destroy();
        return {
          result: err(transportFailed(url, 'ResponseTooLarge', 'Response exceeded the byte limit')),
        };
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks, size).toString('utf8');
    if (res.statusCode === 429) {
      const retryAfter = retryAfterMs(res.headers['retry-after'], attempt);
      if (retryAfter > 0) {
        originCooldowns.set(origin, Math.min(Number.MAX_SAFE_INTEGER, Date.now() + retryAfter));
      }
      return { result: err(rateLimited(retryAfter, new URL(url).host)), retryAfter };
    }
    if (res.statusCode < 200 || res.statusCode >= 300) {
      return { result: err(upstreamHTTP(res.statusCode, url, body.slice(0, 200))) };
    }
    return { result: ok(body) };
  };

  const get = async (url: string, signal?: AbortSignal): Promise<Result<string, McpError>> => {
    counters.requests++;
    if (closed) {
      counters.failures++;
      return err(transportFailed(url, 'Closed', 'HTTP client is closed'));
    }
    if (queue.size >= maxQueueSize || calls.size >= maxQueueSize + 1) {
      counters.failures++;
      counters.rejected_full++;
      return err(transportFailed(url, 'QueueFull', 'HTTP queue capacity was reached'));
    }
    const controller = new AbortController();
    let phase: 'queue' | 'upstream' = 'queue';
    const expiresAt = Date.now() + timeoutMs;
    const timer = setTimeout(() => {
      controller.abort(phase === 'upstream' ? 'Timeout' : 'QueueTimeout');
    }, timeoutMs);
    const onAbort = () => {
      controller.abort('Cancelled');
    };
    if (signal?.aborted) controller.abort('Cancelled');
    else signal?.addEventListener('abort', onAbort, { once: true });
    calls.add(controller);
    let result: Result<string, McpError>;
    try {
      // Retries release the queue slot before waiting; unrelated calls can run.
      for (let attempt = 0; ; attempt++) {
        phase = 'queue';
        const response = await abortable(
          queue.add(
            () =>
              attemptGet(url, controller.signal, attempt, () => {
                phase = 'upstream';
              }),
            {
              signal: controller.signal,
            },
          ),
          controller.signal,
        );
        if (response === undefined) throw new Error('HTTP queue did not return a result');
        phase = 'queue';
        result = response.result;
        if (response.retryAfter === undefined || attempt >= maxRetries) break;
        const retryAfter = response.retryAfter;
        if (retryAfter > maxRetryAfterMs || retryAfter >= expiresAt - Date.now()) break;
        await delay(retryAfter, controller.signal);
      }
    } catch (cause: unknown) {
      const reason: TransportFailureReason = controller.signal.aborted
        ? (controller.signal.reason as 'Timeout' | 'QueueTimeout' | 'Closed' | 'Cancelled')
        : 'Network';
      result = err(
        transportFailed(url, reason, cause instanceof Error ? cause.message : String(cause)),
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
      calls.delete(controller);
    }
    if (result.ok) counters.completed++;
    else {
      counters.failures++;
      if (result.error.kind === 'RateLimited') counters.rate_limited++;
      if (result.error.kind === 'TransportFailed') {
        if (result.error.reason === 'QueueTimeout') counters.queue_timeouts++;
        if (result.error.reason === 'Timeout') counters.upstream_timeouts++;
        if (result.error.reason === 'Cancelled') counters.cancelled++;
        if (result.error.reason === 'QueueFull') counters.rejected_full++;
      }
    }
    return result;
  };

  const close = async (): Promise<void> => {
    closed = true;
    for (const controller of calls) controller.abort('Closed');
    // Do not clear/pause p-queue: queued promises must run their aborted check and
    // settle. Active requests are aborted, so this drains without waiting on I/O.
    await queue.onIdle();
  };

  return { get, status, close };
};
