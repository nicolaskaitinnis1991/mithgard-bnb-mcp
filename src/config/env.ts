import { z } from 'zod';

const EnvSchema = z.object({
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  CACHE_TTL_SEARCH_MS: z.coerce.number().int().positive().default(900_000),
  CACHE_TTL_LISTING_MS: z.coerce.number().int().positive().default(1_800_000),
  HTTP_RATE_PER_SEC: z.coerce.number().int().positive().default(1),
  HTTP_RATE_PER_HOUR: z.coerce.number().int().positive().default(60),
  // The default is a sentinel — the real UA (`mithgard-bnb-mcp/<version> (+repo)`)
  // is composed in src/index.ts after package.json is read. This keeps env.ts
  // pure (no fs reads at config-parse time) and lets operators override the UA
  // wholesale via the HTTP_USER_AGENT env var when needed. See ADR (planned).
  HTTP_USER_AGENT: z.string().default('__SELF_IDENTIFY__'),
  CACHE_MAX_SEARCH: z.coerce.number().int().positive().default(500),
  CACHE_MAX_LISTING: z.coerce.number().int().positive().default(500),
});

export type Env = z.infer<typeof EnvSchema>;
export const loadEnv = (raw: NodeJS.ProcessEnv = process.env): Env => EnvSchema.parse(raw);
