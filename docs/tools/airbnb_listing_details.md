# airbnb_listing_details

> Fetch full details for a single public Airbnb listing — amenities,
> reviews summary, host profile, capacity.
> Status: **Live** (parses the public listing page; no Partner API required)

## Purpose

`airbnb_listing_details` is the natural follow-up to
[`airbnb_search`](./airbnb_search.md): once an agent has a candidate
`listing_id`, this tool fetches the full public detail page and returns a
structured view of the listing itself, an aggregated reviews summary, and a
small host profile. Useful for "is this place actually a fit?" reasoning —
amenities, capacity, ratings by category, superhost flag, recent review
excerpts.

This is the **second of the two live tools** in this server. Its output
reflects what was on the public listing page at request time.

## Input schema

```ts
{
  listing_id: string | number;       // required, accepts either form
  checkin?: string;                  // ISO date "YYYY-MM-DD", optional
  checkout?: string;                 // ISO date "YYYY-MM-DD", optional
}
```

Source: [`src/tools/listing-details/schema.ts`](../../src/tools/listing-details/schema.ts).

`listing_id` may be either the bare numeric id (e.g. `49070135`) or the
base64-style `DemandStayListing:<num>` form Airbnb sometimes uses internally
— the parser handles both. `checkin`/`checkout` only influence whether
price-per-night reflects nightly base or date-specific pricing.

## Output shape

```jsonc
{
  "listing": {
    "id": "49070135",
    "title": "Numa | Medium Room near KaDeWe",
    "url": "https://www.airbnb.com/rooms/49070135",
    "price_per_night": 491,
    "currency": "EUR",
    "rating": 4.74,                  // optional
    "review_count": 2716,            // optional
    "host_name": "Numa",             // optional
    "location": "Berlin",
    "thumbnail_url": "https://...",  // optional
    "description": "...",
    "amenities": ["Wifi", "Kitchen", "Self check-in", "..."],
    "bedrooms": 1,
    "bathrooms": 1,
    "max_guests": 2,
    "check_in": "15:00",             // optional
    "check_out": "11:00",            // optional
    "house_rules": ["No smoking", "..."]  // optional
  },
  "reviews_summary": {
    "total": 2716,
    "average": 4.74,
    "by_category": {                 // optional, all 6 categories or none
      "cleanliness": 4.8,
      "accuracy": 4.7,
      "communication": 4.9,
      "location": 4.6,
      "check_in": 4.8,
      "value": 4.5
    },
    "recent_excerpts": ["Great location, clean.", "..."]
  },
  "host_summary": {
    "name": "Numa",
    "superhost": true,
    "joined": "2019-04",
    "response_rate": 0.98,           // optional, 0..1
    "response_time": "within an hour", // optional
    "languages": ["English", "German"] // optional
  },
  "_source": "public"
}
```

Source: [`src/tools/listing-details/schema.ts`](../../src/tools/listing-details/schema.ts).

## Example

### Agent prompt

> "Show me details for Airbnb listing 49070135 — bedrooms, amenities, average
> rating, host info."

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "airbnb_listing_details",
    "arguments": {
      "listing_id": "49070135"
    }
  }
}
```

### Response (truncated, representative)

```jsonc
{
  "listing": {
    "id": "49070135",
    "title": "Numa | Medium Room near KaDeWe",
    "url": "https://www.airbnb.com/rooms/49070135",
    "price_per_night": 491,
    "currency": "EUR",
    "rating": 4.74,
    "review_count": 2716,
    "host_name": "Numa",
    "location": "Berlin",
    "description": "Stylish studio room close to KaDeWe and Kurfürstendamm...",
    "amenities": [
      "Wifi",
      "Kitchen",
      "Self check-in",
      "Heating",
      "Hair dryer",
      "Iron",
      "Workspace"
    ],
    "bedrooms": 1,
    "bathrooms": 1,
    "max_guests": 2,
    "check_in": "15:00",
    "check_out": "11:00"
  },
  "reviews_summary": {
    "total": 2716,
    "average": 4.74,
    "by_category": {
      "cleanliness": 4.8,
      "accuracy": 4.7,
      "communication": 4.7,
      "location": 4.8,
      "check_in": 4.8,
      "value": 4.5
    },
    "recent_excerpts": [
      "Clean, central, easy check-in.",
      "Smaller than expected but well-equipped."
    ]
  },
  "host_summary": {
    "name": "Numa",
    "superhost": true,
    "joined": "2019-04",
    "response_rate": 0.98,
    "response_time": "within an hour"
  },
  "_source": "public"
}
```

## Edge cases & failure modes

- **Rate-limited upstream (429)** → returns `RateLimited` error with
  `retry_after_ms`. Auto-retried up to 3 times.
- **Listing removed / 404** → returns `UpstreamHTTP` error with status 404.
- **Parse failure on a structurally novel page** → returns `ParseFailed`
  identifying which strategy failed. Multi-strategy parser tries modern
  `niobeClientData` first then legacy `niobeMinimalClientData`
  ([ADR-0006](../adr/0006-multi-strategy-parser.md)).
- **Optional fields missing** → omitted from the response (e.g. brand-new
  listings have no `rating`, `review_count`, `by_category`, or
  `recent_excerpts`).
- **`host_summary.superhost: false`** is returned for non-superhosts, not
  omitted.

## Performance characteristics

- **Cache TTL**: 30 minutes per `listing_id`/dates URL (default, configurable
  via `CACHE_TTL_LISTING_MS`).
- **Rate-limited**: yes — global queue at 1 req/sec, 60 req/hour, shared with
  `airbnb_search`.
- **Typical p95 latency**: ~800-1500 ms cold (listing pages are heavier than
  search results); ~5 ms on cache hit.

## When to use

- ✅ Best for: drilling into a specific listing after search, fit-checking
  ("does it sleep 4? does it have a kitchen?"), pulling host responsiveness
  signals for traveller agents, scraping recent review excerpts for
  competitive review-tone research.
- ❌ Not for: real-time price quotes including fees/taxes (only public base
  nightly is parsed), booking flow, modifying calendars, anything requiring
  the Airbnb Partner API.

## See also

- Source: [`src/tools/listing-details/`](../../src/tools/listing-details/)
- Schema: [`src/tools/listing-details/schema.ts`](../../src/tools/listing-details/schema.ts)
- Companion tool: [`airbnb_search`](./airbnb_search.md)
- Parser strategy: [ADR-0006 multi-strategy parser](../adr/0006-multi-strategy-parser.md)
- Error model: [ADR-0004 Result type, not throw](../adr/0004-result-type-not-throw.md)
- Architecture overview: [`docs/architecture.md`](../architecture.md)
- Known limitations: [`docs/limitations.md`](../limitations.md)
