export type McpError =
  | { kind: 'RateLimited'; retry_after_ms: number; source: string }
  | { kind: 'UpstreamHTTP'; status: number; url: string; body?: string }
  | { kind: 'ParseFailed'; selector: string; url: string; cause?: string }
  | { kind: 'ValidationFailed'; field: string; message: string }
  | { kind: 'NotImplemented'; tool: string; reason: string }
  | { kind: 'TransportFailed'; url: string; reason: TransportFailureReason; message: string };

export type TransportFailureReason =
  'Network' | 'Timeout' | 'ResponseTooLarge' | 'QueueFull' | 'Closed' | 'Cancelled';

export const transportFailed = (
  url: string,
  reason: TransportFailureReason,
  message: string,
): McpError => ({ kind: 'TransportFailed', url, reason, message });

export const rateLimited = (retry_after_ms: number, source: string): McpError => ({
  kind: 'RateLimited',
  retry_after_ms,
  source,
});
export const upstreamHTTP = (status: number, url: string, body?: string): McpError =>
  body === undefined
    ? { kind: 'UpstreamHTTP', status, url }
    : { kind: 'UpstreamHTTP', status, url, body };
export const parseFailed = (selector: string, url: string, cause?: string): McpError =>
  cause === undefined
    ? { kind: 'ParseFailed', selector, url }
    : { kind: 'ParseFailed', selector, url, cause };
export const validationFailed = (field: string, message: string): McpError => ({
  kind: 'ValidationFailed',
  field,
  message,
});
export const notImplemented = (tool: string, reason: string): McpError => ({
  kind: 'NotImplemented',
  tool,
  reason,
});

export const formatError = (e: McpError): string => {
  switch (e.kind) {
    case 'RateLimited':
      return `Rate limited by ${e.source}, retry in ${String(e.retry_after_ms)}ms`;
    case 'UpstreamHTTP':
      return `HTTP ${String(e.status)} from ${e.url}`;
    case 'ParseFailed':
      return `Parse failed at ${e.selector} on ${e.url}${e.cause ? `: ${e.cause}` : ''}`;
    case 'ValidationFailed':
      return `Validation failed on ${e.field}: ${e.message}`;
    case 'NotImplemented':
      return `Tool ${e.tool} not implemented: ${e.reason}`;
    case 'TransportFailed':
      return `HTTP transport failed (${e.reason})`;
  }
};
