import { describe, it, expect } from 'vitest';
import {
  rateLimited,
  upstreamHTTP,
  parseFailed,
  validationFailed,
  notImplemented,
  formatError,
} from '../../src/lib/errors.js';

describe('McpError', () => {
  it.each([
    [rateLimited(1000, 'airbnb.com'), 'Rate limited by airbnb.com, retry in 1000ms'],
    [upstreamHTTP(500, 'https://x'), 'HTTP 500 from https://x'],
    [parseFailed('.title', 'https://x'), 'Parse failed at .title on https://x'],
    [validationFailed('location', 'required'), 'Validation failed on location: required'],
    [notImplemented('foo', 'mock only'), 'Tool foo not implemented: mock only'],
  ])('formats %j', (e, expected) => {
    expect(formatError(e)).toBe(expected);
  });
});
