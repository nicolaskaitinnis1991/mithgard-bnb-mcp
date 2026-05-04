import { z } from 'zod';

export const GuestMessageInput = z.object({
  thread_id: z.string().min(1),
  last_message: z.string().min(1),
  host_voice: z.enum(['casual', 'professional', 'warm']).default('warm'),
});
export type GuestMessageInputT = z.infer<typeof GuestMessageInput>;

export const Suggestion = z.object({
  tone: z.enum(['short', 'friendly', 'formal']),
  text: z.string(),
});

export const GuestMessageOutput = z.object({
  suggestions: z.array(Suggestion).length(3),
  recommended_index: z.number().int().min(0).max(2),
  approval_required: z.literal(true),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type GuestMessageOutputT = z.infer<typeof GuestMessageOutput>;
