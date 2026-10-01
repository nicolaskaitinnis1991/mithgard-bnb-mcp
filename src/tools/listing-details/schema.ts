import { z } from 'zod';

import { isoDate, validateStay } from '../../lib/validation.js';

export const ListingDetailsInput = z
  .object({
    listing_id: z.union([z.string().regex(/^\d{1,30}$/), z.number().int().positive().safe()]),
    checkin: isoDate.optional(),
    checkout: isoDate.optional(),
  })
  .strict()
  .superRefine(validateStay);
export type ListingDetailsInputT = z.infer<typeof ListingDetailsInput>;

export const ListingFullSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  price_per_night: z.number().nonnegative().nullable(),
  currency: z.string().nullable(),
  rating: z.number().optional(),
  review_count: z.number().optional(),
  host_name: z.string().optional(),
  location: z.string(),
  thumbnail_url: z.string().optional(),
  description: z.string(),
  amenities: z.array(z.string()),
  bedrooms: z.number().nonnegative().nullable(),
  bathrooms: z.number().nonnegative().nullable(),
  max_guests: z.number().nonnegative().nullable(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  house_rules: z.array(z.string()).optional(),
});

export const ReviewsSummarySchema = z.object({
  total: z.number().nonnegative().nullable(),
  average: z.number().nonnegative().nullable(),
  by_category: z
    .object({
      cleanliness: z.number().nonnegative().nullable(),
      accuracy: z.number().nonnegative().nullable(),
      communication: z.number().nonnegative().nullable(),
      location: z.number().nonnegative().nullable(),
      check_in: z.number().nonnegative().nullable(),
      value: z.number().nonnegative().nullable(),
    })
    .optional(),
  recent_excerpts: z.array(z.string()).optional(),
});

export const HostSummarySchema = z.object({
  name: z.string(),
  superhost: z.boolean().nullable(),
  joined: z.string(),
  response_rate: z.number().optional(),
  response_time: z.string().optional(),
  languages: z.array(z.string()).optional(),
});

export const ListingDetailsOutput = z.object({
  listing: ListingFullSchema,
  reviews_summary: ReviewsSummarySchema,
  host_summary: HostSummarySchema,
  _source: z.literal('public'),
});
