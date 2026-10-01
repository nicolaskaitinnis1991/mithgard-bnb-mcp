# airbnb_listing_details

Reads a public Airbnb listing page and parses descriptive, review and host data. This is a public-page adapter, not a Partner API integration, reservation quote or availability guarantee.

## Input

```json
{
  "listing_id": "1867179",
  "checkin": "2026-10-10",
  "checkout": "2026-10-15"
}
```

`listing_id` is a numeric string of 1–30 digits or a positive safe integer. Full URLs, base64/global IDs and path fragments are rejected. Dates are optional as a pair: both must be real `YYYY-MM-DD` dates and checkout must follow checkin. Unknown fields fail validation.

Dates are forwarded as Airbnb listing-page `check_in` and `check_out` parameters and included in the cache key. Forwarding dates does not guarantee that Airbnb embeds a usable price quote.

## Output and unknown values

The response includes `listing`, `reviews_summary`, `host_summary`, and `_source: "public"`. Descriptive fields and amenities are parsed when present. Missing numeric price, capacity, bedroom/bathroom and review data is `null`, rather than a fabricated zero. Bathroom fractions such as 1.5 are preserved.

Modern public listing pages often do not expose a nightly price. The honest representation is:

```json
{
  "price_per_night": null,
  "currency": null
}
```

Use [search](./airbnb_search.md) to obtain a separately parsed quote; never merge an unknown listing price into a claim that a property is free. Missing rating categories are null; the entire `by_category` object is omitted when no categories are available. Unknown superhost status is null, not false. Unknown host name/joined values are empty strings. `joined` may contain a reported duration such as `"4 years hosting"`, not an exact account creation date. Optional review excerpts, response rate/time and languages appear only when present in the supported legacy page structure.

This is not a real-time quote including taxes, fees or booking eligibility. Data can be cached or incomplete. No actions occur on a host account.

## Failures and validation

Unknown embedded JSON structures produce `ParseFailed`; malformed external values cannot throw past the parser boundary. HTTP, transport and rate-limit failures surface as MCP tool errors. Outputs are validated against the registered schema.

- [Schema](../../src/tools/listing-details/schema.ts)
- [Handler](../../src/tools/listing-details/handler.ts)
- [Parser](../../src/parsers/airbnb-public.ts)
- [Synthetic unknown-data/date/cache scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)
