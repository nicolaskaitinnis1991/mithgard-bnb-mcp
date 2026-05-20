// Extra-paranoid PII strip for the --debug envelope dump path. pino's `redact`
// option handles known paths, but this catches user-shaped fields wherever
// they appear in the object tree (mocks have nested fixtures with `host_name`,
// `last_message`, etc.). Used only by withTelemetry when debug mode is on —
// never on stdout MCP traffic.

const SENSITIVE_KEYS = new Set([
  'email',
  'phone',
  'review_text',
  'last_message',
  'host_name',
  'guest_name',
  'message_text',
]);

const DEPTH_LIMIT = 10;

export const sanitize = (value: unknown, depth = 0): unknown => {
  if (depth > DEPTH_LIMIT) return '[DEPTH_LIMIT]';
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => sanitize(v, depth + 1));

  const input = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = sanitize(v, depth + 1);
    }
  }
  return out;
};
