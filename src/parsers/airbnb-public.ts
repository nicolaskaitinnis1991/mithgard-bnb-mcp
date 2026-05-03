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

export const parseListingDetails = (
  html: string,
  listingId: string,
): Result<ListingDetailsParsed, McpError> => {
  const $ = cheerio.load(html);
  const scriptText = $('script#data-deferred-state-0').text();
  if (!scriptText) return err(parseFailed('script#data-deferred-state-0', 'listing'));
  let json: unknown;
  try {
    json = JSON.parse(scriptText);
  } catch (e) {
    return err(parseFailed('JSON.parse', 'listing', String(e)));
  }

  const root = findInObject(json, ['niobeMinimalClientData']);
  const pdp = findFirstKey(root, 'bookingPdpSections');
  if (pdp === undefined) return err(parseFailed('bookingPdpSections', 'listing'));

  const listingNode = findFirstKey(pdp, 'listing');
  const reviewsNode = findFirstKey(pdp, 'reviewsModule');
  const hostNode = findFirstKey(pdp, 'host');

  if (
    typeof listingNode !== 'object' ||
    listingNode === null ||
    typeof reviewsNode !== 'object' ||
    reviewsNode === null ||
    typeof hostNode !== 'object' ||
    hostNode === null
  ) {
    return err(parseFailed('listing/reviewsModule/host', 'listing'));
  }

  const l = listingNode as Record<string, unknown>;
  const r = reviewsNode as Record<string, unknown>;
  const h = hostNode as Record<string, unknown>;

  const id = typeof l.id === 'string' ? l.id : listingId;
  const title = typeof l.name === 'string' ? l.name : '';
  const description = typeof l.description === 'string' ? l.description : '';
  const bedrooms = typeof l.bedrooms === 'number' ? l.bedrooms : 0;
  const bathrooms = typeof l.bathrooms === 'number' ? l.bathrooms : 0;
  const max_guests = typeof l.personCapacity === 'number' ? l.personCapacity : 0;
  const amenities = Array.isArray(l.amenities)
    ? (l.amenities as unknown[]).filter((a): a is string => typeof a === 'string')
    : [];
  const pq = (l.pricingQuote ?? {}) as { rate?: { amount?: number; currency?: string } };
  const price_per_night = pq.rate?.amount ?? 0;
  const currency = pq.rate?.currency ?? 'EUR';
  const location = typeof l.city === 'string' ? l.city : 'unknown';

  const listing: ListingFull = {
    id,
    title,
    url: `https://www.airbnb.com/rooms/${id}`,
    price_per_night,
    currency,
    location,
    description,
    amenities,
    bedrooms,
    bathrooms,
    max_guests,
  };

  const cats = (r.categoryRatings ?? {}) as Record<string, unknown>;
  const num = (k: string): number => (typeof cats[k] === 'number' ? cats[k] : 0);
  const recent = Array.isArray(r.recentExcerpts)
    ? (r.recentExcerpts as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const reviews_summary: ReviewsSummary = {
    total: typeof r.reviewsCount === 'number' ? r.reviewsCount : 0,
    average: typeof r.overallRating === 'number' ? r.overallRating : 0,
    by_category: {
      cleanliness: num('cleanliness'),
      accuracy: num('accuracy'),
      communication: num('communication'),
      location: num('location'),
      check_in: num('checkin'),
      value: num('value'),
    },
    ...(recent.length > 0 ? { recent_excerpts: recent } : {}),
  };

  const langs = Array.isArray(h.languages)
    ? (h.languages as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];
  const host_summary: HostSummary = {
    name: typeof h.name === 'string' ? h.name : '',
    superhost: h.isSuperhost === true,
    joined: typeof h.joinedDate === 'string' ? h.joinedDate : '',
    ...(typeof h.responseRate === 'number' ? { response_rate: h.responseRate } : {}),
    ...(typeof h.responseTime === 'string' ? { response_time: h.responseTime } : {}),
    ...(langs.length > 0 ? { languages: langs } : {}),
  };

  return ok({ listing, reviews_summary, host_summary });
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

const findFirstKey = (node: unknown, key: string): unknown => {
  if (node == null) return undefined;
  if (Array.isArray(node)) {
    for (const n of node) {
      const r = findFirstKey(n, key);
      if (r !== undefined) return r;
    }
    return undefined;
  }
  if (typeof node !== 'object') return undefined;
  const obj = node as Record<string, unknown>;
  if (key in obj) return obj[key];
  for (const v of Object.values(obj)) {
    const r = findFirstKey(v, key);
    if (r !== undefined) return r;
  }
  return undefined;
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
