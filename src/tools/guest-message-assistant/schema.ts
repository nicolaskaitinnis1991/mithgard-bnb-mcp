import { z } from 'zod';
import { boundedId } from '../../lib/validation.js';

export const GuestMessageInput = z
  .object({
    thread_id: boundedId,
    last_message: z.string().trim().min(1).max(16000),
    host_voice: z.enum(['casual', 'professional', 'warm']).default('warm'),
  })
  .strict();
export type GuestMessageInputT = z.infer<typeof GuestMessageInput>;

export const Suggestion = z.object({
  tone: z.enum(['short', 'friendly', 'formal']),
  text: z.string(),
});

export const GuestMessageOutput = z.object({
  suggestions: z.array(Suggestion).length(3),
  missing_context: z.array(z.string()),
  recommended_index: z.number().int().min(0).max(2),
  approval_required: z.literal(true),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type GuestMessageOutputT = z.infer<typeof GuestMessageOutput>;
