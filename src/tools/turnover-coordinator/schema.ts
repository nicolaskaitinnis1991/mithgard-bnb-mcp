import { z } from 'zod';

import { boundedId, isoDatetime } from '../../lib/validation.js';

export const TurnoverInput = z
  .object({
    listing_id: boundedId,
    checkout_at: isoDatetime,
    checkin_at: isoDatetime,
    cleaner_id: boundedId.optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (Date.parse(value.checkin_at) <= Date.parse(value.checkout_at))
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['checkin_at'],
        message: 'Checkin must be after checkout',
      });
  });
export type TurnoverInputT = z.infer<typeof TurnoverInput>;

export const TurnoverOutput = z.object({
  brief: z.string(),
  approval_required: z.literal(true),
  window_minutes: z.number().positive(),
  feasible: z.boolean(),
  warnings: z.array(z.string()),
  checklist: z.array(z.string()),
  crew_message_draft: z.string(),
  estimated_duration_min: z.number().int().positive(),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type TurnoverOutputT = z.infer<typeof TurnoverOutput>;
