# Public-data research example

This example explains the two public-page tools. It is not a current listing recommendation or a recorded live session. The automated regression suite uses saved May 2026 HTML and stubbed transport; it sends no load to Airbnb.

## Search

A host can ask: “Show public listings in Berlin for two adults, October 10–15, 2026, with EUR quotes.”

```json
{
  "method": "tools/call",
  "params": {
    "name": "airbnb_search",
    "arguments": {
      "location": "Berlin",
      "checkin": "2026-10-10",
      "checkout": "2026-10-15",
      "adults": 2,
      "currency": "EUR"
    }
  }
}
```

The requested dates/currency participate in the upstream URL and cache key. Results are a first-page public-data sample. The agent must inspect `price_basis` before describing a display price as nightly. A saved fixture contains a €736 total with explicit 5 nights × €147.17 evidence; the corrected parser represents these separately. If it cannot establish a nightly price, it returns null.

[Search input/output contract](../docs/tools/airbnb_search.md).

## Listing details

The agent can call `airbnb_listing_details` with a numeric ID obtained from search, and optionally the same date pair. A modern listing page may expose descriptive data but no nightly quote. `price_per_night: null` means unavailable, not €0. Missing review categories and capacities remain unknown. The agent must describe limitations and use verified public fields rather than filling them in.

```json
{
  "method": "tools/call",
  "params": {
    "name": "airbnb_listing_details",
    "arguments": {
      "listing_id": "1867179",
      "checkin": "2026-10-10",
      "checkout": "2026-10-15"
    }
  }
}
```

[Listing details contract](../docs/tools/airbnb_listing_details.md).

## Failures and freshness

A novel page structure produces a parse error; it must not be presented as zero availability. Returned public data can be cached, incomplete or changed upstream. No booking or host-account write is supported. For synthetic host workflows and approval examples, see [agent conversations](./agent-conversation.md).
