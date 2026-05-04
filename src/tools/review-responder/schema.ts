import { z } from 'zod';

export const ReviewResponderInput = z.object({
  review_id: z.string().min(1),
  review_text: z.string().min(1),
  rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  host_voice: z.enum(['warm', 'professional']).default('warm'),
});
export type ReviewResponderInputT = z.infer<typeof ReviewResponderInput>;

export const ReviewResponderOutput = z.object({
  draft: z.string(),
  sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
  needs_escalation: z.boolean(),
  escalation_reason: z.string().optional(),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type ReviewResponderOutputT = z.infer<typeof ReviewResponderOutput>;
