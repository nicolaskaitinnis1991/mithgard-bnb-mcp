import type { Logger } from 'pino';
import type { ListingDetailsInputT } from './schema.js';
import { type Result, ok } from '../../lib/result.js';
import type { McpError } from '../../lib/errors.js';
import type { ListingDetailsParsed } from '../../parsers/airbnb-public.js';

export interface ListingDeps {
  http: { get: (url: string) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
  parse: (html: string, listingId: string) => Result<ListingDetailsParsed, McpError>;
  log?: Logger;
}

const buildUrl = (listingId: string): string => `https://www.airbnb.com/rooms/${listingId}`;

export const listingHandler =
  (deps: ListingDeps) =>
  async (input: ListingDetailsInputT): Promise<Result<unknown, McpError>> => {
    const listingId = String(input.listing_id);
    const url = buildUrl(listingId);
    const cached = deps.cache.get(url);
    deps.log?.info({ tool: 'airbnb_listing_details', cache_hit: !!cached }, 'tool.cache');
    if (cached !== undefined && cached !== null) return ok(cached);

    const resp = await deps.http.get(url);
    if (!resp.ok) return resp;

    const parsed = deps.parse(resp.value, listingId);
    if (!parsed.ok) return parsed;

    const out = {
      listing: parsed.value.listing,
      reviews_summary: parsed.value.reviews_summary,
      host_summary: parsed.value.host_summary,
      _source: 'public' as const,
    };
    deps.cache.set(url, out);
    return ok(out);
  };
