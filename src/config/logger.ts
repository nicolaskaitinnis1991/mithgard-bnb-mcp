import pino, { type Logger } from 'pino';
import type { Env } from './env.js';

// Logs go to stderr (fd 2) — stdout is reserved for MCP JSON-RPC over stdio.
// Without this, pino lines interleave with protocol responses and break clients.
export const createLogger = (env: Env): Logger =>
  pino(
    {
      level: env.LOG_LEVEL,
      base: { service: 'mithgard-bnb-mcp' },
      redact: {
        paths: ['*.email', '*.phone', '*.guest_name', '*.message_text'],
        censor: '[REDACTED]',
      },
      timestamp: pino.stdTimeFunctions.isoTime,
    },
    pino.destination(2),
  );
