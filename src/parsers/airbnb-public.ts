import * as cheerio from 'cheerio';
import { type Result, ok, err } from '../lib/result.js';
import { type McpError, parseFailed } from '../lib/errors.js';
import type {
  Listing,
  ListingFull,
  ReviewsSummary,
  HostSummary,
  NormalizedQuery,
} from '../types/airbnb.js';

export interface ListingDetailsParsed {
  listing: ListingFull;
  reviews_summary: ReviewsSummary;
  host_summary: HostSummary;
}

export const parseListingDetails = (
  _html: string,
  _listingId: string,
): Result<ListingDetailsParsed, McpError> => err(parseFailed('parseListingDetails', 'listing'));

export const parseSearchResults = (
  html: string,
  _query: NormalizedQuery,
): Result<{ listings: Listing[]; total: number }, McpError> => {
  const $ = cheerio.load(html);
  const scriptText = $('script#data-deferred-state-0').text();
  if (!scriptText) return err(parseFailed('script#data-deferred-state-0', 'search'));
  let json: unknown;
  try {
    json = JSON.parse(scriptText);
  } catch (e) {
    return err(parseFailed('JSON.parse', 'search', String(e)));
  }
  // Airbnb JSON path: niobeMinimalClientData → search results
  // (Path varies by deploy; the code below uses defensive lookup)
  const sections = findInObject(json, ['niobeMinimalClientData']);
  const listings: Listing[] = [];
  walkForListings(sections ?? [], listings);
  return ok({ listings, total: listings.length });
};

const findInObject = (o: unknown, path: string[]): unknown => {
  // Defensive lookup of unknown JSON shape — we navigate string-keyed paths
  // through arbitrary nested objects/arrays, so `any` is the cleanest expression.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = o;
  for (const p of path) {
    if (cur == null) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    cur = cur[p];
  }
  return cur as unknown;
};

const walkForListings = (node: unknown, out: Listing[]): void => {
  if (Array.isArray(node)) {
    for (const n of node) walkForListings(n, out);
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  const obj = node as Record<string, unknown>;
  if (typeof obj.id === 'string' && typeof obj.name === 'string' && obj.pricingQuote) {
    const pq = obj.pricingQuote as { rate?: { amount?: number; currency?: string } };
    out.push({
      id: obj.id,
      title: obj.name,
      url: `https://www.airbnb.com/rooms/${obj.id}`,
      price_per_night: pq.rate?.amount ?? 0,
      currency: pq.rate?.currency ?? 'EUR',
      location: typeof obj.city === 'string' ? obj.city : 'unknown',
    });
  }
  for (const v of Object.values(obj)) walkForListings(v, out);
};
