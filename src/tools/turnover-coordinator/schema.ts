import { z } from 'zod';

const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export const TurnoverInput = z.object({
  listing_id: z.string().min(1),
  checkout_at: z.string().regex(ISO_DATETIME),
  checkin_at: z.string().regex(ISO_DATETIME),
  cleaner_id: z.string().optional(),
});
export type TurnoverInputT = z.infer<typeof TurnoverInput>;

export const TurnoverOutput = z.object({
  brief: z.string(),
  checklist: z.array(z.string()),
  crew_message_draft: z.string(),
  estimated_duration_min: z.number().int().positive(),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type TurnoverOutputT = z.infer<typeof TurnoverOutput>;
