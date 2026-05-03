import { z } from 'zod';

export const SearchInput = z.object({
  location: z.string().min(1),
  checkin: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  checkout: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  adults: z.number().int().min(1).max(16).default(2),
  children: z.number().int().min(0).max(10).default(0),
  min_price: z.number().int().nonnegative().optional(),
  max_price: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default('EUR'),
});
export type SearchInputT = z.infer<typeof SearchInput>;

export const SearchOutput = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      url: z.string().url(),
      price_per_night: z.number(),
      currency: z.string(),
      location: z.string(),
    }),
  ),
  total_estimate: z.number().int().nonnegative(),
  query: z.object({
    location: z.string(),
    adults: z.number(),
    children: z.number(),
    currency: z.string(),
  }),
  _source: z.literal('public'),
});
