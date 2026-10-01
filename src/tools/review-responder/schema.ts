import { z } from 'zod';
import {
  ReviewData,
  ResultFields,
  validateMode,
  validateResult,
} from '../../host-data/contracts.js';
import { boundedId } from '../../lib/validation.js';

export const ReviewResponderInput = z
  .object({
    mode: z.enum(['demo', 'provided']).optional(),
    host_data: ReviewData.optional(),
    review_id: boundedId,
    review_text: z.string().trim().min(1).max(16000),
    rating: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    host_voice: z.enum(['warm', 'professional']).default('warm'),
  })
  .strict()
  .superRefine(validateMode);
export type ReviewResponderInputT = z.infer<typeof ReviewResponderInput>;

export const ReviewResponderOutput = z
  .object({
    draft: z.string(),
    approval_required: z.literal(true),
    concerns: z.array(z.string()).optional(),
    classification_limits: z.array(z.string()).optional(),
    sentiment: z.enum(['positive', 'neutral', 'negative', 'mixed']),
    needs_escalation: z.boolean(),
    escalation_reason: z.string().optional(),
    ...ResultFields,
  })
  .superRefine(validateResult);
export type ReviewResponderOutputT = z.infer<typeof ReviewResponderOutput>;
