import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const BookingTriageInput = z.object({
  thread_id: z.string().min(1),
  guest_profile: z.object({
    joined: z.string().regex(ISO_DATE),
    reviews: z.number().int().nonnegative(),
    rating: z.number().min(0).max(5).optional(),
    verified: z.boolean(),
  }),
  trip: z.object({
    adults: z.number().int().min(1),
    children: z.number().int().nonnegative(),
    pets: z.boolean(),
    nights: z.number().int().min(1),
    reason: z.string().optional(),
  }),
});
export type BookingTriageInputT = z.infer<typeof BookingTriageInput>;

export const BookingTriageOutput = z.object({
  risk_score: z.number().int().min(0).max(100),
  recommendation: z.enum(['auto_accept', 'review', 'auto_decline']),
  reasoning: z.array(z.string()),
  red_flags: z.array(z.string()),
  green_flags: z.array(z.string()),
  _mock: z.literal(true),
  _pitch: z.string(),
});
export type BookingTriageOutputT = z.infer<typeof BookingTriageOutput>;
