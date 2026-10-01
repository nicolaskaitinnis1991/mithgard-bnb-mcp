import { z } from 'zod';
import {
  TriageData,
  asOfDate,
  ResultFields,
  validateMode,
  validateResult,
} from '../../host-data/contracts.js';

import { boundedId, isoDate, currentUtcDate } from '../../lib/validation.js';

export const BookingTriageInput = z
  .object({
    mode: z.enum(['demo', 'provided']).optional(),
    host_data: TriageData.optional(),
    thread_id: boundedId,
    reference_date: isoDate.optional(),
    guest_profile: z
      .object({
        joined: isoDate,
        reviews: z.number().int().nonnegative().max(100000),
        rating: z.number().min(0).max(5).optional(),
        verified: z.boolean(),
      })
      .strict(),
    trip: z
      .object({
        adults: z.number().int().min(1).max(100),
        children: z.number().int().nonnegative().max(100),
        pets: z.boolean(),
        nights: z.number().int().min(1).max(365),
        reason: z.string().max(4000).optional(),
      })
      .strict(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.guest_profile.joined >
      (value.reference_date ??
        (value.mode === 'provided' &&
        value.host_data &&
        Number.isFinite(Date.parse(value.host_data.as_of))
          ? asOfDate(value.host_data.as_of)
          : currentUtcDate()))
    )
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['guest_profile', 'joined'],
        message: 'Account joined date cannot be in the future',
      });
  })
  .superRefine(validateMode);
export type BookingTriageInputT = z.infer<typeof BookingTriageInput>;

export const BookingTriageOutput = z
  .object({
    risk_score: z.number().int().min(0).max(100).nullable(),
    score_basis: z.string().optional(),
    policy_checks: z
      .array(
        z.object({
          rule: z.string(),
          status: z.enum(['pass', 'fail', 'unknown']),
          reason: z.string(),
        }),
      )
      .optional(),
    recommendation: z.enum(['accept_after_review', 'review', 'decline_after_review']),
    approval_required: z.literal(true),
    reference_date: isoDate,
    reasoning: z.array(z.string()),
    red_flags: z.array(z.string()),
    green_flags: z.array(z.string()),
    ...ResultFields,
  })
  .superRefine(validateResult);
export type BookingTriageOutputT = z.infer<typeof BookingTriageOutput>;
