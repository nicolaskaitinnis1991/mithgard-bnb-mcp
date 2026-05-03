import { describe, it, expect, vi } from 'vitest';
import { buildSearchTool } from '../../src/tools/search/tool.js';
import { ok } from '../../src/lib/result.js';
import type { SearchDeps } from '../../src/tools/search/handler.js';

describe('buildSearchTool', () => {
  it('exposes airbnb_search name', () => {
    const deps: SearchDeps = {
      http: { get: vi.fn() },
      cache: { get: () => undefined, set: () => undefined },
      parse: () => ok({ listings: [], total: 0 }),
    };
    const t = buildSearchTool(deps);
    expect(t.name).toBe('airbnb_search');
  });
});
