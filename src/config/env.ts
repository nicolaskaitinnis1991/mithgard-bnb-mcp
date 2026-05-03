import { z } from 'zod';

const EnvSchema = z.object({
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  CACHE_TTL_SEARCH_MS: z.coerce.number().int().positive().default(900_000),
  CACHE_TTL_LISTING_MS: z.coerce.number().int().positive().default(1_800_000),
  HTTP_RATE_PER_SEC: z.coerce.number().int().positive().default(1),
  HTTP_RATE_PER_HOUR: z.coerce.number().int().positive().default(60),
  HTTP_USER_AGENT: z
    .string()
    .default(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ),
  CACHE_MAX_SEARCH: z.coerce.number().int().positive().default(500),
});

export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (raw: NodeJS.ProcessEnv = process.env): Env => EnvSchema.parse(raw);
