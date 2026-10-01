import { z } from 'zod';
import {
  MessageData,
  ResultFields,
  validateMode,
  validateResult,
} from '../../host-data/contracts.js';
import { boundedId } from '../../lib/validation.js';

export const GuestMessageInput = z
  .object({
    mode: z.enum(['demo', 'provided']).optional(),
    host_data: MessageData.optional(),
    thread_id: boundedId,
    last_message: z.string().trim().min(1).max(16000),
    host_voice: z.enum(['casual', 'professional', 'warm']).default('warm'),
  })
  .strict()
  .superRefine(validateMode);
export type GuestMessageInputT = z.infer<typeof GuestMessageInput>;

export const Suggestion = z.object({
  tone: z.enum(['short', 'friendly', 'formal']),
  text: z.string(),
});

export const GuestMessageOutput = z
  .object({
    suggestions: z.array(Suggestion).length(3),
    missing_context: z.array(z.string()),
    needs_escalation: z.boolean().optional(),
    topics: z.array(z.string()).optional(),
    limitations: z.array(z.string()).optional(),
    recommended_index: z.number().int().min(0).max(2),
    approval_required: z.literal(true),
    ...ResultFields,
  })
  .superRefine(validateResult);
export type GuestMessageOutputT = z.infer<typeof GuestMessageOutput>;
