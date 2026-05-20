import { describe, it, expect, vi } from 'vitest';
import type { Logger } from 'pino';
import { buildSearchTool } from '../../src/tools/search/tool.js';
import { ok } from '../../src/lib/result.js';
import type { SearchDeps } from '../../src/tools/search/handler.js';

const silentLogger = (): Logger => ({ info: vi.fn(), error: vi.fn() }) as unknown as Logger;

describe('buildSearchTool', () => {
  it('exposes airbnb_search name', () => {
    const deps: SearchDeps = {
      http: { get: vi.fn() },
      cache: { get: () => undefined, set: () => undefined },
      parse: () => ok({ listings: [], total: 0 }),
    };
    const t = buildSearchTool(deps, silentLogger());
    expect(t.name).toBe('airbnb_search');
  });
});
