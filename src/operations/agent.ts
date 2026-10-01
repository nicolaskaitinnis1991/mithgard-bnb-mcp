import type { Logger } from 'pino';
import type { ToolDefinition, ToolResponse } from '../tools/registry.js';

export interface OperationsOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  maxActive?: number;
  now?: () => number;
  clearCaches?: () => void;
}

interface ToolState {
  name: string;
  mode: 'public' | 'demo';
  calls: number;
  successes: number;
  errors: number;
  active: number;
  consecutive_failures: number;
  last_duration_ms: number;
  max_duration_ms: number;
  last_error_kind: string | null;
  last_success_at: number | null;
  cooldown_until: number | null;
  recovery_probe: boolean;
  circuit_generation: number;
}

const errorResult = (kind: string, message: string): ToolResponse => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify({ kind, error: message }) }],
});

const failureInfo = (
  result: ToolResponse,
): { kind: string; reason?: string; retryMs?: number } | null => {
  if (!result.isError) return null;
  const text = result.content[0]?.text;
  if (text !== undefined && text.length < 65_536) {
    try {
      const detail: unknown = JSON.parse(text);
      if (typeof detail === 'object' && detail !== null && 'kind' in detail) {
        const kind = detail.kind;
        if (typeof kind === 'string' && /^[A-Za-z]{1,40}$/.test(kind)) {
          const reason =
            'reason' in detail && typeof detail.reason === 'string' ? detail.reason : undefined;
          const retryMs =
            'retry_after_ms' in detail &&
            typeof detail.retry_after_ms === 'number' &&
            Number.isFinite(detail.retry_after_ms)
              ? Math.min(3_600_000, Math.max(0, detail.retry_after_ms))
              : undefined;
          return {
            kind,
            ...(reason !== undefined ? { reason } : {}),
            ...(retryMs !== undefined ? { retryMs } : {}),
          };
        }
      }
    } catch {
      // Error content is untrusted; diagnostics never retain its raw text.
    }
  }
  return { kind: 'ToolError' };
};

/** Local rule-based operations agent. It stores counters, never guest content. */
export class OperationsAgent {
  private readonly states = new Map<string, ToolState>();
  private readonly startedAt: number;
  private readonly now: () => number;
  private readonly failureThreshold: number;
  private readonly cooldownMs: number;
  private readonly maxActive: number;
  private active = 0;
  private closed = false;
  private recoveryCount = 0;

  constructor(
    private readonly log: Logger,
    private readonly options: OperationsOptions = {},
  ) {
    this.now = options.now ?? Date.now;
    this.startedAt = this.now();
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownMs = options.cooldownMs ?? 30_000;
    this.maxActive = options.maxActive ?? 64;
    if (
      !Number.isInteger(this.failureThreshold) ||
      this.failureThreshold < 1 ||
      !Number.isFinite(this.cooldownMs) ||
      this.cooldownMs < 1 ||
      !Number.isInteger(this.maxActive) ||
      this.maxActive < 1
    )
      throw new Error('Invalid operations agent limits');
  }

  supervise(tool: ToolDefinition): ToolDefinition {
    if (this.states.has(tool.name)) throw new Error('Duplicate supervised tool');
    const state: ToolState = {
      name: tool.name,
      mode: tool.description.startsWith('[DEMO') ? 'demo' : 'public',
      calls: 0,
      successes: 0,
      errors: 0,
      active: 0,
      consecutive_failures: 0,
      last_duration_ms: 0,
      max_duration_ms: 0,
      last_error_kind: null,
      last_success_at: null,
      cooldown_until: null,
      recovery_probe: false,
      circuit_generation: 0,
    };
    this.states.set(tool.name, state);
    return {
      ...tool,
      handler: async (input, context) => {
        if (this.closed) return errorResult('Closed', 'Server is shutting down');
        if (this.active >= this.maxActive)
          return errorResult('Busy', 'Concurrent call limit reached');
        let ownsProbe = false;
        if (state.cooldown_until !== null) {
          if (this.now() < state.cooldown_until || state.recovery_probe) {
            return errorResult(
              'CircuitOpen',
              'Upstream workflow is cooling down; inspect operations_status',
            );
          }
          // Only one half-open request tests recovery; concurrent requests fail fast.
          state.recovery_probe = true;
          ownsProbe = true;
        }
        const generation = state.circuit_generation;
        this.active += 1;
        state.active += 1;
        state.calls += 1;
        const start = this.now();
        let response: ToolResponse;
        try {
          response = await tool.handler(input, context);
        } catch {
          response = errorResult(
            'InternalError',
            'Unexpected tool failure; inspect server diagnostics',
          );
        } finally {
          state.active -= 1;
          this.active -= 1;
          if (ownsProbe) state.recovery_probe = false;
        }
        const failure = failureInfo(response);
        const kind = failure?.kind ?? null;
        state.last_duration_ms = Math.max(0, this.now() - start);
        state.max_duration_ms = Math.max(state.max_duration_ms, state.last_duration_ms);
        if (kind === null) {
          state.successes += 1;
          // An older success must not close a circuit opened by newer failures.
          if (
            generation === state.circuit_generation &&
            (ownsProbe || state.cooldown_until === null)
          ) {
            state.consecutive_failures = 0;
            state.cooldown_until = null;
            state.last_error_kind = null;
          }
          state.last_success_at = this.now();
        } else {
          state.errors += 1;
          state.last_error_kind = kind;
          const upstreamFailure =
            [
              'UpstreamHTTP',
              'ParseFailed',
              'InternalError',
              'UnexpectedError',
              'OutputValidationFailed',
              'RateLimited',
            ].includes(kind) ||
            (kind === 'TransportFailed' &&
              ['Network', 'Timeout', 'ResponseTooLarge'].includes(failure?.reason ?? ''));
          if (upstreamFailure) {
            state.consecutive_failures += 1;
            if (
              state.mode === 'public' &&
              state.consecutive_failures >= this.failureThreshold &&
              (state.cooldown_until === null || ownsProbe)
            ) {
              const cooldownMs = Math.max(this.cooldownMs, failure?.retryMs ?? 0);
              state.cooldown_until = this.now() + cooldownMs;
              state.circuit_generation += 1;
              this.recoveryCount += 1;
              try {
                this.options.clearCaches?.();
              } catch {
                this.log.warn({ tool: tool.name }, 'operations.cache_clear_failed');
              }
              this.log.warn(
                { tool: tool.name, kind, cooldown_ms: cooldownMs },
                'operations.cooldown',
              );
            }
          }
        }
        this.log.info(
          {
            tool: tool.name,
            status: kind === null ? 'ok' : 'error',
            duration_ms: state.last_duration_ms,
          },
          'operations.observed',
        );
        return response;
      },
    };
  }

  snapshot() {
    const tools = [...this.states.values()].map(
      ({ recovery_probe: _probe, circuit_generation: _generation, ...state }) => ({ ...state }),
    );
    const publicTools = tools.filter((tool) => tool.mode === 'public');
    const degraded = tools.some(
      (tool) => tool.consecutive_failures > 0 || tool.cooldown_until !== null,
    );
    const verified =
      publicTools.length > 0 && publicTools.every((tool) => tool.last_success_at !== null);
    return {
      agent: 'mithgard-operations',
      strategy: 'local-rules' as const,
      status: this.closed
        ? ('stopped' as const)
        : degraded
          ? ('degraded' as const)
          : verified
            ? ('healthy' as const)
            : ('unverified' as const),
      health_scope:
        'Observed calls in this process; no active Airbnb probes or human usability claims',
      uptime_ms: Math.max(0, this.now() - this.startedAt),
      active_calls: this.active,
      recovery_count: this.recoveryCount,
      limits: {
        max_active: this.maxActive,
        failure_threshold: this.failureThreshold,
        cooldown_ms: this.cooldownMs,
      },
      tools,
      recommendations: degraded
        ? [
            'Inspect error kinds and the upstream response contract',
            'Wait for cooldown; one request will probe recovery',
          ]
        : verified
          ? []
          : ['Exercise both public tools before claiming live health'],
    };
  }

  close(): void {
    this.closed = true;
  }
}
