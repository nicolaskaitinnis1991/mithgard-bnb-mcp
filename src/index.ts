import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { buildServer } from './server.js';
import { allTools, type AppDeps } from './tools/index.js';
import { createHttpClient } from './lib/http.js';
import { createCache } from './lib/cache.js';
import { parseSearchResults, parseListingDetails } from './parsers/airbnb-public.js';

const main = async () => {
  const env = loadEnv();
  const log = createLogger(env);

  const http = createHttpClient({
    ratePerSec: env.HTTP_RATE_PER_SEC,
    ratePerHour: env.HTTP_RATE_PER_HOUR,
    userAgent: env.HTTP_USER_AGENT,
  });
  const searchCache = createCache<object>({
    max: env.CACHE_MAX_SEARCH,
    ttlMs: env.CACHE_TTL_SEARCH_MS,
  });
  const listingCache = createCache<object>({
    max: env.CACHE_MAX_LISTING,
    ttlMs: env.CACHE_TTL_LISTING_MS,
  });

  const deps: AppDeps = {
    search: {
      http,
      cache: {
        get: (k) => searchCache.get(k),
        set: (k, v) => {
          if (typeof v === 'object' && v !== null) searchCache.set(k, v);
        },
      },
      parse: (html, q) =>
        parseSearchResults(html, {
          location: q.location,
          adults: q.adults,
          children: q.children,
          currency: q.currency,
          ...(q.checkin !== undefined ? { checkin: q.checkin } : {}),
          ...(q.checkout !== undefined ? { checkout: q.checkout } : {}),
          ...(q.min_price !== undefined ? { min_price: q.min_price } : {}),
          ...(q.max_price !== undefined ? { max_price: q.max_price } : {}),
        }),
    },
    listing: {
      http,
      cache: {
        get: (k) => listingCache.get(k),
        set: (k, v) => {
          if (typeof v === 'object' && v !== null) listingCache.set(k, v);
        },
      },
      parse: (html, listingId) => parseListingDetails(html, listingId),
    },
  };

  const tools = allTools(deps);
  const server = buildServer(tools, log);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info({ tool_count: tools.length }, 'server.started');
};

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
