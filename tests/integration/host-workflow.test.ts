import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import type { Logger } from 'pino';
import { createTool, type ToolDefinition } from '../../src/tools/registry.js';
import { WorkflowEngine } from '../../src/workflows/engine.js';
import { buildWorkflowTool } from '../../src/workflows/tool.js';
import { WorkflowOutput } from '../../src/workflows/schema.js';

const fixture = (
  name = 'host_insights',
  handler = vi.fn(() => Promise.resolve({ _source: 'provided', value: 7 })),
) =>
  createTool({
    name,
    description: 'Local test fixture',
    schema: z.object({ value: z.number().optional() }).strict(),
    output: z.object({
      _source: z.string(),
      value: z.number(),
      approval_required: z.boolean().optional(),
    }),
    handler,
  });
const step = (id: string, tool = 'host_insights', args: Record<string, unknown> = {}) => ({
  id,
  tool,
  arguments: args,
});
const workflow = (tools: ToolDefinition[]) => buildWorkflowTool(new WorkflowEngine(tools));

describe('[FLOW] bounded plan, execution and verification', () => {
  it('creates a reviewable plan without calling tools or retaining supplied values', async () => {
    const tool = fixture();
    const response = await workflow([tool]).handler({
      steps: [step('insights', tool.name, { value: 123456 })],
    });
    expect(response.isError).toBe(false);
    expect(response.structuredContent).toMatchObject({
      execution_status: 'planned',
      acceptance_status: 'not_executed',
      plan: [{ argument_fields: ['value'] }],
    });
    expect(JSON.stringify(response)).not.toContain('123456');
  });
  it('preflights every step before executing the first one', async () => {
    const handler = vi.fn(() => Promise.resolve({ _source: 'provided', value: 7 }));
    const tool = fixture('host_insights', handler);
    const response = await workflow([tool]).handler({
      mode: 'execute',
      steps: [step('valid'), step('invalid', tool.name, { value: 'private' })],
    });
    expect(response.isError).toBe(true);
    expect(handler).not.toHaveBeenCalled();
    expect(JSON.stringify(response)).not.toContain('private');
  });
  it.each([
    { steps: [step('one', 'host_workflow')] },
    { steps: [step('one', 'unknown')] },
    { steps: [step('same'), step('same')] },
    { steps: [{ ...step('one'), depends_on: ['two'] }, step('two')] },
    { steps: [{ ...step('one'), depends_on: ['one'] }] },
    { steps: Array.from({ length: 9 }, (_, i) => step(`s${String(i)}`)) },
    { steps: [step('one')], shared_arguments: { unknown: 'unused' } },
    { steps: [step('one')], timeout_ms: 99 },
    { steps: [step('one')], shared_arguments: { value: 'x'.repeat(256 * 1024) } },
  ])('rejects invalid or unbounded plans %#', async (input) => {
    expect((await workflow([fixture()]).handler(input)).isError).toBe(true);
  });
  it('merges declared shared fields and permits explicit per-step overrides', async () => {
    const handler = vi.fn((input: { value?: number }) =>
      Promise.resolve({ _source: 'provided', value: input.value ?? 0 }),
    );
    const tool = createTool({
      name: 'host_insights',
      description: 'fixture',
      schema: z.object({ value: z.number() }).strict(),
      output: z.object({ _source: z.string(), value: z.number() }),
      handler,
    });
    const response = await workflow([tool]).handler({
      mode: 'execute',
      shared_arguments: { value: 2 },
      steps: [step('first'), step('second', tool.name, { value: 3 })],
    });
    expect(response.isError).toBe(false);
    expect(handler.mock.calls.map(([input]) => input.value)).toEqual([2, 3]);
    expect(response.structuredContent).toMatchObject({
      execution_status: 'verified',
      acceptance_status: 'technical_verified',
      summary: { completed: 2, technical_verified: true },
    });
    expect(WorkflowOutput.safeParse(response.structuredContent).success).toBe(true);
  });
  it('retains provenance and separates technical verification from human approval', async () => {
    const tools = ['public', 'provided', 'demo', 'local'].map((source, index) => {
      const name =
        ['airbnb_search', 'host_insights', 'review_responder', 'operations_status'][index] ??
        'host_insights';
      return createTool({
        name,
        description: 'fixture',
        schema: z.object({}),
        output: z.object({ _source: z.string(), approval_required: z.boolean() }),
        handler: () => Promise.resolve({ _source: source, approval_required: source === 'demo' }),
      });
    });
    const response = await workflow(tools).handler({
      mode: 'execute',
      steps: tools.map((tool, i) => step(`s${String(i)}`, tool.name)),
    });
    expect(response.structuredContent).toMatchObject({
      execution_status: 'verified',
      acceptance_status: 'approval_pending',
      summary: { approval_required: true },
      results: tools.map((_, i) => ({ source: ['public', 'provided', 'demo', 'local'][i] })),
    });
  });
  it('returns valid structured partial failure and skips dependent work', async () => {
    const tool = fixture();
    const failed = fixture('review_responder');
    failed.handler = () =>
      Promise.resolve({
        content: [{ type: 'text', text: '{"kind":"ParseFailed","private":"secret"}' }],
        isError: true,
      });
    const response = await workflow([tool, failed]).handler({
      mode: 'execute',
      stop_on_error: false,
      steps: [
        step('ok'),
        step('bad', failed.name),
        { ...step('dependent'), depends_on: ['bad'] },
        step('independent'),
      ],
    });
    expect(response.isError).toBe(true);
    expect(response.structuredContent).toMatchObject({
      execution_status: 'partial',
      acceptance_status: 'not_verified',
      summary: { completed: 2, failed: 1, skipped: 1, technical_verified: false },
    });
    expect(WorkflowOutput.safeParse(response.structuredContent).success).toBe(true);
    expect(JSON.stringify(response)).not.toContain('secret');
  });
  it('stops subsequent independent work by default after failure', async () => {
    const tool = fixture();
    tool.handler = () => Promise.reject(new Error('private'));
    const response = await workflow([tool]).handler({
      mode: 'execute',
      steps: [step('bad'), step('later')],
    });
    expect(response.structuredContent).toMatchObject({
      execution_status: 'failed',
      summary: { failed: 1, skipped: 1 },
    });
    expect(JSON.stringify(response)).not.toContain('private');
  });
  it.each(['missing', 'invalid', 'text', 'oversized'])(
    'verifies %s sub-results instead of trusting success',
    async (variant) => {
      const tool = fixture();
      tool.handler = () => {
        const data =
          variant === 'invalid'
            ? { _source: 'provided', value: 'bad' }
            : variant === 'oversized'
              ? { _source: 'x'.repeat(100_000), value: 1 }
              : { _source: 'provided', value: 1 };
        return Promise.resolve({
          content: [{ type: 'text', text: variant === 'text' ? '{}' : JSON.stringify(data) }],
          ...(variant === 'missing' ? {} : { structuredContent: data }),
          isError: false,
        });
      };
      const result = await workflow([tool]).handler({ mode: 'execute', steps: [step('first')] });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        execution_status: 'failed',
        results: [
          { error_kind: variant === 'oversized' ? 'OutputTooLarge' : 'OutputValidationFailed' },
        ],
      });
    },
  );
  it('deadline cancels an uncooperative handler and prevents later execution', async () => {
    const handler = vi.fn(() => new Promise<{ _source: string; value: number }>(() => undefined));
    const result = await workflow([fixture('host_insights', handler)]).handler({
      mode: 'execute',
      timeout_ms: 100,
      steps: [step('one'), step('two')],
    });
    expect(result.structuredContent).toMatchObject({
      execution_status: 'cancelled',
      summary: { cancelled: 2 },
    });
    expect(handler).toHaveBeenCalledTimes(1);
  });
  it('bounds active workflows and aborts them on close', async () => {
    const tool = fixture(
      'host_insights',
      vi.fn(() => new Promise<{ _source: string; value: number }>(() => undefined)),
    );
    const engine = new WorkflowEngine([tool]);
    const input = {
      mode: 'execute' as const,
      steps: [{ id: 's', tool: 'host_insights' as const, arguments: {}, depends_on: [] }],
      shared_arguments: {},
      timeout_ms: 1000,
      stop_on_error: true,
    };
    const active = Array.from({ length: 4 }, () => engine.run(input));
    expect(await engine.run(input)).toMatchObject({ kind: 'Busy' });
    engine.close();
    expect(
      (await Promise.all(active)).every(
        (result) => 'execution_status' in result && result.execution_status === 'cancelled',
      ),
    ).toBe(true);
    expect(await engine.run(input)).toMatchObject({ kind: 'Closed' });
  });
  it('rejects a synchronous late result even when a busy event loop delays the timer', async () => {
    const tool = fixture(
      'host_insights',
      vi.fn(() => {
        const stop = performance.now() + 150;
        while (performance.now() < stop) {
          /* deliberately blocks timers */
        }
        return Promise.resolve({ _source: 'provided', value: 1 });
      }),
    );
    const response = await workflow([tool]).handler({
      mode: 'execute',
      timeout_ms: 100,
      steps: [step('late')],
    });
    expect(response.structuredContent).toMatchObject({
      execution_status: 'cancelled',
      summary: { technical_verified: false, cancelled: 1 },
    });
    expect(response.isError).toBe(true);
  });
  it('retains slots after timeout until uncooperative underlying work settles', async () => {
    const releases: (() => void)[] = [];
    const tool = fixture(
      'host_insights',
      vi.fn(
        () =>
          new Promise<{ _source: string; value: number }>((resolve) => {
            releases.push(() => {
              resolve({ _source: 'provided', value: 1 });
            });
          }),
      ),
    );
    const engine = new WorkflowEngine([tool]);
    const input = {
      mode: 'execute' as const,
      steps: [{ id: 's', tool: 'host_insights' as const, arguments: {}, depends_on: [] }],
      shared_arguments: {},
      timeout_ms: 100,
      stop_on_error: true,
    };
    const timedOut = await Promise.all(Array.from({ length: 4 }, () => engine.run(input)));
    expect(
      timedOut.every(
        (result) => 'execution_status' in result && result.execution_status === 'cancelled',
      ),
    ).toBe(true);
    expect(await engine.run(input)).toMatchObject({ kind: 'Busy' });
    for (const release of releases) release();
    await new Promise((resolve) => setImmediate(resolve));
    expect(await engine.run({ ...input, mode: 'plan' })).toMatchObject({
      execution_status: 'planned',
    });
    tool.handler = fixture().handler;
    expect(await engine.run(input)).toMatchObject({ execution_status: 'verified' });
    engine.close();
  });
  it('caller cancellation cannot become a successful late response', async () => {
    const controller = new AbortController();
    const tool = fixture();
    controller.abort();
    const result = await workflow([tool]).handler(
      { mode: 'execute', steps: [step('one')] },
      { signal: controller.signal },
    );
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain('Cancelled');
  });
  it('requires an available output validator for every registered step', async () => {
    const tool = fixture();
    delete tool.output;
    expect((await workflow([tool]).handler({ steps: [step('one')] })).isError).toBe(true);
  });
});

describe('[FLOW] checked documentation example', () => {
  it('plans and executes the three supplied-data engines using the saved example', async () => {
    const { readFileSync } = await import('node:fs');
    const { mockTools } = await import('../../src/tools/index.js');
    const log = {
      info: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
    const example = JSON.parse(readFileSync('examples/host-workflow.json', 'utf8')) as Record<
      string,
      unknown
    >;
    const tool = workflow(mockTools(log));
    const planned = await tool.handler(example);
    expect(planned.structuredContent?.execution_status).toBe('planned');
    const executed = await tool.handler({ ...example, mode: 'execute' });
    expect(executed.isError).toBe(false);
    expect(executed.structuredContent).toMatchObject({
      execution_status: 'verified',
      acceptance_status: 'approval_pending',
      summary: { completed: 3, approval_required: true },
      results: [{ source: 'provided' }, { source: 'provided' }, { source: 'provided' }],
    });
  });
});
