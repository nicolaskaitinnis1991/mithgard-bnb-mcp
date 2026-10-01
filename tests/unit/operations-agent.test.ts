import { describe, it, expect, vi } from 'vitest';
import pino from 'pino';
import { z } from 'zod';
import { OperationsAgent } from '../../src/operations/agent.js';
import { buildOperationsTool } from '../../src/operations/tool.js';
import { createTool } from '../../src/tools/registry.js';

const log = pino({ enabled: false });
const makeTool = (handler: () => Promise<unknown>, description = 'Public test') =>
  createTool({
    name: 'test',
    description,
    schema: z.object({}).strict(),
    output: z.object({
      ok: z.boolean(),
      _source: z.enum(['public', 'provided', 'demo', 'local']).optional(),
    }),
    handler,
  });

describe('local operations agent', () => {
  it('reports unverified before calls and distinguishes demo from public health', async () => {
    const agent = new OperationsAgent(log);
    const tool = agent.supervise(makeTool(() => Promise.resolve({ ok: true })));
    expect(agent.snapshot().status).toBe('unverified');
    await tool.handler({});
    expect(agent.snapshot().status).toBe('healthy');
    expect((await buildOperationsTool(agent).handler({})).isError).not.toBe(true);
    const demoAgent = new OperationsAgent(log);
    const demo = demoAgent.supervise(makeTool(() => Promise.resolve({ ok: true }), '[DEMO] test'));
    await demo.handler({});
    expect(demoAgent.snapshot().status).toBe('unverified');
  });

  it('contains repeated outages and allows a single recovery probe', async () => {
    let clock = 0;
    const clear = vi.fn();
    const invoke = vi.fn().mockResolvedValue({ error: 'unavailable', kind: 'UpstreamHTTP' });
    const agent = new OperationsAgent(log, {
      now: () => clock,
      cooldownMs: 100,
      clearCaches: clear,
    });
    const tool = agent.supervise(makeTool(invoke));
    for (let i = 0; i < 3; i++) expect((await tool.handler({})).isError).toBe(true);
    expect(agent.snapshot().status).toBe('degraded');
    expect(clear).toHaveBeenCalledTimes(1);
    await tool.handler({});
    expect(invoke).toHaveBeenCalledTimes(3);
    clock = 101;
    invoke.mockResolvedValue({ ok: true });
    await tool.handler({});
    expect(agent.snapshot().status).toBe('healthy');
    expect(agent.snapshot().recovery_count).toBe(1);
  });

  it('does not trip recovery for invalid caller input and does not store guest data', async () => {
    const agent = new OperationsAgent(log);
    const tool = agent.supervise(makeTool(() => Promise.resolve({ ok: true })));
    for (let i = 0; i < 6; i++)
      await tool.handler({ guest_name: 'Private Guest', message: 'SECRET' });
    const snapshot = JSON.stringify(agent.snapshot());
    expect(agent.snapshot().recovery_count).toBe(0);
    expect(snapshot).not.toContain('Private Guest');
    expect(snapshot).not.toContain('SECRET');
    expect(agent.snapshot().tools[0]?.errors).toBe(6);
  });

  it('bounds concurrency, releases accounting, and rejects calls during shutdown', async () => {
    let finish: (value: { ok: boolean }) => void = () => undefined;
    const handler = () =>
      new Promise<{ ok: boolean }>((resolve) => {
        finish = resolve;
      });
    const agent = new OperationsAgent(log, { maxActive: 1 });
    const tool = agent.supervise(makeTool(handler));
    const first = tool.handler({});
    expect((await tool.handler({})).isError).toBe(true);
    expect(agent.snapshot().active_calls).toBe(1);
    finish({ ok: true });
    await first;
    expect(agent.snapshot().active_calls).toBe(0);
    agent.close();
    expect((await tool.handler({})).isError).toBe(true);
    expect(agent.snapshot().status).toBe('stopped');
  });

  it('contains unexpected handler crashes without leaking exceptions', async () => {
    const agent = new OperationsAgent(log);
    const base = makeTool(() => Promise.resolve({ ok: true }));
    const tool = agent.supervise({
      ...base,
      handler: () => Promise.reject(new Error('private token')),
    });
    const response = await tool.handler({});
    expect(response.isError).toBe(true);
    expect(JSON.stringify(response)).not.toContain('private token');
    expect(agent.snapshot().active_calls).toBe(0);
  });

  it('keeps a new circuit open when an older concurrent request succeeds', async () => {
    let finish: (value: { ok: boolean }) => void = () => undefined;
    let calls = 0;
    const agent = new OperationsAgent(log, { failureThreshold: 1 });
    const base = makeTool(() => {
      calls += 1;
      return calls === 1
        ? new Promise<{ ok: boolean }>((resolve) => {
            finish = resolve;
          })
        : Promise.resolve({ error: 'unavailable', kind: 'UpstreamHTTP' });
    });
    const tool = agent.supervise(base);
    const old = tool.handler({});
    await tool.handler({});
    finish({ ok: true });
    await old;
    await tool.handler({});
    expect(calls).toBe(2);
    expect(agent.snapshot().status).toBe('degraded');
    expect(agent.snapshot().tools[0]?.cooldown_until).not.toBeNull();
  });

  it('allows only one concurrent recovery probe and forwards cancellation context', async () => {
    let clock = 0;
    let finish: (value: { ok: boolean }) => void = () => undefined;
    let seenSignal: AbortSignal | undefined;
    const agent = new OperationsAgent(log, {
      now: () => clock,
      cooldownMs: 10,
      failureThreshold: 1,
    });
    const base = makeTool(() => Promise.resolve({ ok: true }));
    const invoke = vi.fn().mockResolvedValue({
      isError: true,
      content: [{ type: 'text', text: '{"kind":"UpstreamHTTP"}' }],
    });
    const tool = agent.supervise({ ...base, handler: invoke });
    await tool.handler({});
    clock = 11;
    invoke.mockImplementation((_input: unknown, context?: { signal: AbortSignal }) => {
      seenSignal = context?.signal;
      return new Promise((resolve) => {
        finish = (value) => {
          resolve({ content: [{ type: 'text', text: JSON.stringify(value) }] });
        };
      });
    });
    const signal = new AbortController().signal;
    const probe = tool.handler({}, { signal });
    const parallel = await tool.handler({});
    expect(parallel.isError).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(seenSignal).toBe(signal);
    finish({ ok: true });
    await probe;
    expect(agent.snapshot().active_calls).toBe(0);
    expect(agent.snapshot().status).toBe('healthy');
  });

  it('[OPS] never trips the upstream circuit for local queue deadlines or overload', async () => {
    const agent = new OperationsAgent(log, { failureThreshold: 1 });
    const invoke = vi.fn().mockResolvedValue({
      error: 'local deadline',
      kind: 'TransportFailed',
      reason: 'QueueTimeout',
    });
    const tool = agent.supervise(makeTool(invoke));
    for (let i = 0; i < 6; i++) await tool.handler({});
    expect(agent.snapshot().recovery_count).toBe(0);
    expect(agent.snapshot().tools[0]).toMatchObject({
      consecutive_failures: 0,
      cooldown_until: null,
    });
    invoke.mockResolvedValue({
      error: 'local quota',
      kind: 'RateLimited',
      retry_after_ms: 3_600_000,
      scope: 'local',
    });
    for (let i = 0; i < 6; i++) await tool.handler({});
    expect(agent.snapshot().recovery_count).toBe(0);
    expect(agent.snapshot().tools[0]).toMatchObject({
      consecutive_failures: 0,
      cooldown_until: null,
    });
  });

  it('[OPS] ignores an old failure and long Retry-After after a newer successful recovery', async () => {
    let clock = 0;
    let finish: (value: unknown) => void = () => undefined;
    const invoke = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValueOnce({ error: 'unavailable', kind: 'UpstreamHTTP' })
      .mockResolvedValueOnce({ ok: true });
    const agent = new OperationsAgent(log, {
      now: () => clock,
      cooldownMs: 100,
      failureThreshold: 1,
    });
    const tool = agent.supervise(makeTool(invoke));
    const old = tool.handler({});
    await tool.handler({});
    clock = 101;
    await tool.handler({});
    finish({ error: 'late throttle', kind: 'RateLimited', retry_after_ms: 120_000 });
    await old;
    expect(agent.snapshot().status).toBe('healthy');
    expect(agent.snapshot().tools[0]).toMatchObject({
      consecutive_failures: 0,
      cooldown_until: null,
      last_error_kind: null,
      errors: 2,
      successes: 1,
    });
    expect(agent.snapshot().recovery_count).toBe(1);
  });

  it('[OPS] extends the same outage cooldown for a delayed longer Retry-After', async () => {
    let clock = 0;
    let finish: (value: unknown) => void = () => undefined;
    const invoke = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      )
      .mockResolvedValue({ error: 'unavailable', kind: 'UpstreamHTTP' });
    const agent = new OperationsAgent(log, {
      now: () => clock,
      cooldownMs: 100,
      failureThreshold: 1,
    });
    const tool = agent.supervise(makeTool(invoke));
    const old = tool.handler({});
    await tool.handler({});
    clock = 1;
    finish({ error: 'late throttle', kind: 'RateLimited', retry_after_ms: 120_000 });
    await old;
    expect(agent.snapshot().tools[0]?.cooldown_until).toBe(120_001);
    clock = 101;
    expect((await tool.handler({})).isError).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('[OPS] keeps provided/demo/local provenance separate and expires observed public health', async () => {
    let clock = 0;
    const agent = new OperationsAgent(log, { now: () => clock, healthFreshnessMs: 100 });
    const invoke = vi.fn().mockResolvedValue({ ok: true, _source: 'provided' });
    const tool = agent.supervise(makeTool(invoke));
    await tool.handler({});
    expect(agent.snapshot().status).toBe('unverified');
    expect(agent.snapshot().tools[0]?.observed_sources.provided).toBe(1);
    invoke.mockResolvedValue({ ok: true, _source: 'public' });
    await tool.handler({});
    expect(agent.snapshot().status).toBe('healthy');
    clock = 101;
    expect(agent.snapshot().status).toBe('unverified');
    expect(agent.snapshot().health_scope).toContain('No active probes');
  });

  it('[OPS] reports busy, circuit and shutdown rejections without retaining caller content', async () => {
    let finish: (value: { ok: boolean }) => void = () => undefined;
    const agent = new OperationsAgent(log, { maxActive: 1 });
    const tool = agent.supervise(
      makeTool(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const first = tool.handler({});
    await tool.handler({ guest: 'PRIVATE' });
    finish({ ok: true });
    await first;
    agent.close();
    await tool.handler({});
    expect(agent.snapshot().tools[0]?.rejections).toMatchObject({ busy: 1, closed: 1 });
    expect(JSON.stringify(agent.snapshot())).not.toContain('PRIVATE');
  });
});
