import { z } from 'zod';
import type { OperationsAgent } from './agent.js';
import { createTool } from '../tools/registry.js';

const ToolStateSchema = z.object({
  name: z.string(),
  mode: z.enum(['public', 'demo', 'local']),
  calls: z.number(),
  successes: z.number(),
  errors: z.number(),
  active: z.number(),
  consecutive_failures: z.number(),
  last_duration_ms: z.number(),
  max_duration_ms: z.number(),
  last_error_kind: z.string().nullable(),
  last_success_at: z.number().nullable(),
  last_public_success_at: z.number().nullable(),
  cooldown_until: z.number().nullable(),
  observed_sources: z.object({
    public: z.number(),
    provided: z.number(),
    demo: z.number(),
    local: z.number(),
    unknown: z.number(),
  }),
  rejections: z.object({
    busy: z.number(),
    circuit_open: z.number(),
    closed: z.number(),
    cancelled: z.number(),
  }),
});

const HttpStatusSchema = z.object({
  closed: z.boolean(),
  active: z.number(),
  queued: z.number(),
  in_flight: z.number(),
  requests: z.number(),
  attempts: z.number(),
  completed: z.number(),
  failures: z.number(),
  rate_limited: z.number(),
  response_bytes: z.number(),
  queue_timeouts: z.number(),
  upstream_timeouts: z.number(),
  rejected_full: z.number(),
  cancelled: z.number(),
  limits: z.object({
    timeout_ms: z.number(),
    max_queue_size: z.number(),
    max_response_bytes: z.number(),
    max_retries: z.number(),
    max_retry_after_ms: z.number(),
    rate_per_sec: z.number(),
    rate_per_hour: z.number(),
  }),
});
const CacheStatusSchema = z.object({
  entries: z.number(),
  bytes: z.number(),
  max_entries: z.number(),
  max_bytes: z.number(),
  ttl_ms: z.number(),
  rejected_entries: z.number(),
});

export const OperationsOutput = z.object({
  agent: z.string(),
  strategy: z.literal('local-rules'),
  status: z.enum(['stopped', 'healthy', 'degraded', 'unverified']),
  health_scope: z.string(),
  uptime_ms: z.number(),
  active_calls: z.number(),
  recovery_count: z.number(),
  limits: z.object({
    max_active: z.number(),
    failure_threshold: z.number(),
    cooldown_ms: z.number(),
    health_freshness_ms: z.number(),
  }),
  resources: z.object({ http: HttpStatusSchema.nullable(), caches: z.record(CacheStatusSchema) }),
  tools: z.array(ToolStateSchema),
  recommendations: z.array(z.string()),
});

export const buildOperationsTool = (agent: OperationsAgent) =>
  createTool({
    name: 'operations_status',
    description:
      'Read local operations agent diagnostics, observed tool health and recovery state. Does not probe Airbnb or execute host actions.',
    schema: z.object({}).strict(),
    output: OperationsOutput,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    handler: () => Promise.resolve(agent.snapshot()),
  });
