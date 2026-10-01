import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { createTool, toolError, wrapHandler } from '../../src/tools/registry.js';
import { parseFailed, rateLimited, upstreamHTTP } from '../../src/lib/errors.js';

describe('wrapHandler', () => {
  const schema = z.object({ q: z.string().min(1) });
  // eslint-disable-next-line @typescript-eslint/require-await -- handler signature is async; test stub returns sync value.
  const handler = wrapHandler(schema, async (input) => ({ echo: input.q }));

  it('accepts valid input', async () => {
    const r = await handler({ q: 'hi' });
    const first = r.content[0];
    if (!first) throw new Error('expected content[0]');
    expect(JSON.parse(first.text)).toEqual({ echo: 'hi' });
    expect(r.structuredContent).toEqual({ echo: 'hi' });
    expect(r.isError).toBe(false);
  });
  it('rejects invalid input', async () => {
    const r = await handler({ q: '' });
    const first = r.content[0];
    if (!first) throw new Error('expected content[0]');
    const body = JSON.parse(first.text) as { error: string };
    expect(body.error).toBe('ValidationFailed');
    expect(r.isError).toBe(true);
    expect(r.structuredContent).toBeUndefined();
  });

  it('exposes input constraints and output schema from their runtime validators', () => {
    const tool = createTool({
      name: 'echo',
      description: 'Echo',
      schema: z.object({ q: z.string().min(1), count: z.number().int().min(1).max(5).default(2) }),
      output: z.object({ echo: z.string() }),
      handler: (input) => Promise.resolve({ echo: input.q }),
    });
    expect(tool.inputSchema.properties).toMatchObject({
      q: { type: 'string', minLength: 1 },
      count: { type: 'integer', minimum: 1, maximum: 5, default: 2 },
    });
    expect(tool.inputSchema.required).toEqual(['q']);
    expect(tool.outputSchema?.properties).toEqual({ echo: { type: 'string' } });
    expect(tool.annotations?.readOnlyHint).toBe(true);
  });

  it('rejects invalid output without exposing output values', async () => {
    const secret = 'private-guest-message';
    const wrapped = wrapHandler(
      schema,
      () => Promise.resolve({ echo: secret }),
      z.object({ echo: z.number() }),
    );
    const result = await wrapped({ q: 'valid' });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('OutputValidationFailed');
    expect(result.content[0]?.text).not.toContain(secret);
  });

  it('does not echo invalid enum values through Zod issues', async () => {
    const secret = 'private-message-in-enum';
    const wrapped = wrapHandler(z.object({ mode: z.enum(['safe']) }), () =>
      Promise.resolve({ ok: true }),
    );
    const result = await wrapped({ mode: secret });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).not.toContain(secret);
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toMatchObject({
      issues: [{ code: 'invalid_enum_value', path: ['mode'] }],
    });
  });

  it('catches unexpected handler failures without exposing the exception', async () => {
    const secret = 'Authorization: sensitive-test-token';
    const wrapped = wrapHandler(schema, () => Promise.reject(new Error(secret)));
    const result = await wrapped({ q: 'valid' });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('UnexpectedError');
    expect(result.content[0]?.text).not.toContain(secret);
  });

  it('marks domain failures as MCP errors and preserves safe retry guidance', async () => {
    const wrapped = wrapHandler(schema, () =>
      Promise.resolve(toolError(rateLimited(3000, 'private-source'))),
    );
    const result = await wrapped({ q: 'valid' });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toMatchObject({
      kind: 'RateLimited',
      retry_after_ms: 3000,
    });
    expect(result.content[0]?.text).not.toContain('private-source');
  });

  it('redacts upstream URLs, response bodies and parser causes from public errors', () => {
    const url = 'https://example.test/?token=private-test-token';
    const publicErrors = [
      toolError(upstreamHTTP(503, url, 'private-body')),
      toolError(parseFailed('private-selector', url, 'private-cause')),
    ];
    const encoded = JSON.stringify(publicErrors);
    expect(encoded).not.toContain('private-');
    expect(publicErrors[0]).toMatchObject({ kind: 'UpstreamHTTP', status: 503 });
  });

  it('does not leak manually returned domain error messages or extra fields', async () => {
    const result = await wrapHandler(schema, () =>
      Promise.resolve({
        error: 'private-error-message',
        kind: 'ParseFailed',
        body: 'private-upstream-body',
      }),
    )({ q: 'valid' });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('ParseFailed');
    expect(result.content[0]?.text).not.toContain('private-');
  });

  it('does not call a handler for an already-cancelled MCP request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fn = vi.fn(() => Promise.resolve({ echo: 'unused' }));
    const result = await wrapHandler(schema, fn)({ q: 'valid' }, { signal: controller.signal });
    expect(result.isError).toBe(true);
    expect(fn).not.toHaveBeenCalled();
  });

  it('rejects non-object and non-finite outputs instead of silently changing JSON values', async () => {
    const nonObject = await wrapHandler(schema, () => Promise.resolve(['invalid']))({ q: 'valid' });
    expect(nonObject.isError).toBe(true);
    const infinity = await wrapHandler(schema, () => Promise.resolve({ amount: Infinity }))({
      q: 'valid',
    });
    expect(infinity.isError).toBe(true);
  });
});
