import { z } from 'zod';
import { isoDate, validateStay } from '../../lib/validation.js';

export const SearchInput = z
  .object({
    location: z.string().trim().min(1).max(300),
    checkin: isoDate.optional(),
    checkout: isoDate.optional(),
    adults: z.number().int().min(1).max(16).default(2),
    children: z.number().int().min(0).max(10).default(0),
    min_price: z.number().int().nonnegative().max(1000000).optional(),
    max_price: z.number().int().nonnegative().max(1000000).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/)
      .default('EUR'),
  })
  .strict()
  .superRefine((value, context) => {
    validateStay(value, context);
    if (
      value.min_price !== undefined &&
      value.max_price !== undefined &&
      value.min_price > value.max_price
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_price'],
        message: 'max_price must be at least min_price',
      });
    }
  });
export type SearchInputT = z.infer<typeof SearchInput>;

export const SearchOutput = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().url(),
      price_per_night: z.number().nonnegative().nullable(),
      currency: z.string().nullable(),
      display_price: z.number().nonnegative().nullable().optional(),
      price_basis: z.enum(['night', 'stay_total', 'unknown']).optional(),
      rating: z.number().min(0).max(5).optional(),
      review_count: z.number().int().nonnegative().optional(),
      location: z.string(),
    }),
  ),
  total_estimate: z.number().int().nonnegative(),
  query: z.object({
    location: z.string(),
    adults: z.number(),
    children: z.number(),
    currency: z.string(),
    checkin: isoDate.optional(),
    checkout: isoDate.optional(),
  }),
  _source: z.literal('public'),
});
