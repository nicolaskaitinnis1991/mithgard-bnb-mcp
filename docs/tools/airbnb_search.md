# airbnb_search

Reads public Airbnb search pages and returns structured results. This is a read-only public-page adapter, not a Partner API integration or a booking/availability guarantee. Upstream HTML may change or block access.

## Input

```json
{
  "location": "Berlin",
  "checkin": "2026-10-10",
  "checkout": "2026-10-15",
  "adults": 2,
  "children": 0,
  "min_price": 50,
  "max_price": 200,
  "currency": "EUR"
}
```

`location` is required, trimmed, nonempty and at most 300 characters. Adults default to 2 (1–16); children default to 0 (0–10). Dates must both be provided or both omitted, must be real `YYYY-MM-DD` dates, and checkout must be after checkin. Price limits are nonnegative integers up to 1,000,000; minimum cannot exceed maximum. Currency defaults to EUR and must contain three uppercase letters. Unknown fields fail validation.

The requested currency, date window and party/price filters are forwarded upstream and included in the cache key. Returned currencies describe the parsed quote; a requested currency is not proof of what Airbnb rendered.

## Prices and missing data

Each result contains `id`, `title`, `url`, `location`, `currency` and `price_per_night`. Modern-page results also return `display_price` and `price_basis` (`night`, `stay_total`, or `unknown`); rating and review count are optional.

**A stay total is not a nightly price.** The saved May 2026 public HTML fixture contains a €736 stay total and a separate explanation of 5 nights × €147.17. The parser returns the display amount and the explicit nightly amount separately:

```json
{
  "display_price": 736,
  "price_basis": "stay_total",
  "price_per_night": 147.17,
  "currency": "EUR"
}
```

This is a regression-fixture excerpt, not a current price quote. When no reliable nightly evidence exists, `price_per_night` is `null`. Missing or ambiguous currency is `null`. The parser does not divide a total containing unknown fees/taxes by the stay length. Localized comma/dot decimal and grouping separators are supported; ambiguous formats remain a parser limitation.

The response includes `results`, first-page `total_estimate`, normalized `query` and `_source: "public"`. `total_estimate` counts parsed results, not the entire market. A recognized empty upstream result set returns an empty list; an unrecognized page shape returns `ParseFailed`, so parser failure cannot silently mean zero availability.

## Operation

Public data is cached in memory for the configured search TTL. Rate limits, deadlines, retries and body-size limits are shared by public tools; see [deployment](../deploy.md) and [limitations](../limitations.md). Transport, HTTP, rate-limit and parse failures surface as MCP tool errors. No login, booking or inventory change occurs.

- [Schema](../../src/tools/search/schema.ts)
- [Handler](../../src/tools/search/handler.ts)
- [Parser](../../src/parsers/airbnb-public.ts)
- [Synthetic price/currency/cache regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Listing details](./airbnb_listing_details.md)
