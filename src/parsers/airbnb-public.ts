import * as cheerio from 'cheerio';
import { type Result, ok, err } from '../lib/result.js';
import { type McpError, parseFailed } from '../lib/errors.js';
import { drill, findFirstKey, walkObjects } from '../lib/json-walker.js';
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

const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const array = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const embeddedData = (html: string): unknown => {
  const script = cheerio.load(html)('script#data-deferred-state-0').text();
  if (!script) throw new Error('Missing embedded Airbnb data');
  return JSON.parse(script) as unknown;
};

/** External HTML and JSON are untrusted; malformed shapes return typed failures. */
export const parseSearchResults = (
  html: string,
  _query: NormalizedQuery,
): Result<{ listings: Listing[]; total: number }, McpError> => {
  try {
    const json = embeddedData(html);
    const modern = parseModernSearchResults(json);
    if (modern !== null) return ok({ listings: modern, total: modern.length });
    const legacy: Listing[] = [];
    walkObjects(json, (obj) => {
      const pq = record(obj.pricingQuote);
      if (
        typeof obj.id !== 'string' ||
        !/^\d+$/.test(obj.id) ||
        typeof obj.name !== 'string' ||
        !pq
      )
        return;
      const rate = record(pq.rate);
      legacy.push({
        id: obj.id,
        title: obj.name,
        url: `https://www.airbnb.com/rooms/${obj.id}`,
        price_per_night: number(rate?.amount),
        currency: text(rate?.currency) || null,
        price_basis: 'night',
        location: text(obj.city) || 'unknown',
      });
    });
    if (legacy.length === 0) return err(parseFailed('searchResults/pricingQuote', 'search'));
    return ok({ listings: legacy, total: legacy.length });
  } catch (cause) {
    return err(parseFailed('embedded JSON/shape', 'search', String(cause)));
  }
};

export const parseListingDetails = (
  html: string,
  listingId: string,
): Result<ListingDetailsParsed, McpError> => {
  try {
    const json = embeddedData(html);
    const modern = parseModernListingDetails(json, listingId);
    return modern !== null ? ok(modern) : parseLegacyListingDetails(json, listingId);
  } catch (cause) {
    return err(parseFailed('embedded JSON/shape', 'listing', String(cause)));
  }
};

const parseModernSearchResults = (json: unknown): Listing[] | null => {
  const entries = array(drill(json, ['niobeClientData']));
  let found = false;
  const listings: Listing[] = [];
  for (const entry of entries) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const results = drill(entry[1], [
      'data',
      'presentation',
      'staysSearch',
      'results',
      'searchResults',
    ]);
    if (!Array.isArray(results)) continue;
    found = true;
    for (const value of results) {
      const listing = parseModernSearchResult(value);
      if (listing !== null) listings.push(listing);
    }
    // A recognized, explicitly empty result set differs from an unknown page shape.
    if (results.length > 0 && listings.length === 0) return null;
  }
  return found ? listings : null;
};

const parseModernSearchResult = (value: unknown): Listing | null => {
  const obj = record(value);
  if (!obj) return null;
  const dsl = record(obj.demandStayListing);
  const id = decodeListingId(text(dsl?.id));
  if (id === null) return null;
  const title =
    text(drill(obj, ['nameLocalized', 'localizedStringWithTranslationPreference'])) ||
    text(obj.title) ||
    text(drill(dsl, ['description', 'name', 'localizedStringWithTranslationPreference']));
  if (!title.trim()) return null;
  const sdp = record(obj.structuredDisplayPrice);
  const line = record(sdp?.primaryLine);
  const displayed = parsePriceString(text(line?.price) || text(line?.accessibilityLabel));
  const qualifier = `${text(line?.qualifier)} ${text(line?.accessibilityLabel)}`;
  const basis = /total|gesamt|insgesamt/i.test(qualifier)
    ? 'stay_total'
    : /night|nacht|nuit|noche|notte/i.test(qualifier)
      ? 'night'
      : 'unknown';
  let nightly = basis === 'night' ? displayed.amount : null;
  let currency = displayed.currency;
  // Airbnb's primary line can be the entire stay, including fees. Never label it nightly.
  for (const group of array(drill(sdp, ['explanationData', 'priceDetails']))) {
    for (const item of array(record(group)?.items)) {
      const description = text(record(item)?.description);
      const match = /^\s*\d+\s+(?:nights?|nächte|nacht|nuits?|noches?|notti)\s*[x×]\s*(.+)$/i.exec(
        description,
      );
      if (!match?.[1]) continue;
      const parsed = parsePriceString(match[1]);
      if (parsed.amount !== null) {
        nightly = parsed.amount;
        currency = parsed.currency ?? currency;
      }
    }
  }
  const out: Listing = {
    id,
    title,
    url: `https://www.airbnb.com/rooms/${id}`,
    price_per_night: nightly,
    currency,
    display_price: displayed.amount,
    price_basis: basis,
    location: /\bin\s+(.+)$/i.exec(text(obj.title))?.[1] ?? 'unknown',
  };
  const ratingMatch = /^([\d.,]+)\s*\((\d+)\)/.exec(text(obj.avgRatingLocalized));
  if (ratingMatch?.[1] !== undefined && ratingMatch[2] !== undefined) {
    const rating = Number(ratingMatch[1].replace(',', '.'));
    if (rating >= 0 && rating <= 5) out.rating = rating;
    out.review_count = Number(ratingMatch[2]);
  } else if (text(obj.avgRatingLocalized)) {
    const rating = Number(text(obj.avgRatingLocalized).replace(',', '.'));
    if (Number.isFinite(rating) && rating >= 0 && rating <= 5) out.rating = rating;
  }
  return out;
};

const parseModernListingDetails = (
  json: unknown,
  listingId: string,
): ListingDetailsParsed | null => {
  let pdp: Record<string, unknown> | undefined;
  for (const entry of array(drill(json, ['niobeClientData']))) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    pdp = record(drill(entry[1], ['data', 'presentation', 'stayProductDetailPage']));
    if (pdp) break;
  }
  if (!pdp) return null;
  const container = record(pdp.sections);
  if (!container || !Array.isArray(container.sections)) return null;
  const section = (id: string): Record<string, unknown> | undefined => {
    const found = container.sections as unknown[];
    for (const candidate of found) {
      const obj = record(candidate);
      if (obj?.sectionId === id) return record(obj.section);
    }
    return undefined;
  };
  const sharing = record(drill(container, ['metadata', 'sharingConfig']));
  const sharingTitle = text(sharing?.title);
  const amenities: string[] = [];
  const amenitySection = section('AMENITIES_DEFAULT');
  const groups = Array.isArray(amenitySection?.seeAllAmenitiesGroups)
    ? amenitySection.seeAllAmenitiesGroups
    : array(amenitySection?.previewAmenitiesGroups);
  for (const group of groups) {
    for (const value of array(record(group)?.amenities)) {
      const amenity = record(value);
      if (amenity && amenity.available !== false && typeof amenity.title === 'string')
        amenities.push(amenity.title);
    }
  }
  const review = section('REVIEWS_DEFAULT');
  const cats: Record<string, number | null> = {};
  for (const value of array(review?.ratings)) {
    const category = record(value);
    if (typeof category?.categoryType !== 'string') continue;
    const n = Number(text(category.localizedRating).replace(',', '.'));
    cats[category.categoryType] =
      text(category.localizedRating) && Number.isFinite(n) && n >= 0 && n <= 5 ? n : null;
  }
  const reviews_summary: ReviewsSummary = {
    total: number(sharing?.reviewCount) ?? number(review?.overallCount),
    average: number(review?.overallRating) ?? number(sharing?.starRating),
  };
  if (Object.keys(cats).length)
    reviews_summary.by_category = {
      cleanliness: cats.CLEANLINESS ?? null,
      accuracy: cats.ACCURACY ?? null,
      communication: cats.COMMUNICATION ?? null,
      location: cats.LOCATION ?? null,
      check_in: cats.CHECKIN ?? null,
      value: cats.VALUE ?? null,
    };
  const card = record(section('MEET_YOUR_HOST')?.cardData);
  let joined = '';
  for (const value of array(card?.stats)) {
    const stat = record(value);
    if (stat?.type === 'YEARS_HOSTING' && typeof stat.value === 'string')
      joined = `${stat.value} years hosting`;
  }
  const listing: ListingFull = {
    id: listingId,
    title: text(section('TITLE_DEFAULT')?.title) || text(sharing?.propertyType) || sharingTitle,
    url: `https://www.airbnb.com/rooms/${listingId}`,
    price_per_night: null,
    currency: null,
    location: text(sharing?.location) || 'unknown',
    description: stripHtml(
      text(drill(section('DESCRIPTION_DEFAULT'), ['htmlDescription', 'htmlText'])),
    ),
    amenities,
    bedrooms: parseFirstNumber(sharingTitle, /(\d+)\s+bedroom/i),
    bathrooms: parseFirstNumber(sharingTitle, /([\d.,]+)\s+(?:shared\s+)?bath/i),
    max_guests: number(sharing?.personCapacity),
  };
  return {
    listing,
    reviews_summary,
    host_summary: {
      name: text(card?.name),
      superhost: typeof card?.isSuperhost === 'boolean' ? card.isSuperhost : null,
      joined,
    },
  };
};

const parseLegacyListingDetails = (
  json: unknown,
  listingId: string,
): Result<ListingDetailsParsed, McpError> => {
  const pdp = findFirstKey(drill(json, ['niobeMinimalClientData']), 'bookingPdpSections');
  if (pdp === undefined) return err(parseFailed('bookingPdpSections', 'listing'));
  const l = record(findFirstKey(pdp, 'listing'));
  const r = record(findFirstKey(pdp, 'reviewsModule'));
  const h = record(findFirstKey(pdp, 'host'));
  if (!l || !r || !h) return err(parseFailed('listing/reviewsModule/host', 'listing'));
  const id = typeof l.id === 'string' && /^\d+$/.test(l.id) ? l.id : listingId;
  const rate = record(drill(l, ['pricingQuote', 'rate']));
  const listing: ListingFull = {
    id,
    title: text(l.name),
    url: `https://www.airbnb.com/rooms/${id}`,
    price_per_night: number(rate?.amount),
    currency: text(rate?.currency) || null,
    location: text(l.city) || 'unknown',
    description: text(l.description),
    amenities: array(l.amenities).filter((a): a is string => typeof a === 'string'),
    bedrooms: number(l.bedrooms),
    bathrooms: number(l.bathrooms),
    max_guests: number(l.personCapacity),
  };
  const reviews_summary: ReviewsSummary = {
    total: number(r.reviewsCount),
    average: number(r.overallRating),
  };
  const cats = record(r.categoryRatings);
  if (cats)
    reviews_summary.by_category = {
      cleanliness: number(cats.cleanliness),
      accuracy: number(cats.accuracy),
      communication: number(cats.communication),
      location: number(cats.location),
      check_in: number(cats.checkin),
      value: number(cats.value),
    };
  const excerpts = array(r.recentExcerpts).filter((v): v is string => typeof v === 'string');
  if (excerpts.length) reviews_summary.recent_excerpts = excerpts;
  const host_summary: HostSummary = {
    name: text(h.name),
    superhost: typeof h.isSuperhost === 'boolean' ? h.isSuperhost : null,
    joined: text(h.joinedDate),
  };
  if (typeof h.responseRate === 'number') host_summary.response_rate = h.responseRate;
  if (typeof h.responseTime === 'string') host_summary.response_time = h.responseTime;
  const languages = array(h.languages).filter((v): v is string => typeof v === 'string');
  if (languages.length) host_summary.languages = languages;
  return ok({ listing, reviews_summary, host_summary });
};

const decodeListingId = (encoded: string): string | null => {
  if (/^\d+$/.test(encoded)) return encoded;
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  return /^(?:DemandStayListing|StayListing):(\d+)$/.exec(decoded)?.[1] ?? null;
};

/** Parse decimal comma/dot and common currency markers without inventing a price. */
const parsePriceString = (s: string): { amount: number | null; currency: string | null } => {
  const currencies: [RegExp, string][] = [
    [/€|\bEUR\b/i, 'EUR'],
    [/£|\bGBP\b/i, 'GBP'],
    [/\bUSD\b|US\$/i, 'USD'],
    [/\bCAD\b|CA\$|C\$/i, 'CAD'],
    [/\bAUD\b|AU\$|A\$/i, 'AUD'],
    [/\bJPY\b|¥/i, 'JPY'],
    [/\bCHF\b/i, 'CHF'],
  ];
  const currency = currencies.find(([pattern]) => pattern.test(s))?.[1] ?? null;
  const match = /\d[\d.,\s\u00a0\u202f']*/.exec(s);
  if (!match) return { amount: null, currency };
  let normalized = match[0].replace(/[\s\u00a0\u202f']/g, '');
  const dot = normalized.lastIndexOf('.');
  const comma = normalized.lastIndexOf(',');
  if (dot >= 0 && comma >= 0) {
    const decimal = dot > comma ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    normalized = normalized.split(thousands).join('').replace(decimal, '.');
  } else if (dot >= 0 || comma >= 0) {
    const separator = dot >= 0 ? '.' : ',';
    const pieces = normalized.split(separator);
    normalized =
      pieces.length === 2 && (pieces[1]?.length ?? 0) <= 2
        ? normalized.replace(separator, '.')
        : pieces.join('');
  }
  const amount = Number(normalized);
  return { amount: Number.isFinite(amount) && amount >= 0 ? amount : null, currency };
};

const parseFirstNumber = (s: string, re: RegExp): number | null => {
  const match = re.exec(s)?.[1];
  return match === undefined ? null : number(Number(match.replace(',', '.')));
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
