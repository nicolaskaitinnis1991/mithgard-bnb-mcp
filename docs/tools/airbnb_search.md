# airbnb_search

> Search public Airbnb listings by location, dates, party size, and price.
> Status: **Live** (parses public Airbnb HTML; no Partner API required)

## Purpose

`airbnb_search` is the entry point for "I want to look at the Airbnb market for
location X". It takes a free-form `location` plus optional check-in/out dates,
party composition, and a price band, then returns up to ~18 representative
listings extracted from Airbnb's public search results page. Typical callers
are research agents helping a host benchmark competitors, or a traveller
agent doing first-pass discovery before drilling into individual listings via
[`airbnb_listing_details`](./airbnb_listing_details.md).

This is one of the **two live tools** in this server — its output reflects
real Airbnb inventory at request time, not a fixture.

## Input schema

```ts
{
  location: string;                  // required, free-form (e.g. "Berlin", "Berlin, Mitte")
  checkin?: string;                  // ISO date "YYYY-MM-DD"
  checkout?: string;                 // ISO date "YYYY-MM-DD"
  adults?: number;                   // int 1..16, default 2
  children?: number;                 // int 0..10, default 0
  min_price?: number;                // int, nightly, in currency
  max_price?: number;                // int, nightly, in currency
  currency?: string;                 // ISO 4217, length 3, default "EUR"
}
```

Source: [`src/tools/search/schema.ts`](../../src/tools/search/schema.ts).

The currency parameter is sent through to Airbnb's URL but the actual prices
returned reflect whatever currency Airbnb's HTML rendered for the request
(usually but not always the requested one — see edge cases below).

## Output shape

```jsonc
{
  "results": [
    {
      "id": "1628376372660930057",      // string (decoded from base64 DemandStayListing if needed)
      "title": "Stylisches Apartment direkt am Ku´damm",
      "url": "https://www.airbnb.com/rooms/1628376372660930057",
      "price_per_night": 527,           // number, in currency
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.89,                   // optional, may be omitted if no reviews
      "review_count": 18                // optional, may be omitted if no reviews
    }
  ],
  "total_estimate": 18,                 // int, parser's best-effort count
  "query": {
    "location": "Berlin",
    "adults": 2,
    "children": 0,
    "currency": "EUR"
  },
  "_source": "public"                   // always "public" for this tool
}
```

The declared zod output schema covers the 6 core listing fields; `rating` and
`review_count` are added by the parser when present in the HTML payload and
pass through the (input-only) registry validation. They are best regarded as
"optional but commonly present" in real responses.

## Example

### Agent prompt

> "Find me Airbnbs in Berlin for 2 adults, June 1-4, 2026, under 600€."

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "airbnb_search",
    "arguments": {
      "location": "Berlin",
      "checkin": "2026-06-01",
      "checkout": "2026-06-04",
      "adults": 2,
      "max_price": 600,
      "currency": "EUR"
    }
  }
}
```

### Response (truncated, real data from 2026-05-04 smoke test)

```jsonc
{
  "results": [
    {
      "id": "1628376372660930057",
      "title": "Stylisches Apartment direkt am Ku´damm",
      "url": "https://www.airbnb.com/rooms/1628376372660930057",
      "price_per_night": 527,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.89,
      "review_count": 18
    },
    {
      "id": "49070135",
      "title": "Numa | Medium Room near KaDeWe",
      "url": "https://www.airbnb.com/rooms/49070135",
      "price_per_night": 491,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.74,
      "review_count": 2716
    }
    // ... ~16 more results
  ],
  "total_estimate": 18,
  "query": { "location": "Berlin", "adults": 2, "children": 0, "currency": "EUR" },
  "_source": "public"
}
```

Full transcript: [`docs/live-smoke-test-2026-05-04.txt`](../live-smoke-test-2026-05-04.txt).

## Edge cases & failure modes

- **Rate-limited upstream (429)** → returns `RateLimited` error with
  `retry_after_ms`. The HTTP layer auto-retries up to 3 times with backoff
  before giving up.
- **Airbnb HTML structure changes** → returns `ParseFailed` with the strategy
  attempted. The parser is multi-strategy (modern `niobeClientData` + legacy
  `niobeMinimalClientData` fallback) — see
  [ADR-0006](../adr/0006-multi-strategy-parser.md).
- **No results** → `results: []`, `total_estimate: 0`. Not an error.
- **`rating` / `review_count` missing on individual results** → fields are
  simply omitted. Brand-new listings often have neither.
- **Currency mismatch** → Airbnb sometimes overrides the requested currency
  with a geo-default; `result.currency` reflects what was actually rendered.

## Performance characteristics

- **Cache TTL**: 15 minutes per fully-qualified query URL (default,
  configurable via `CACHE_TTL_SEARCH_MS`).
- **Rate-limited**: yes — global queue at 1 req/sec, 60 req/hour, shared with
  `airbnb_listing_details`.
- **Typical p95 latency**: ~600-1200 ms cold (HTTP fetch + parse); ~5 ms on
  cache hit.

## When to use

- ✅ Best for: market discovery, competitor benchmarking, price-band research,
  "show me what's available in X for these dates".
- ❌ Not for: real-time availability/booking flows (no Partner API
  integration), exhaustive market listings (you get ~18 first-page results,
  not paginated coverage), historical pricing analysis.

## See also

- Source: [`src/tools/search/`](../../src/tools/search/)
- Schema: [`src/tools/search/schema.ts`](../../src/tools/search/schema.ts)
- Companion tool: [`airbnb_listing_details`](./airbnb_listing_details.md)
- Parser strategy: [ADR-0006 multi-strategy parser](../adr/0006-multi-strategy-parser.md)
- Error model: [ADR-0004 Result type, not throw](../adr/0004-result-type-not-throw.md)
- Architecture overview: [`docs/architecture.md`](../architecture.md)
- Known limitations: [`docs/limitations.md`](../limitations.md)
