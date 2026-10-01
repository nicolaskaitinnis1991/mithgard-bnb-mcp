import { describe, it, expect } from 'vitest';
import { createLogger } from '../../src/config/logger.js';
import { loadEnv } from '../../src/config/env.js';

describe('createLogger', () => {
  it('returns a pino logger', () => {
    const log = createLogger(loadEnv({ LOG_LEVEL: 'info' }));
    expect(typeof log.info).toBe('function');
    expect(log.level).toBe('info');
  });
});
