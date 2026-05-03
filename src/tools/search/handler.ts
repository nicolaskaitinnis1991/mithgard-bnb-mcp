import type { SearchInputT } from './schema.js';
import { type Result, ok } from '../../lib/result.js';
import type { McpError } from '../../lib/errors.js';

export interface SearchParseResult {
  listings: {
    id: string;
    title: string;
    url: string;
    price_per_night: number;
    currency: string;
    location: string;
  }[];
  total: number;
}

export interface SearchDeps {
  http: { get: (url: string) => Promise<Result<string, McpError>> };
  cache: { get: (k: string) => unknown; set: (k: string, v: unknown) => void };
  parse: (html: string, q: SearchInputT) => Result<SearchParseResult, McpError>;
}

const buildUrl = (i: SearchInputT): string => {
  const u = new URL(`https://www.airbnb.com/s/${encodeURIComponent(i.location)}/homes`);
  u.searchParams.set('adults', String(i.adults));
  u.searchParams.set('children', String(i.children));
  if (i.checkin !== undefined) u.searchParams.set('checkin', i.checkin);
  if (i.checkout !== undefined) u.searchParams.set('checkout', i.checkout);
  if (i.min_price !== undefined) u.searchParams.set('price_min', String(i.min_price));
  if (i.max_price !== undefined) u.searchParams.set('price_max', String(i.max_price));
  return u.toString();
};

export const searchHandler =
  (deps: SearchDeps) =>
  async (input: SearchInputT): Promise<Result<unknown, McpError>> => {
    const url = buildUrl(input);
    const cached = deps.cache.get(url);
    if (cached !== undefined && cached !== null) return ok(cached);

    const resp = await deps.http.get(url);
    if (!resp.ok) return resp;

    const parsed = deps.parse(resp.value, input);
    if (!parsed.ok) return parsed;

    const out = {
      results: parsed.value.listings,
      total_estimate: parsed.value.total,
      query: {
        location: input.location,
        adults: input.adults,
        children: input.children,
        currency: input.currency,
      },
      _source: 'public' as const,
    };
    deps.cache.set(url, out);
    return ok(out);
  };
