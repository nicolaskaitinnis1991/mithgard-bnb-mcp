import { z } from 'zod';

const EnvSchema = z.object({
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  CACHE_TTL_SEARCH_MS: z.coerce.number().int().positive().default(900_000),
  CACHE_TTL_LISTING_MS: z.coerce.number().int().positive().default(1_800_000),
  HTTP_RATE_PER_SEC: z.coerce.number().int().positive().default(1),
  HTTP_RATE_PER_HOUR: z.coerce.number().int().positive().default(60),
});

export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (raw: NodeJS.ProcessEnv = process.env): Env => EnvSchema.parse(raw);
