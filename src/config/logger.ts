import pino, { type Logger } from 'pino';
import type { Env } from './env.js';

export const createLogger = (env: Env): Logger =>
  pino({
    level: env.LOG_LEVEL,
    base: { service: 'mithgard-bnb-mcp' },
    redact: {
      paths: ['*.email', '*.phone', '*.guest_name', '*.message_text'],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
