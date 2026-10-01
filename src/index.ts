import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'node:fs';
import { loadEnv } from './config/env.js';
import { createLogger } from './config/logger.js';
import { buildServer } from './server.js';
import { allTools, type AppDeps } from './tools/index.js';
import { createHttpClient } from './lib/http.js';
import { createCache } from './lib/cache.js';
import { parseSearchResults, parseListingDetails } from './parsers/airbnb-public.js';
import { parseArgs, USAGE } from './lib/cli.js';
import { OperationsAgent } from './operations/agent.js';
import { buildOperationsTool } from './operations/tool.js';

// package.json read happens here (and again in server.ts) — duplication is
// deliberate: env.ts loads before package.json can be parsed, so we resolve
// version once at entry and inject it where needed. See src/config/env.ts
// `__SELF_IDENTIFY__` sentinel for the UA substitution rationale.
const pkgUrl = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8')) as { version: string };

const main = async () => {
  const intent = parseArgs(process.argv.slice(2));

  if (intent.kind === 'version') {
    process.stdout.write(`${pkg.version}\n`);
    process.exit(0);
  }
  if (intent.kind === 'help') {
    process.stdout.write(USAGE);
    process.exit(0);
  }

  // --debug forces LOG_LEVEL before env is parsed so the level flows through
  // the logger config without a second pass.
  if (intent.debug) {
    process.env.LOG_LEVEL = 'debug';
  }

  const env = loadEnv();
  const log = createLogger(env);

  // Substitute version into the self-identifying UA sentinel. The sentinel
  // pattern keeps env.ts pure (no package.json read at config-load time).
  const userAgent =
    env.HTTP_USER_AGENT === '__SELF_IDENTIFY__'
      ? `mithgard-bnb-mcp/${pkg.version} (+https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp)`
      : env.HTTP_USER_AGENT;

  const http = createHttpClient({
    ratePerSec: env.HTTP_RATE_PER_SEC,
    ratePerHour: env.HTTP_RATE_PER_HOUR,
    userAgent,
    timeoutMs: env.HTTP_TIMEOUT_MS,
    maxQueueSize: env.HTTP_MAX_QUEUE_SIZE,
    maxResponseBytes: env.HTTP_MAX_RESPONSE_BYTES,
    maxRetries: env.HTTP_MAX_RETRIES,
    maxRetryAfterMs: env.HTTP_MAX_RETRY_AFTER_MS,
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
      log,
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
      log,
    },
    log,
    debug: intent.debug,
  };

  const operations = new OperationsAgent(log, {
    clearCaches: () => {
      searchCache.clear();
      listingCache.clear();
    },
  });
  const tools = [
    ...allTools(deps).map((tool) => operations.supervise(tool)),
    buildOperationsTool(operations),
  ];
  const server = buildServer(tools, log);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.info({ tool_count: tools.length, debug: intent.debug }, 'server.started');
  let shuttingDown = false;
  const cleanup = async () => {
    operations.close();
    await http.close();
    searchCache.clear();
    listingCache.clear();
  };
  server.onclose = () => {
    void cleanup();
  };
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    await cleanup();
    const deadline = setTimeout(() => process.exit(1), 5_000);
    deadline.unref();
    try {
      await server.close();
    } finally {
      clearTimeout(deadline);
    }
  };
  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
};

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
