import { describe, it, expect } from 'vitest';
import { createLogger } from '../../src/config/logger.js';

describe('createLogger', () => {
  it('returns a pino logger', () => {
    const log = createLogger({
      LOG_LEVEL: 'info',
      CACHE_TTL_SEARCH_MS: 1,
      CACHE_TTL_LISTING_MS: 1,
      HTTP_RATE_PER_SEC: 1,
      HTTP_RATE_PER_HOUR: 1,
      HTTP_USER_AGENT: 'test',
      CACHE_MAX_SEARCH: 1,
    });
    expect(typeof log.info).toBe('function');
    expect(log.level).toBe('info');
  });
});
