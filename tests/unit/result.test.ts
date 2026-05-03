import { describe, it, expect } from 'vitest';
import { ok, err, isOk, isErr, map, mapErr } from '../../src/lib/result.js';

describe('Result', () => {
  it('ok creates a successful result', () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
    expect(isOk(ok(42))).toBe(true);
  });
  it('err creates a failed result', () => {
    expect(err('boom')).toEqual({ ok: false, error: 'boom' });
    expect(isErr(err('boom'))).toBe(true);
  });
  it('map transforms ok value', () => {
    expect(map(ok(2), (x) => x * 2)).toEqual(ok(4));
  });
  it('map preserves err', () => {
    expect(map(err('x'), (n: number) => n * 2)).toEqual(err('x'));
  });
  it('mapErr transforms error', () => {
    expect(mapErr(err('a'), (e) => e + '!')).toEqual(err('a!'));
  });
});
