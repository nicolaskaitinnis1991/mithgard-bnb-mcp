import { describe, it, expect } from 'vitest';
import { drill, findFirstKey, walkObjects } from '../../src/lib/json-walker.js';

describe('drill', () => {
  it('returns nested value via path', () => {
    const json = { a: { b: { c: 42 } } };
    expect(drill(json, ['a', 'b', 'c'])).toBe(42);
  });

  it('returns undefined on any missing step (no throw)', () => {
    const json = { a: { b: 1 } };
    expect(drill(json, ['a', 'b', 'c'])).toBeUndefined();
    expect(drill(json, ['x'])).toBeUndefined();
    expect(drill(json, ['a', 'nope', 'deeper'])).toBeUndefined();
  });

  it('does not throw on null/undefined input', () => {
    expect(drill(null, ['a'])).toBeUndefined();
    expect(drill(undefined, ['a'])).toBeUndefined();
    expect(drill({ a: null }, ['a', 'b'])).toBeUndefined();
  });

  it('returns the root unchanged on empty path', () => {
    const json = { a: 1 };
    expect(drill(json, [])).toBe(json);
  });
});

describe('findFirstKey', () => {
  it('finds key at the root', () => {
    const json = { target: 'hit', other: 'miss' };
    expect(findFirstKey(json, 'target')).toBe('hit');
  });

  it('finds key deeply nested', () => {
    const json = { a: { b: { c: { target: 99 } } } };
    expect(findFirstKey(json, 'target')).toBe(99);
  });

  it('finds key inside an array element', () => {
    const json = { list: [{ x: 1 }, { target: 'found' }, { y: 2 }] };
    expect(findFirstKey(json, 'target')).toBe('found');
  });

  it('returns undefined if key is absent', () => {
    const json = { a: { b: 1 } };
    expect(findFirstKey(json, 'missing')).toBeUndefined();
  });

  it('does not throw on null/primitive nodes', () => {
    expect(findFirstKey(null, 'x')).toBeUndefined();
    expect(findFirstKey(42, 'x')).toBeUndefined();
    expect(findFirstKey('str', 'x')).toBeUndefined();
  });
});

describe('walkObjects', () => {
  it('visits every nested object exactly once', () => {
    const json = { a: { b: { c: 1 } }, d: { e: 2 } };
    const visited: Record<string, unknown>[] = [];
    walkObjects(json, (obj) => visited.push(obj));
    // root, a, a.b, d → 4 objects
    expect(visited.length).toBe(4);
  });

  it('descends into arrays without visiting them', () => {
    const json = { list: [{ id: 1 }, { id: 2 }, { id: 3 }] };
    const ids: unknown[] = [];
    walkObjects(json, (obj) => {
      if (typeof obj.id === 'number') ids.push(obj.id);
    });
    expect(ids).toEqual([1, 2, 3]);
  });

  it('does nothing on primitives, null, or undefined', () => {
    let count = 0;
    const visit = (): void => {
      count++;
    };
    walkObjects(null, visit);
    walkObjects(undefined, visit);
    walkObjects(42, visit);
    walkObjects('hello', visit);
    expect(count).toBe(0);
  });

  it('supports accumulator pattern for filtered collection', () => {
    const json = {
      results: [
        { kind: 'listing', id: 'a' },
        { kind: 'other', id: 'b' },
        { nested: { kind: 'listing', id: 'c' } },
      ],
    };
    const out: string[] = [];
    walkObjects(json, (obj) => {
      if (obj.kind === 'listing' && typeof obj.id === 'string') out.push(obj.id);
    });
    expect(out).toEqual(['a', 'c']);
  });
});
