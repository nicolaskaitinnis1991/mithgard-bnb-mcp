# smart_pricing

> Per-day pricing suggestions over a window, with explainable per-day reasons
> (weekday uplift, season factor) and a summary average + total.
> Status: **Demo (requires Airbnb Partner API)** — current implementation
> applies deterministic weekday + seasonal factors to a per-listing base
> price.

## Purpose

`smart_pricing` answers "what should I charge per night over the next N
days?" with one row per date plus the reasons behind each number. Unlike
opaque dynamic-pricing tools, every suggestion carries its drivers (e.g.
"Weekend uplift (+25 EUR)", "High-season factor (×1.15)") so an agent can
narrate the recommendation to the host. Typically called after
[`host_insights`](./host_insights.md) flags pricing as too rigid, or
chained with [`calendar_optimizer`](./calendar_optimizer.md) to fill
specific gaps.

## Input schema

```ts
{
  listing_id: string;                 // required
  from: string;                       // ISO date "YYYY-MM-DD", inclusive
  to: string;                         // ISO date "YYYY-MM-DD", inclusive
}
```

Source: [`src/tools/smart-pricing/schema.ts`](../../src/tools/smart-pricing/schema.ts).

**Horizon is capped at 30 days** (`MAX_HORIZON_DAYS` in
[`src/mocks/smart-pricing.fixture.ts`](../../src/mocks/smart-pricing.fixture.ts)).
A `from`→`to` span longer than 30 days is silently truncated to the first
30 days from `from`.

## Pricing formula (deterministic)

```
base               = 70 + (fnv1a(listing_id) % 81)         // 70..150 EUR
seasonal[month]    = { Jan/Feb: 0.85, Mar: 0.95, Apr: 1.05, May: 1.10,
                       Jun/Jul: 1.20, Aug: 1.05, Sep: 1.00,
                       Oct: 0.90, Nov: 1.10, Dec: 1.10 }
weekday_uplift[d]  = { Sun/Mon/Tue: 0, Wed: +5, Thu: +15, Fri/Sat: +25 }
suggested(date)    = round( (base + weekday_uplift[date.dow]) * seasonal[date.month] )
```

`reasons[]` per day is built from whichever factors are non-trivial.

## Output shape

```jsonc
{
  "daily_prices": [
    {
      "date": "2026-06-01",
      "suggested": 138,
      "reasons": ["Off-peak weekday baseline", "High-season factor (×1.20)"]
    }
    // ... one per day, up to 30
  ],
  "summary": {
    "avg_suggested": 152,
    "total_revenue_estimate": 4560
  },
  "_mock": true,
  "_pitch": "Per-day pricing with explainable factors"
}
```

Note: `current` and `delta_pct` per day are declared in the schema as
optional but the current fixture never emits them. A real implementation
fed by host calendars would include them so the agent can frame "you charge
89, suggested 119, +34%".

## Example

### Agent prompt

> "Suggest prices for listing 12345 from June 1 through June 14, 2026."

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "smart_pricing",
    "arguments": {
      "listing_id": "12345",
      "from": "2026-06-01",
      "to": "2026-06-14"
    }
  }
}
```

### Response (representative, first few days shown)

```jsonc
{
  "daily_prices": [
    {
      "date": "2026-06-01",
      "suggested": 138,
      "reasons": ["Off-peak weekday baseline", "High-season factor (×1.20)"]
    },
    {
      "date": "2026-06-02",
      "suggested": 138,
      "reasons": ["Off-peak weekday baseline", "High-season factor (×1.20)"]
    },
    {
      "date": "2026-06-03",
      "suggested": 144,
      "reasons": ["Weekday uplift (+5 EUR)", "High-season factor (×1.20)"]
    },
    {
      "date": "2026-06-04",
      "suggested": 156,
      "reasons": ["Weekday uplift (+15 EUR)", "High-season factor (×1.20)"]
    },
    {
      "date": "2026-06-05",
      "suggested": 168,
      "reasons": ["Weekend uplift (+25 EUR)", "High-season factor (×1.20)"]
    },
    {
      "date": "2026-06-06",
      "suggested": 168,
      "reasons": ["Weekend uplift (+25 EUR)", "High-season factor (×1.20)"]
    }
    // ... 8 more days
  ],
  "summary": {
    "avg_suggested": 152,
    "total_revenue_estimate": 2128
  },
  "_mock": true,
  "_pitch": "Per-day pricing with explainable factors"
}
```

Exact `base` price varies per `listing_id` via hash; the same id always
returns the same numbers.

## Edge cases & failure modes

- **Demo data only** — `_mock: true` always set. A real implementation would
  factor competitor live-pricing, local events, lead-time, and the listing's
  recent booking history.
- **Window > 30 days** → silently truncated to 30 days from `from`. No
  warning emitted; document this in any UI that surfaces the tool.
- **Window with `to` before `from`** → `dayDiff` returns negative, then
  `Math.max(1, ...)` floors it to 1, producing a single-day output. Caller
  should validate ordering.
- **No `current` price** → fixture omits the optional `current` and
  `delta_pct` fields (real implementation would populate them from host
  calendar).

## Performance characteristics

- **Cache TTL**: none (pure compute).
- **Rate-limited**: no.
- **Typical p95 latency**: <2 ms for a 30-day window.

## When to use

- ✅ Best for: weekly/monthly host pricing reviews, demos of an explainable
  pricing advisor, chaining with `calendar_optimizer` to price a specific
  gap, integration tests of agent-driven pricing UIs.
- ❌ Not for: real revenue management — the seasonal curve is a fixed
  global table, not market-aware. Not for hyper-short horizons (1-2 days)
  where dynamic competitor pricing dominates over weekday/season factors.

## See also

- Source: [`src/tools/smart-pricing/`](../../src/tools/smart-pricing/)
- Schema: [`src/tools/smart-pricing/schema.ts`](../../src/tools/smart-pricing/schema.ts)
- Fixture: [`src/mocks/smart-pricing.fixture.ts`](../../src/mocks/smart-pricing.fixture.ts)
- Related tools: [`host_insights`](./host_insights.md),
  [`calendar_optimizer`](./calendar_optimizer.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
