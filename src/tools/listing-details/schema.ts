import { z } from 'zod';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const ListingDetailsInput = z.object({
  listing_id: z.union([z.string().min(1), z.number().int().positive()]),
  checkin: z.string().regex(ISO_DATE).optional(),
  checkout: z.string().regex(ISO_DATE).optional(),
});
export type ListingDetailsInputT = z.infer<typeof ListingDetailsInput>;

export const ListingFullSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  price_per_night: z.number(),
  currency: z.string(),
  rating: z.number().optional(),
  review_count: z.number().optional(),
  host_name: z.string().optional(),
  location: z.string(),
  thumbnail_url: z.string().optional(),
  description: z.string(),
  amenities: z.array(z.string()),
  bedrooms: z.number(),
  bathrooms: z.number(),
  max_guests: z.number(),
  check_in: z.string().optional(),
  check_out: z.string().optional(),
  house_rules: z.array(z.string()).optional(),
});

export const ReviewsSummarySchema = z.object({
  total: z.number(),
  average: z.number(),
  by_category: z
    .object({
      cleanliness: z.number(),
      accuracy: z.number(),
      communication: z.number(),
      location: z.number(),
      check_in: z.number(),
      value: z.number(),
    })
    .optional(),
  recent_excerpts: z.array(z.string()).optional(),
});

export const HostSummarySchema = z.object({
  name: z.string(),
  superhost: z.boolean(),
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
