import type { Logger } from 'pino';
import type { ToolDefinition, ToolResponse } from '../tools/registry.js';
import type { HttpStatus } from '../lib/http.js';
import type { CacheStatus } from '../lib/cache.js';

export interface OperationsOptions {
  failureThreshold?: number;
  cooldownMs?: number;
  maxActive?: number;
  now?: () => number;
  clearCaches?: () => void;
  httpStatus?: () => HttpStatus;
  cacheStatus?: () => Record<string, CacheStatus>;
  healthFreshnessMs?: number;
}

interface ToolState {
  name: string;
  mode: 'public' | 'demo' | 'local';
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
  opening_generation: number | null;
  last_public_success_at: number | null;
  observed_sources: {
    public: number;
    provided: number;
    demo: number;
    local: number;
    unknown: number;
  };
  rejections: { busy: number; circuit_open: number; closed: number; cancelled: number };
}

const errorResult = (kind: string, message: string): ToolResponse => ({
  isError: true,
  content: [{ type: 'text', text: JSON.stringify({ kind, error: message }) }],
});

const failureInfo = (
  result: ToolResponse,
): { kind: string; reason?: string; retryMs?: number; scope?: 'local' | 'upstream' } | null => {
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
            ...('scope' in detail && (detail.scope === 'local' || detail.scope === 'upstream')
              ? { scope: detail.scope }
              : {}),
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
  private readonly healthFreshnessMs: number;
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
    this.healthFreshnessMs = options.healthFreshnessMs ?? 300_000;
    if (
      !Number.isSafeInteger(this.failureThreshold) ||
      this.failureThreshold < 1 ||
      this.failureThreshold > 100 ||
      !Number.isSafeInteger(this.cooldownMs) ||
      this.cooldownMs < 1 ||
      this.cooldownMs > 3_600_000 ||
      !Number.isSafeInteger(this.maxActive) ||
      this.maxActive < 1 ||
      this.maxActive > 1000 ||
      !Number.isSafeInteger(this.healthFreshnessMs) ||
      this.healthFreshnessMs < 1 ||
      this.healthFreshnessMs > 3_600_000
    )
      throw new Error('Invalid operations agent limits');
  }

  supervise(tool: ToolDefinition): ToolDefinition {
    if (this.states.has(tool.name)) throw new Error('Duplicate supervised tool');
    const state: ToolState = {
      name: tool.name,
      mode: tool.description.startsWith('[DEMO')
        ? 'demo'
        : tool.description.startsWith('[LOCAL')
          ? 'local'
          : 'public',
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
      opening_generation: null,
      last_public_success_at: null,
      observed_sources: { public: 0, provided: 0, demo: 0, local: 0, unknown: 0 },
      rejections: { busy: 0, circuit_open: 0, closed: 0, cancelled: 0 },
    };
    this.states.set(tool.name, state);
    return {
      ...tool,
      handler: async (input, context) => {
        if (this.closed) {
          state.rejections.closed++;
          return errorResult('Closed', 'Server is shutting down');
        }
        if (context?.signal.aborted) {
          state.rejections.cancelled++;
          return errorResult('Cancelled', 'Tool request was cancelled');
        }
        if (this.active >= this.maxActive) {
          state.rejections.busy++;
          return errorResult('Busy', 'Concurrent call limit reached');
        }
        let ownsProbe = false;
        if (state.cooldown_until !== null) {
          if (this.now() < state.cooldown_until || state.recovery_probe) {
            state.rejections.circuit_open++;
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
          response = context?.signal.aborted
            ? errorResult('Cancelled', 'Tool request was cancelled')
            : errorResult('InternalError', 'Unexpected tool failure; inspect server diagnostics');
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
          const source = response.structuredContent?._source;
          const observed =
            source === 'public' || source === 'provided' || source === 'demo' || source === 'local'
              ? source
              : state.mode === 'demo'
                ? 'demo'
                : 'unknown';
          state.observed_sources[observed]++;
          if (
            generation === state.circuit_generation &&
            state.mode === 'public' &&
            (observed === 'public' || source === undefined)
          ) {
            state.last_public_success_at = this.now();
          }
          // An older success must not close a circuit opened by newer failures.
          if (
            generation === state.circuit_generation &&
            (ownsProbe || state.cooldown_until === null)
          ) {
            state.consecutive_failures = 0;
            state.cooldown_until = null;
            state.last_error_kind = null;
            state.opening_generation = null;
            // Recovery advances the epoch too: old failures can no longer
            // poison a circuit that a newer half-open probe closed.
            if (ownsProbe) state.circuit_generation++;
          }
          state.last_success_at = this.now();
        } else {
          state.errors += 1;
          if (
            kind === 'Cancelled' ||
            (kind === 'TransportFailed' && failure?.reason === 'Cancelled')
          )
            state.rejections.cancelled++;
          const upstreamFailure =
            [
              'UpstreamHTTP',
              'ParseFailed',
              'InternalError',
              'UnexpectedError',
              'OutputValidationFailed',
            ].includes(kind) ||
            (kind === 'RateLimited' && failure?.scope !== 'local') ||
            (kind === 'TransportFailed' &&
              ['Network', 'Timeout', 'ResponseTooLarge'].includes(failure?.reason ?? ''));
          if (upstreamFailure) {
            const current = generation === state.circuit_generation;
            const sameOutage =
              state.cooldown_until !== null && generation === state.opening_generation;
            if (current || sameOutage) {
              state.last_error_kind = kind;
              state.consecutive_failures += 1;
            }
            // A late 429 from this outage can lengthen the existing cooldown,
            // but cannot reopen/alter a later successfully recovered epoch.
            if (sameOutage && failure?.retryMs !== undefined) {
              state.cooldown_until = Math.max(
                state.cooldown_until ?? 0,
                this.now() + failure.retryMs,
              );
            }
            if (
              current &&
              state.mode === 'public' &&
              state.consecutive_failures >= this.failureThreshold &&
              (state.cooldown_until === null || ownsProbe)
            ) {
              const cooldownMs = Math.max(this.cooldownMs, failure?.retryMs ?? 0);
              state.cooldown_until = Math.max(state.cooldown_until ?? 0, this.now() + cooldownMs);
              state.opening_generation = generation;
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
      ({
        recovery_probe: _probe,
        circuit_generation: _generation,
        opening_generation: _opening,
        ...state
      }) => ({
        ...state,
        observed_sources: { ...state.observed_sources },
        rejections: { ...state.rejections },
      }),
    );
    const publicTools = tools.filter((tool) => tool.mode === 'public');
    const degraded = publicTools.some(
      (tool) => tool.consecutive_failures > 0 || tool.cooldown_until !== null,
    );
    const verified =
      publicTools.length > 0 &&
      publicTools.every(
        (tool) =>
          tool.last_public_success_at !== null &&
          this.now() - tool.last_public_success_at <= this.healthFreshnessMs,
      );
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
        'Recent observed public calls in this process only; provided/local/demo successes do not verify Airbnb. No active probes, global uptime guarantee, process restart or external alert delivery.',
      uptime_ms: Math.max(0, this.now() - this.startedAt),
      active_calls: this.active,
      recovery_count: this.recoveryCount,
      limits: {
        max_active: this.maxActive,
        failure_threshold: this.failureThreshold,
        cooldown_ms: this.cooldownMs,
        health_freshness_ms: this.healthFreshnessMs,
      },
      resources: {
        http: this.options.httpStatus?.() ?? null,
        caches: this.options.cacheStatus?.() ?? {},
      },
      tools,
      recommendations: degraded
        ? [
            'Inspect error kinds and the upstream response contract',
            'Wait for cooldown; one request will probe recovery',
          ]
        : verified
          ? []
          : [
              'Observe successful recent calls for every public tool; local/provided/demo calls cannot establish live health',
            ],
    };
  }

  close(): void {
    this.closed = true;
  }
}
