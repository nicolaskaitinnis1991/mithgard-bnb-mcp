import type { Logger } from 'pino';
import { newRequestId } from './request-id.js';

export interface TelemetryEvent {
  tool: string;
  request_id: string;
  duration_ms: number;
  status: 'ok' | 'error';
  cache_hit?: boolean;
  error_kind?: string;
}

// withTelemetry wraps a tool handler with structured logging.
// One JSON log line is emitted to stderr per call: `tool.done` on success,
// `tool.error` on throw. `cache_hit` (when relevant) is logged as a separate
// `tool.cache` event from inside the handler itself — keeps this wrapper clean.
export const withTelemetry =
  <I, O>(log: Logger, toolName: string, fn: (input: I) => Promise<O>) =>
  async (input: I): Promise<O> => {
    const request_id = newRequestId();
    const start = Date.now();
    try {
      const out = await fn(input);
      log.info(
        {
          tool: toolName,
          request_id,
          duration_ms: Date.now() - start,
          status: 'ok' as const,
        },
        'tool.done',
      );
      return out;
    } catch (e) {
      log.error(
        {
          tool: toolName,
          request_id,
          duration_ms: Date.now() - start,
          status: 'error' as const,
          error_kind: e instanceof Error ? e.constructor.name : 'Unknown',
        },
        'tool.error',
      );
      throw e;
    }
  };
