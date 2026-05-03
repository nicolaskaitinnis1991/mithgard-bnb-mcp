import { describe, it, expect } from 'vitest';
import { SearchInput } from '../../src/tools/search/schema.js';

describe('SearchInput', () => {
  it('accepts minimal valid', () => {
    expect(SearchInput.parse({ location: 'Berlin' }).adults).toBe(2);
  });
  it('rejects empty location', () => {
    expect(() => SearchInput.parse({ location: '' })).toThrow();
  });
  it('rejects bad date format', () => {
    expect(() => SearchInput.parse({ location: 'X', checkin: '2026/06/01' })).toThrow();
  });
});
