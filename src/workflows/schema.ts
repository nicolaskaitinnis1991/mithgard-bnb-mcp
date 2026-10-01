import { z } from 'zod';

export const workflowTools = [
  'airbnb_search',
  'airbnb_listing_details',
  'host_insights',
  'guest_message_assistant',
  'booking_request_triage',
  'smart_pricing',
  'calendar_optimizer',
  'review_responder',
  'turnover_coordinator',
  'operations_status',
] as const;
const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);
export const WorkflowInput = z
  .object({
    mode: z.enum(['plan', 'execute']).default('plan'),
    steps: z
      .array(
        z
          .object({
            id,
            tool: z.enum(workflowTools),
            arguments: z.record(z.unknown()).default({}),
            depends_on: z.array(id).max(8).default([]),
          })
          .strict(),
      )
      .min(1)
      .max(8),
    shared_arguments: z.record(z.unknown()).default({}),
    stop_on_error: z.boolean().default(true),
    timeout_ms: z.number().int().min(100).max(60_000).default(30_000),
  })
  .strict()
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    for (const [index, step] of input.steps.entries()) {
      if (
        seen.has(step.id) ||
        step.depends_on.some((dependency) => !seen.has(dependency)) ||
        new Set(step.depends_on).size !== step.depends_on.length
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['steps', index],
          message: 'Use unique IDs and dependencies on earlier steps.',
        });
      }
      seen.add(step.id);
    }
    try {
      if (Buffer.byteLength(JSON.stringify(input), 'utf8') > 256 * 1024) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Workflow input exceeds its byte budget.',
        });
      }
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Workflow input must be JSON.' });
    }
  });
export type WorkflowInput = z.infer<typeof WorkflowInput>;
export const WorkflowOutput = z
  .object({
    execution_status: z.enum(['planned', 'verified', 'partial', 'failed', 'cancelled']),
    acceptance_status: z.enum([
      'not_executed',
      'technical_verified',
      'approval_pending',
      'not_verified',
    ]),
    plan: z
      .array(
        z
          .object({
            id,
            tool: z.enum(workflowTools),
            depends_on: z.array(id),
            argument_fields: z.array(z.string()),
          })
          .strict(),
      )
      .max(8),
    results: z
      .array(
        z
          .object({
            id,
            tool: z.enum(workflowTools),
            status: z.enum(['completed', 'failed', 'skipped', 'cancelled']),
            output: z.record(z.unknown()).optional(),
            error_kind: z.string().max(64).optional(),
            source: z.enum(['public', 'provided', 'demo', 'local', 'unknown']),
            duration_ms: z.number().finite().nonnegative(),
          })
          .strict(),
      )
      .max(8),
    summary: z
      .object({
        completed: z.number().int().nonnegative(),
        failed: z.number().int().nonnegative(),
        skipped: z.number().int().nonnegative(),
        cancelled: z.number().int().nonnegative(),
        approval_required: z.boolean(),
        technical_verified: z.boolean(),
      })
      .strict(),
    limits: z
      .object({
        max_steps: z.literal(8),
        max_concurrent: z.literal(4),
        timeout_ms: z.number().int(),
      })
      .strict(),
  })
  .strict();
export type WorkflowOutput = z.infer<typeof WorkflowOutput>;
