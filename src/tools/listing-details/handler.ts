import type { Logger } from 'pino';
import type { ListingDetailsInputT } from './schema.js';
import { type Result, ok } from '../../lib/result.js';
import type { McpError } from '../../lib/errors.js';
import type { ListingDetailsParsed } from '../../parsers/airbnb-public.js';

export interface ListingDeps {
  http: { get: (url: string, signal?: AbortSignal) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
  parse: (html: string, listingId: string) => Result<ListingDetailsParsed, McpError>;
  log?: Logger;
}

const buildUrl = (input: ListingDetailsInputT): string => {
  const url = new URL(`https://www.airbnb.com/rooms/${String(input.listing_id)}`);
  if (input.checkin !== undefined) url.searchParams.set('check_in', input.checkin);
  if (input.checkout !== undefined) url.searchParams.set('check_out', input.checkout);
  return url.toString();
};

export const listingHandler =
  (deps: ListingDeps) =>
  async (input: ListingDetailsInputT, signal?: AbortSignal): Promise<Result<unknown, McpError>> => {
    const listingId = String(input.listing_id);
    const url = buildUrl(input);
    const cached = deps.cache.get(url);
    deps.log?.info({ tool: 'airbnb_listing_details', cache_hit: !!cached }, 'tool.cache');
    if (cached !== undefined && cached !== null) return ok(cached);

    const resp = await deps.http.get(url, signal);
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
