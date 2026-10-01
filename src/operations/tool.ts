import { z } from 'zod';
import type { OperationsAgent } from './agent.js';
import { createTool } from '../tools/registry.js';

const ToolStateSchema = z.object({
  name: z.string(),
  mode: z.enum(['public', 'demo']),
  calls: z.number(),
  successes: z.number(),
  errors: z.number(),
  active: z.number(),
  consecutive_failures: z.number(),
  last_duration_ms: z.number(),
  max_duration_ms: z.number(),
  last_error_kind: z.string().nullable(),
  last_success_at: z.number().nullable(),
  cooldown_until: z.number().nullable(),
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
  }),
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
