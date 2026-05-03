import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { wrapHandler } from '../../src/tools/registry.js';

describe('wrapHandler', () => {
  const schema = z.object({ q: z.string().min(1) });
  // eslint-disable-next-line @typescript-eslint/require-await -- handler signature is async; test stub returns sync value.
  const handler = wrapHandler(schema, async (input) => ({ echo: input.q }));

  it('accepts valid input', async () => {
    const r = await handler({ q: 'hi' });
    const first = r.content[0];
    if (!first) throw new Error('expected content[0]');
    expect(JSON.parse(first.text)).toEqual({ echo: 'hi' });
  });
  it('rejects invalid input', async () => {
    const r = await handler({ q: '' });
    const first = r.content[0];
    if (!first) throw new Error('expected content[0]');
    const body = JSON.parse(first.text) as { error: string };
    expect(body.error).toBe('ValidationFailed');
  });
});
