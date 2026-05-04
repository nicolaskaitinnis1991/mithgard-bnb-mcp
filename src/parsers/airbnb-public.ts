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

/**
 * Parse Airbnb search results page.
 *
 * Multi-strategy: Airbnb's embedded JSON shape rotates between deploys, so we try
 * each known structure in turn:
 *   1. Modern (2026-05) — `niobeClientData[i][1].data.presentation.staysSearch.results.searchResults[]`
 *      with `__typename === 'StaySearchResult'`. ID is base64-encoded global ID
 *      `DemandStayListing:<numeric>`. Price comes from `structuredDisplayPrice.primaryLine.price`
 *      as a localized string ("€ 736").
 *   2. Legacy / synthesized — `niobeMinimalClientData` walker that recognises
 *      objects with literal `id`, `name`, `pricingQuote.rate.amount` keys.
 *
 * Both strategies are run; whichever yields ≥1 listing wins.
 */
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

  // Strategy 1: modern niobeClientData → StaySearchResult shape
  const modern = parseModernSearchResults(json);
  if (modern.length > 0) return ok({ listings: modern, total: modern.length });

  // Strategy 2: legacy walker (synthesized fixture / pre-2026 deploys)
  const legacy: Listing[] = [];
  walkForListingsLegacy(json, legacy);
  return ok({ listings: legacy, total: legacy.length });
};

/**
 * Parse Airbnb listing details page.
 *
 * Multi-strategy: try modern stayProductDetailPage first, fall back to legacy walker.
 */
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

  // Strategy 1: modern stayProductDetailPage
  const modern = parseModernListingDetails(json, listingId);
  if (modern !== null) return ok(modern);

  // Strategy 2: legacy bookingPdpSections walker
  return parseLegacyListingDetails(json, listingId);
};

// ─── Strategy 1: Modern (live 2026-05) ──────────────────────────────────────

const parseModernSearchResults = (json: unknown): Listing[] => {
  // Path: niobeClientData[i][1].data.presentation.staysSearch.results.searchResults[]
  const ncd = pluck(json, 'niobeClientData');
  if (!Array.isArray(ncd)) return [];
  const listings: Listing[] = [];
  for (const entry of ncd) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const payload: unknown = entry[1];
    const sr = pluck(payload, 'data', 'presentation', 'staysSearch', 'results', 'searchResults');
    if (!Array.isArray(sr)) continue;
    for (const r of sr) {
      const parsed = parseModernSearchResult(r);
      if (parsed !== null) listings.push(parsed);
    }
  }
  return listings;
};

const parseModernSearchResult = (r: unknown): Listing | null => {
  if (typeof r !== 'object' || r === null) return null;
  const obj = r as Record<string, unknown>;
  // Listing ID lives in demandStayListing.id (base64-encoded "DemandStayListing:<num>")
  const dsl = obj.demandStayListing as Record<string, unknown> | undefined;
  const encodedId = dsl && typeof dsl.id === 'string' ? dsl.id : undefined;
  if (encodedId === undefined) return null;
  const numericId = decodeListingId(encodedId);
  if (numericId === null) return null;

  const title =
    (obj.nameLocalized as { localizedStringWithTranslationPreference?: string } | undefined)
      ?.localizedStringWithTranslationPreference ??
    (typeof obj.title === 'string' ? obj.title : undefined) ??
    (
      dsl?.description as
        | { name?: { localizedStringWithTranslationPreference?: string } }
        | undefined
    )?.name?.localizedStringWithTranslationPreference ??
    '';

  const sdp = obj.structuredDisplayPrice as
    | { primaryLine?: { price?: string; accessibilityLabel?: string } }
    | undefined;
  const priceStr = sdp?.primaryLine?.price ?? sdp?.primaryLine?.accessibilityLabel ?? '';
  const { amount, currency } = parsePriceString(priceStr);

  // Rating from avgRatingLocalized like "4.72 (212)"
  let rating: number | undefined;
  let reviewCount: number | undefined;
  if (typeof obj.avgRatingLocalized === 'string') {
    const m = /^([\d.]+)\s*\((\d+)\)/.exec(obj.avgRatingLocalized);
    if (m?.[1] !== undefined && m[2] !== undefined) {
      rating = Number(m[1]);
      reviewCount = Number(m[2]);
    } else {
      const num = Number(obj.avgRatingLocalized);
      if (!Number.isNaN(num)) rating = num;
    }
  }

  // Location from title prefix, demandStayListing, or structuredContent
  const subtitleStr = typeof obj.title === 'string' ? obj.title : '';
  // r.title is e.g. "Apartment in Berlin" → strip "X in "
  const locMatch = /\bin\s+(.+)$/i.exec(subtitleStr);
  const location = locMatch?.[1] ?? 'unknown';

  const out: Listing = {
    id: numericId,
    title,
    url: `https://www.airbnb.com/rooms/${numericId}`,
    price_per_night: amount,
    currency,
    location,
  };
  if (rating !== undefined) out.rating = rating;
  if (reviewCount !== undefined) out.review_count = reviewCount;
  return out;
};

const parseModernListingDetails = (
  json: unknown,
  listingId: string,
): ListingDetailsParsed | null => {
  const ncd = pluck(json, 'niobeClientData');
  if (!Array.isArray(ncd)) return null;

  // Find the entry whose payload has stayProductDetailPage
  let pdp: Record<string, unknown> | null = null;
  for (const entry of ncd) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const candidate = pluck(entry[1], 'data', 'presentation', 'stayProductDetailPage');
    if (candidate && typeof candidate === 'object') {
      pdp = candidate as Record<string, unknown>;
      break;
    }
  }
  if (pdp === null) return null;

  const sectionsContainer = pdp.sections as Record<string, unknown> | undefined;
  if (!sectionsContainer) return null;
  const meta = sectionsContainer.metadata as Record<string, unknown> | undefined;
  const sectionsArr = sectionsContainer.sections;
  if (!Array.isArray(sectionsArr)) return null;

  const findSection = (id: string): Record<string, unknown> | undefined => {
    for (const s of sectionsArr) {
      if (typeof s === 'object' && s !== null) {
        const so = s as Record<string, unknown>;
        if (so.sectionId === id) {
          const sec = so.section;
          return typeof sec === 'object' && sec !== null
            ? (sec as Record<string, unknown>)
            : undefined;
        }
      }
    }
    return undefined;
  };

  const sharing = (meta?.sharingConfig ?? {}) as Record<string, unknown>;
  const sharingTitle = typeof sharing.title === 'string' ? sharing.title : '';
  const titleSection = findSection('TITLE_DEFAULT');
  const title =
    (typeof titleSection?.title === 'string' && titleSection.title) ||
    (typeof sharing.propertyType === 'string' ? sharing.propertyType : '') ||
    sharingTitle;

  // Description
  const descSection = findSection('DESCRIPTION_DEFAULT');
  const htmlDesc = descSection?.htmlDescription as { htmlText?: string } | undefined;
  const description = stripHtml(htmlDesc?.htmlText ?? '');

  // Bedrooms / bathrooms parsed from sharingConfig.title (e.g. "... · 2 bedrooms · 2 beds · 1 shared bath")
  const bedrooms = parseFirstInt(sharingTitle, /(\d+)\s+bedroom/i) ?? 0;
  const bathrooms = parseFirstInt(sharingTitle, /([\d.]+)\s+(?:shared\s+)?bath/i) ?? 0;
  const max_guests = typeof sharing.personCapacity === 'number' ? sharing.personCapacity : 0;
  const location = typeof sharing.location === 'string' ? sharing.location : 'unknown';

  // Amenities — flatten previewAmenitiesGroups[*].amenities[*].title where available
  const amSection = findSection('AMENITIES_DEFAULT');
  const groups =
    (amSection?.seeAllAmenitiesGroups as unknown[] | undefined) ??
    (amSection?.previewAmenitiesGroups as unknown[] | undefined) ??
    [];
  const amenities: string[] = [];
  for (const g of groups) {
    if (typeof g !== 'object' || g === null) continue;
    const ams = (g as Record<string, unknown>).amenities;
    if (!Array.isArray(ams)) continue;
    for (const a of ams) {
      if (typeof a !== 'object' || a === null) continue;
      const ao = a as Record<string, unknown>;
      if (ao.available === false) continue;
      if (typeof ao.title === 'string') amenities.push(ao.title);
    }
  }

  // Price — listing detail pages typically don't embed a per-night price up-front.
  // Fall back to 0 with currency EUR; consumers should call search for live pricing.
  const price_per_night = 0;
  const currency = 'EUR';

  // Reviews
  const rvSection = findSection('REVIEWS_DEFAULT');
  const overallRating =
    typeof rvSection?.overallRating === 'number'
      ? rvSection.overallRating
      : typeof sharing.starRating === 'number'
        ? sharing.starRating
        : 0;
  const reviewCount =
    typeof sharing.reviewCount === 'number'
      ? sharing.reviewCount
      : typeof rvSection?.overallCount === 'number'
        ? rvSection.overallCount
        : 0;
  const ratingsArr = Array.isArray(rvSection?.ratings) ? rvSection.ratings : [];
  const catLookup: Record<string, number> = {};
  for (const cr of ratingsArr) {
    if (typeof cr !== 'object' || cr === null) continue;
    const cro = cr as Record<string, unknown>;
    if (typeof cro.categoryType !== 'string') continue;
    const lr = typeof cro.localizedRating === 'string' ? Number(cro.localizedRating) : NaN;
    if (!Number.isNaN(lr)) catLookup[cro.categoryType] = lr;
  }
  const reviews_summary: ReviewsSummary = {
    total: reviewCount,
    average: overallRating,
    by_category: {
      cleanliness: catLookup.CLEANLINESS ?? 0,
      accuracy: catLookup.ACCURACY ?? 0,
      communication: catLookup.COMMUNICATION ?? 0,
      location: catLookup.LOCATION ?? 0,
      check_in: catLookup.CHECKIN ?? 0,
      value: catLookup.VALUE ?? 0,
    },
  };

  // Host
  const hostSection = findSection('MEET_YOUR_HOST');
  const cardData = (hostSection?.cardData ?? {}) as Record<string, unknown>;
  const hostName = typeof cardData.name === 'string' ? cardData.name : '';
  const isSuperhost = cardData.isSuperhost === true;
  // Years hosting → joined offset; we only have the value, store as-is in joined
  const stats = Array.isArray(cardData.stats) ? cardData.stats : [];
  let yearsHosting: string | undefined;
  for (const s of stats) {
    if (typeof s !== 'object' || s === null) continue;
    const so = s as Record<string, unknown>;
    if (so.type === 'YEARS_HOSTING' && typeof so.value === 'string') yearsHosting = so.value;
  }
  const host_summary: HostSummary = {
    name: hostName,
    superhost: isSuperhost,
    joined: yearsHosting !== undefined ? `${yearsHosting} years hosting` : '',
  };

  const listing: ListingFull = {
    id: listingId,
    title: typeof title === 'string' ? title : '',
    url: `https://www.airbnb.com/rooms/${listingId}`,
    price_per_night,
    currency,
    location,
    description,
    amenities,
    bedrooms,
    bathrooms,
    max_guests,
  };

  return { listing, reviews_summary, host_summary };
};

// ─── Strategy 2: Legacy / synthesized walker ─────────────────────────────────

const parseLegacyListingDetails = (
  json: unknown,
  listingId: string,
): Result<ListingDetailsParsed, McpError> => {
  const root = pluck(json, 'niobeMinimalClientData');
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Walk a property-key path through unknown JSON, returning undefined on any miss. */
const pluck = (o: unknown, ...path: string[]): unknown => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = o;
  for (const p of path) {
    if (cur === null || cur === undefined) return undefined;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    cur = cur[p];
  }
  return cur as unknown;
};

const findFirstKey = (node: unknown, key: string): unknown => {
  if (node === null || node === undefined) return undefined;
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

const walkForListingsLegacy = (node: unknown, out: Listing[]): void => {
  if (Array.isArray(node)) {
    for (const n of node) walkForListingsLegacy(n, out);
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
  for (const v of Object.values(obj)) walkForListingsLegacy(v, out);
};

/**
 * Decode Airbnb's base64-wrapped global IDs.
 * "RGVtYW5kU3RheUxpc3Rpbmc6MTg2NzE3OQ==" → "1867179"
 * (raw decodes to "DemandStayListing:1867179")
 */
const decodeListingId = (encoded: string): string | null => {
  try {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    const m = /(?:DemandStayListing|StayListing):(\d+)/.exec(decoded);
    if (m?.[1] !== undefined) return m[1];
    // If it's already numeric, keep it
    if (/^\d+$/.test(encoded)) return encoded;
    return null;
  } catch {
    return null;
  }
};

/**
 * Parse a localized price string like "€ 736", "$1,250", "£99" into amount + ISO currency.
 * Falls back to amount=0, currency=EUR if no digits found.
 */
const parsePriceString = (s: string): { amount: number; currency: string } => {
  if (!s) return { amount: 0, currency: 'EUR' };
  const trimmed = s.replace(/\s+/g, '');
  // Currency: first non-digit, non-comma, non-period, non-minus run
  let currency = 'EUR';
  if (trimmed.includes('€') || /\bEUR\b/i.test(s)) currency = 'EUR';
  else if (trimmed.includes('$') || /\bUSD\b/i.test(s)) currency = 'USD';
  else if (trimmed.includes('£') || /\bGBP\b/i.test(s)) currency = 'GBP';
  else if (trimmed.includes('¥') || /\bJPY\b/i.test(s)) currency = 'JPY';
  // Amount: longest digit-run with optional commas/period as thousands/decimal
  const m = /([\d.,]+)/.exec(s);
  if (m?.[1] === undefined) return { amount: 0, currency };
  // Normalise: strip commas (thousands sep) — assume period is decimal
  const cleaned = m[1].replace(/,/g, '');
  const amount = Number(cleaned);
  return { amount: Number.isFinite(amount) ? amount : 0, currency };
};

const parseFirstInt = (s: string, re: RegExp): number | null => {
  const m = s.match(re);
  if (m?.[1] === undefined) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const stripHtml = (s: string): string =>
  s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
