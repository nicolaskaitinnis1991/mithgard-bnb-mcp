import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  createTool,
  limitToolResponse,
  MAX_TOOL_OUTPUT_BYTES,
  toolError,
  wrapHandler,
} from '../../src/tools/registry.js';
import { parseFailed, rateLimited, upstreamHTTP } from '../../src/lib/errors.js';

describe('[PROTO] wrapHandler', () => {
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

  it('preserves bounded rate-limit scope and queue-timeout reasons without free-form metadata', async () => {
    const local = await wrapHandler(schema, () =>
      Promise.resolve({
        kind: 'RateLimited',
        error: 'private-detail',
        scope: 'local',
        retry_after_ms: 1000,
      }),
    )({ q: 'valid' });
    expect(JSON.parse(local.content[0]?.text ?? '{}')).toMatchObject({
      kind: 'RateLimited',
      scope: 'local',
      retry_after_ms: 1000,
    });
    const timeout = await wrapHandler(schema, () =>
      Promise.resolve({
        kind: 'TransportFailed',
        error: 'private-detail',
        reason: 'QueueTimeout',
        url: 'https://private.example',
      }),
    )({ q: 'valid' });
    expect(JSON.parse(timeout.content[0]?.text ?? '{}')).toMatchObject({
      kind: 'TransportFailed',
      reason: 'QueueTimeout',
    });
    const invalidScope = await wrapHandler(schema, () =>
      Promise.resolve({
        kind: 'RateLimited',
        error: 'private-detail',
        scope: 'private-scope',
      }),
    )({ q: 'valid' });
    expect(JSON.stringify([local, timeout, invalidScope])).not.toContain('private-');
    expect(JSON.stringify(timeout)).not.toContain('private.example');
  });

  it.each(['Busy', 'Closed', 'CircuitOpen', 'Cancelled'])(
    'preserves the safe %s machine-readable failure kind',
    async (kind) => {
      const result = await wrapHandler(schema, () =>
        Promise.resolve({ kind, error: 'private-error-detail' }),
      )({ q: 'valid' });
      expect(result.isError).toBe(true);
      expect(JSON.parse(result.content[0]?.text ?? '{}')).toMatchObject({ kind });
      expect(result.content[0]?.text).not.toContain('private-error-detail');
    },
  );

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

  it('discards a late success after cancellation during the handler', async () => {
    const controller = new AbortController();
    let finish!: (value: unknown) => void;
    const pending = wrapHandler(
      schema,
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    )({ q: 'valid' }, { signal: controller.signal });
    controller.abort();
    finish({ echo: 'private-late-output' });
    const result = await pending;
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]?.text).toContain('Cancelled');
    expect(result.content[0]?.text).not.toContain('private-late-output');
  });

  it('classifies a late rejection after cancellation without exposing its reason', async () => {
    const controller = new AbortController();
    let fail!: (reason: Error) => void;
    const pending = wrapHandler(
      schema,
      () =>
        new Promise((_resolve, reject) => {
          fail = reject;
        }),
    )({ q: 'valid' }, { signal: controller.signal });
    controller.abort();
    fail(new Error('private-handler-failure'));
    const result = await pending;
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain('Cancelled');
    expect(result.content[0]?.text).not.toContain('private-handler-failure');
  });

  it('accepts the exact UTF-8 envelope limit and rejects one additional byte', () => {
    const response = { content: [{ type: 'text' as const, text: '' }], isError: false };
    const overhead = Buffer.byteLength(JSON.stringify(response), 'utf8');
    const first = response.content[0];
    if (!first) throw new Error('Expected text content');
    first.text = 'x'.repeat(MAX_TOOL_OUTPUT_BYTES - overhead);
    expect(limitToolResponse(response)).toBe(response);
    first.text += 'x';
    const rejected = limitToolResponse(response);
    expect(rejected.isError).toBe(true);
    expect(rejected.content[0]?.text).toContain('OutputTooLarge');
    expect(Buffer.byteLength(JSON.stringify(rejected), 'utf8')).toBeLessThan(MAX_TOOL_OUTPUT_BYTES);
  });

  it('counts multibyte output and both representations before returning success', async () => {
    const result = await wrapHandler(schema, () => Promise.resolve({ echo: '🧪'.repeat(40_000) }))({
      q: 'valid',
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]?.text).toContain('OutputTooLarge');
    expect(result.content[0]?.text).not.toContain('🧪');
  });

  it('bounds validation issues and conceals dynamic record keys', async () => {
    const privateKey = 'private-guest-name';
    const inputSchema = z.object({ records: z.record(z.number()) });
    const result = await wrapHandler(inputSchema, () => Promise.resolve({ ok: true }))({
      records: Object.fromEntries(
        Array.from({ length: 30 }, (_, index) => [`${privateKey}${String(index)}`, 'invalid']),
      ),
    });
    const data = JSON.parse(result.content[0]?.text ?? '{}') as {
      issues: unknown[];
      issues_truncated: boolean;
    };
    expect(data.issues).toHaveLength(20);
    expect(data.issues_truncated).toBe(true);
    expect(result.content[0]?.text).not.toContain(privateKey);
    expect(data.issues[0]).toEqual({ code: 'invalid_type', path: ['records', '[field]'] });
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
