import type { ToolCallContext, ToolDefinition, ToolResponse } from '../tools/registry.js';
import type { WorkflowInput, WorkflowOutput } from './schema.js';

type Failure = { error: string; kind: string };
const failure = (kind: string): Failure => ({ error: 'Workflow could not be prepared.', kind });
const safeKind = (response: ToolResponse): string => {
  try {
    const error = JSON.parse(response.content[0]?.text ?? '{}') as { kind?: unknown };
    // Never copy arbitrary provider messages, keys or credentials into errors.
    const allowed = [
      'ValidationFailed',
      'OutputValidationFailed',
      'OutputTooLarge',
      'Cancelled',
      'TransportFailed',
      'UpstreamHTTP',
      'ParseFailed',
      'RateLimited',
      'Busy',
      'CircuitOpen',
      'Closed',
    ];
    return typeof error.kind === 'string' && allowed.includes(error.kind)
      ? error.kind
      : 'ToolFailed';
  } catch {
    return 'ToolFailed';
  }
};
const provenance = (
  data: Record<string, unknown>,
  tool: string,
): 'public' | 'provided' | 'demo' | 'local' | 'unknown' => {
  if (data._source === 'provided') return 'provided';
  if (data._source === 'demo' || data._mock === true) return 'demo';
  if (tool === 'operations_status') return 'local';
  if (data._source === 'public' || tool.startsWith('airbnb_')) return 'public';
  return 'unknown';
};
const approvals = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(approvals);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      record.approval_required === true ||
      record.requires_approval === true ||
      Object.values(record).some(approvals)
    );
  }
  return false;
};

/** Bounded, explicit tool orchestration. No model, background writes or repair actions. */
export class WorkflowEngine {
  private readonly tools: Map<string, ToolDefinition>;
  private readonly active = new Set<AbortController>();
  private closed = false;
  constructor(tools: ToolDefinition[]) {
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
  }
  close(): void {
    this.closed = true;
    for (const controller of this.active) controller.abort();
  }
  async run(input: WorkflowInput, context?: ToolCallContext): Promise<WorkflowOutput | Failure> {
    if (this.closed) return failure('Closed');
    const prepared: {
      step: WorkflowInput['steps'][number];
      tool: ToolDefinition;
      args: Record<string, unknown>;
    }[] = [];
    const usedShared = new Set<string>();
    for (const step of input.steps) {
      const tool = this.tools.get(step.tool);
      if (!tool?.output) return failure('ValidationFailed');
      const properties = tool.inputSchema.properties ?? {};
      const shared = Object.fromEntries(
        Object.entries(input.shared_arguments).filter(([key]) => {
          if (Object.hasOwn(properties, key)) {
            usedShared.add(key);
            return true;
          }
          return false;
        }),
      );
      const args = { ...shared, ...step.arguments };
      if (!tool.schema.safeParse(args).success) return failure('ValidationFailed');
      prepared.push({ step, tool, args });
    }
    if (Object.keys(input.shared_arguments).some((key) => !usedShared.has(key)))
      return failure('ValidationFailed');
    const output: WorkflowOutput = {
      execution_status: 'planned',
      acceptance_status: 'not_executed',
      plan: prepared.map(({ step, args, tool }) => ({
        id: step.id,
        tool: step.tool,
        depends_on: step.depends_on,
        // Retain only declared field names, never guest data or free-form keys.
        argument_fields: Object.keys(args)
          .filter((key) => Object.hasOwn(tool.inputSchema.properties ?? {}, key))
          .sort(),
      })),
      results: [],
      summary: {
        completed: 0,
        failed: 0,
        skipped: 0,
        cancelled: 0,
        approval_required: false,
        technical_verified: false,
      },
      limits: { max_steps: 8, max_concurrent: 4, timeout_ms: input.timeout_ms },
    };
    if (input.mode === 'plan') return output;
    if (this.active.size >= 4) return failure('Busy');
    const controller = new AbortController();
    const abort = () => {
      controller.abort();
    };
    const expiresAt = performance.now() + input.timeout_ms;
    const isCancelled = () => {
      if (performance.now() >= expiresAt) controller.abort();
      return controller.signal.aborted;
    };
    context?.signal.addEventListener('abort', abort, { once: true });
    if (context?.signal.aborted) abort();
    this.active.add(controller);
    const deadline = setTimeout(abort, input.timeout_ms);
    let stop = false;
    let executionFinished = false;
    let pendingHandlers = 0;
    const retire = () => {
      if (executionFinished && pendingHandlers === 0) this.active.delete(controller);
    };
    try {
      for (const { step, tool, args } of prepared) {
        const started = performance.now();
        const base = { id: step.id, tool: step.tool, source: 'unknown' as const, duration_ms: 0 };
        if (isCancelled()) {
          output.results.push({ ...base, status: 'cancelled', error_kind: 'Cancelled' });
          continue;
        }
        if (
          stop ||
          step.depends_on.some(
            (id) => output.results.find((result) => result.id === id)?.status !== 'completed',
          )
        ) {
          output.results.push({ ...base, status: 'skipped' });
          continue;
        }
        let onAbort: (() => void) | undefined;
        try {
          const cancelled = new Promise<never>((_resolve, reject) => {
            onAbort = () => {
              reject(new Error('Cancelled'));
            };
            controller.signal.addEventListener('abort', onAbort, { once: true });
          });
          pendingHandlers++;
          const running = Promise.resolve().then(() => {
            if (isCancelled()) throw new Error('Cancelled');
            return tool.handler(args, { signal: controller.signal });
          });
          const settled = () => {
            pendingHandlers--;
            retire();
          };
          void running.then(settled, settled);
          const response = await Promise.race([running, cancelled]);
          if (isCancelled()) throw new Error('Cancelled');
          const data = response.structuredContent;
          let errorKind: string | undefined;
          if (response.isError) errorKind = safeKind(response);
          else if (
            !data ||
            !tool.output?.safeParse(data).success ||
            response.content[0]?.text !== JSON.stringify(data)
          )
            errorKind = 'OutputValidationFailed';
          else if (
            Buffer.byteLength(
              JSON.stringify([...output.results, { ...base, output: data }]),
              'utf8',
            ) >
            96 * 1024
          )
            errorKind = 'OutputTooLarge';
          if (errorKind || data === undefined) {
            output.results.push({
              ...base,
              duration_ms: performance.now() - started,
              status: 'failed',
              error_kind: errorKind ?? 'OutputValidationFailed',
            });
            stop = input.stop_on_error;
          } else {
            output.results.push({
              ...base,
              duration_ms: performance.now() - started,
              status: 'completed',
              output: data,
              source: provenance(data, step.tool),
            });
            output.summary.approval_required ||= approvals(data);
          }
        } catch {
          output.results.push({
            ...base,
            duration_ms: performance.now() - started,
            status: isCancelled() ? 'cancelled' : 'failed',
            error_kind: isCancelled() ? 'Cancelled' : 'ToolFailed',
          });
          stop = input.stop_on_error;
        } finally {
          if (onAbort) controller.signal.removeEventListener('abort', onAbort);
        }
      }
      for (const result of output.results) output.summary[result.status]++;
      const cancelled = isCancelled() || output.summary.cancelled > 0;
      const success = !cancelled && output.summary.completed === prepared.length;
      output.summary.technical_verified = success;
      output.execution_status = cancelled
        ? 'cancelled'
        : success
          ? 'verified'
          : output.summary.completed > 0
            ? 'partial'
            : 'failed';
      output.acceptance_status = success
        ? output.summary.approval_required
          ? 'approval_pending'
          : 'technical_verified'
        : 'not_verified';
      return output;
    } finally {
      clearTimeout(deadline);
      context?.signal.removeEventListener('abort', abort);
      executionFinished = true;
      retire();
    }
  }
}
