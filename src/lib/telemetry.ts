import type { Logger } from 'pino';
import { newRequestId } from './request-id.js';
import { sanitize } from './redaction.js';

export interface TelemetryEvent {
  tool: string;
  request_id: string;
  duration_ms: number;
  status: 'ok' | 'error';
  cache_hit?: boolean;
  error_kind?: string;
}

export interface TelemetryOptions {
  // When true, emit an extra `tool.envelope` debug log line per call carrying
  // sanitised input + output. Wired from --debug at the entry point.
  debug?: boolean;
}

const isFailure = (value: unknown): value is { error: string; kind: string } =>
  value !== null &&
  typeof value === 'object' &&
  'error' in value &&
  typeof value.error === 'string' &&
  'kind' in value &&
  typeof value.kind === 'string';
const ERROR_KINDS = new Set([
  'RateLimited',
  'UpstreamHTTP',
  'ParseFailed',
  'ValidationFailed',
  'NotImplemented',
  'TransportFailed',
  'OutputValidationFailed',
  'UnexpectedError',
  'Cancelled',
]);

// withTelemetry wraps a tool handler with structured logging.
// One JSON log line is emitted to stderr per call: `tool.done` on success,
// `tool.error` on throw. `cache_hit` (when relevant) is logged as a separate
// `tool.cache` event from inside the handler itself — keeps this wrapper clean.
// When `opts.debug` is true, an additional `tool.envelope` debug line carries
// sanitised input/output (PII-stripped via src/lib/redaction.ts).
export const withTelemetry =
  <I, O>(
    log: Logger,
    toolName: string,
    fn: (input: I) => Promise<O>,
    opts: TelemetryOptions = {},
  ) =>
  async (input: I): Promise<O> => {
    const request_id = newRequestId();
    const start = Date.now();
    try {
      const out = await fn(input);
      const failure = isFailure(out);
      const errorKind = failure
        ? ERROR_KINDS.has(out.kind)
          ? out.kind
          : 'UnexpectedError'
        : undefined;
      if (opts.debug) {
        log.debug(
          {
            tool: toolName,
            request_id,
            input: sanitize(input),
            output: sanitize(out),
          },
          'tool.envelope',
        );
      }
      const event = {
        tool: toolName,
        request_id,
        duration_ms: Date.now() - start,
        status: failure ? ('error' as const) : ('ok' as const),
        ...(errorKind ? { error_kind: errorKind } : {}),
      };
      if (failure) log.error(event, 'tool.failed');
      else log.info(event, 'tool.done');
      return out;
    } catch (e) {
      if (opts.debug) {
        log.debug(
          {
            tool: toolName,
            request_id,
            input: sanitize(input),
            error: 'Tool execution failed',
          },
          'tool.envelope',
        );
      }
      log.error(
        {
          tool: toolName,
          request_id,
          duration_ms: Date.now() - start,
          status: 'error' as const,
          error_kind: 'UnexpectedError',
        },
        'tool.error',
      );
      throw e;
    }
  };
