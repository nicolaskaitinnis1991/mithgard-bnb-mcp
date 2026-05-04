# host_insights (DEMO)

> Requires Airbnb Partner API. Current implementation returns deterministic mock fixtures keyed by `listing_id`.

**Pitch:** Surfaces revenue gaps and concrete pricing actions per listing.

## Input

```json
{
  "listing_id": "12345",
  "period": "last_30d"
}
```

- `listing_id` (required, string)
- `period` (optional, default `last_30d`): `last_30d` | `last_90d` | `last_year`

## Output

```jsonc
{
  "occupancy_rate": 0.52,
  "revenue_eur": 3120,
  "competitor_avg_revenue_eur": 4480,
  "delta_pct": -30.4,
  "pricing_recommendations": [
    { "date_range": "...", "current": 89, "suggested": 119, "reason": "..." }
  ],
  "insights": ["..."],
  "_mock": true,
  "_pitch": "Surfaces revenue gaps and concrete pricing actions per listing"
}
```

## Determinism

Same `listing_id` + `period` always returns the same fixture (one of 3 profiles: under-performing / at-market / over-performing).
