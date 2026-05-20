# host_insights

> Surfaces revenue gaps vs local competitors and concrete pricing actions for
> a host's listing over a recent window.
> Status: **Demo (requires Airbnb Partner API)** — current implementation
> returns one of three deterministic fixtures based on `listing_id`.

## Purpose

`host_insights` is the agent's "how is my listing doing?" tool. Given a
`listing_id` and a time window, it returns occupancy, revenue, the gap to
local competitors, a small set of pricing recommendations, and a few prose
insights an agent can read out to the host. It is the natural starting point
for a host-facing conversation before drilling into
[`smart_pricing`](./smart_pricing.md) or
[`calendar_optimizer`](./calendar_optimizer.md).

## Input schema

```ts
{
  listing_id: string;                                  // required
  period?: "last_30d" | "last_90d" | "last_year";      // default "last_30d"
}
```

Source: [`src/tools/host-insights/schema.ts`](../../src/tools/host-insights/schema.ts).

## Output shape

```jsonc
{
  "occupancy_rate": 0.52,                  // 0..1
  "revenue_eur": 3120,
  "competitor_avg_revenue_eur": 4480,
  "delta_pct": -30.4,                      // signed
  "pricing_recommendations": [
    {
      "date_range": "2026-05-15..2026-05-22",
      "current": 89,                       // current nightly EUR
      "suggested": 119,                    // proposed nightly EUR
      "reason": "Mid-week dip + local trade fair drives demand"
    }
  ],
  "insights": [
    "Occupancy 30% below local benchmark — pricing is too rigid...",
    "Competitor avg nightly: 112 EUR. You charge 89 EUR flat...",
    "Recommend: enable smart_pricing tool for daily price tuning."
  ],
  "_mock": true,
  "_pitch": "Surfaces revenue gaps and concrete pricing actions per listing"
}
```

## Example

### Agent prompt

> "How is listing 12345 doing in the last 30 days vs the local market?"

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "host_insights",
    "arguments": {
      "listing_id": "12345",
      "period": "last_30d"
    }
  }
}
```

### Response (one of three deterministic fixtures: under-performing profile)

```jsonc
{
  "occupancy_rate": 0.52,
  "revenue_eur": 3120,
  "competitor_avg_revenue_eur": 4480,
  "delta_pct": -30.4,
  "pricing_recommendations": [
    {
      "date_range": "2026-05-15..2026-05-22",
      "current": 89,
      "suggested": 119,
      "reason": "Mid-week dip + local trade fair drives demand"
    },
    {
      "date_range": "2026-05-23..2026-05-31",
      "current": 89,
      "suggested": 99,
      "reason": "Weekend uplift, competition averaging 105 EUR"
    }
  ],
  "insights": [
    "Occupancy 30% below local benchmark — pricing is too rigid for weekday/weekend split.",
    "Competitor avg nightly: 112 EUR. You charge 89 EUR flat. Loss estimated at 1.4K EUR/30d.",
    "Recommend: enable smart_pricing tool for daily price tuning."
  ],
  "_mock": true,
  "_pitch": "Surfaces revenue gaps and concrete pricing actions per listing"
}
```

The fixture profile (under-performing / at-market / over-performing) is
chosen deterministically from the `listing_id` hash, so the same id always
returns the same numbers across calls — useful for demos and tests. Full
fixture data: [`src/mocks/host-insights.fixture.ts`](../../src/mocks/host-insights.fixture.ts).

## Edge cases & failure modes

- **Demo data only** — `_mock: true` is always set. Real Partner-API
  integration would pull the host's actual reservation history and an
  aggregated comp-set from Airbnb's market explorer.
- **Invalid `period`** → `ValidationFailed` returned to the caller before the
  handler runs.
- **Unknown `listing_id`** → still returns a fixture (the hash always maps
  somewhere). A real implementation would return `NotImplemented` or an
  upstream 404.

## Performance characteristics

- **Cache TTL**: none (pure compute, deterministic).
- **Rate-limited**: no.
- **Typical p95 latency**: <2 ms (fixture lookup).

## When to use

- ✅ Best for: opening a host-coaching conversation, demos of the agent's
  pricing-advisor capability, integration testing of downstream tools that
  consume insights output.
- ❌ Not for: real revenue reporting, anything a host would put in their
  books — the numbers are illustrative.

## See also

- Source: [`src/tools/host-insights/`](../../src/tools/host-insights/)
- Schema: [`src/tools/host-insights/schema.ts`](../../src/tools/host-insights/schema.ts)
- Fixture: [`src/mocks/host-insights.fixture.ts`](../../src/mocks/host-insights.fixture.ts)
- Related tools: [`smart_pricing`](./smart_pricing.md),
  [`calendar_optimizer`](./calendar_optimizer.md),
  [`review_responder`](./review_responder.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
