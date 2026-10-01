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
    output: z.object({ ok: z.boolean() }),
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
    const invoke = vi
      .fn()
      .mockResolvedValue({
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
});
