# calendar_optimizer

> Surfaces 3-5 specific calendar gaps within a horizon and proposes a concrete
> action per gap (discount / relax min-stay / block).
> Status: **Demo (requires Airbnb Partner API)** — current implementation
> generates deterministic gaps from the `listing_id`/`horizon_days` hash.

## Purpose

`calendar_optimizer` answers "where am I leaving money on the table in the
next 30/60/90 days?". It returns a small set of unbooked windows with a
nightly-cost estimate per window and an action recommendation. The agent
uses the output to push the host toward decisions — drop the price, relax
the 3-night minimum, or just block the date if the host has personal use.
Naturally chains with [`smart_pricing`](./smart_pricing.md) (to price the
gap days specifically) or [`host_insights`](./host_insights.md) (to
benchmark whether the gaps are an outlier).

## Input schema

```ts
{
  listing_id: string;                                // required
  horizon_days?: 30 | 60 | 90;                       // default 30
}
```

`horizon_days` is constrained to exactly three literal values.

Source: [`src/tools/calendar-optimizer/schema.ts`](../../src/tools/calendar-optimizer/schema.ts).

## Output shape

```jsonc
{
  "gaps": [
    {
      "start": "2026-05-10",
      "end": "2026-05-12",
      "nights": 2,
      "cost_estimate_eur": 196,
      "suggestion": "discount"        // discount | min_stay_relax | block
    }
  ],
  "potential_recovery_eur": 1240,     // sum of cost_estimate_eur across gaps
  "_mock": true,
  "_pitch": "Surfaces calendar gaps and concrete actions to recover lost nights"
}
```

Number of gaps: `3 + (hash(listing_id:horizon_days) % 3)` → always 3-5.
Each gap's `nights` is 1-4, `nightly` estimate 90-121 EUR, `suggestion`
cycles through `discount → min_stay_relax → discount → block → min_stay_relax`.

## Example

### Agent prompt

> "Show me the gaps in the next 30 days for listing 12345 and what to do
> about them."

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "calendar_optimizer",
    "arguments": {
      "listing_id": "12345",
      "horizon_days": 30
    }
  }
}
```

### Response (representative — exact values depend on `listing_id` hash)

```jsonc
{
  "gaps": [
    {
      "start": "2026-05-10",
      "end": "2026-05-12",
      "nights": 2,
      "cost_estimate_eur": 196,
      "suggestion": "discount"
    },
    {
      "start": "2026-05-18",
      "end": "2026-05-22",
      "nights": 4,
      "cost_estimate_eur": 416,
      "suggestion": "min_stay_relax"
    },
    {
      "start": "2026-05-27",
      "end": "2026-05-28",
      "nights": 1,
      "cost_estimate_eur": 101,
      "suggestion": "discount"
    }
  ],
  "potential_recovery_eur": 713,
  "_mock": true,
  "_pitch": "Surfaces calendar gaps and concrete actions to recover lost nights"
}
```

## Edge cases & failure modes

- **Demo data only** — `_mock: true` always set. Real implementation would
  read the host's actual blocked/unbooked dates from the Calendar API and
  compute recovery against the host's listed nightly price.
- **`horizon_days` other than 30/60/90** → `ValidationFailed` returned
  before the handler runs.
- **All dates booked in real world** → the demo will still emit 3-5
  fixture gaps (it doesn't see real bookings). Real version would return
  `gaps: []` with `potential_recovery_eur: 0`.
- **`suggestion: block`** is intentionally in the rotation to remind hosts
  that "do nothing / take the night for myself" is a valid answer too.

## Performance characteristics

- **Cache TTL**: none (pure compute, deterministic).
- **Rate-limited**: no.
- **Typical p95 latency**: <1 ms.

## When to use

- ✅ Best for: a host-coaching nudge ("you have 4 nights open next week —
  here's what to do"), chaining into `smart_pricing` to price those specific
  days, end-to-end agent demos that combine reasoning across tools.
- ❌ Not for: real availability data (no live calendar). Not for sub-daily
  granularity. Not for very long horizons (>90 days; intentionally capped).

## See also

- Source: [`src/tools/calendar-optimizer/`](../../src/tools/calendar-optimizer/)
- Schema: [`src/tools/calendar-optimizer/schema.ts`](../../src/tools/calendar-optimizer/schema.ts)
- Fixture: [`src/mocks/calendar-optimizer.fixture.ts`](../../src/mocks/calendar-optimizer.fixture.ts)
- Related tools: [`smart_pricing`](./smart_pricing.md),
  [`host_insights`](./host_insights.md),
  [`turnover_coordinator`](./turnover_coordinator.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
