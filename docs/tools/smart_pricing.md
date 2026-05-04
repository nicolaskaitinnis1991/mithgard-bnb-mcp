# smart_pricing (DEMO)

> Requires Airbnb Partner API. Mock implementation derives a deterministic per-listing base + weekday + seasonal factors.

**Pitch:** Per-day pricing with explainable factors.

## Input

```json
{ "listing_id": "12345", "from": "2026-06-01", "to": "2026-06-14" }
```

Horizon capped at 30 days for sanity.

## Output

Each day has a `suggested` price plus `reasons` like "Weekend uplift (+25 EUR)" and "High-season factor (×1.15)". Summary contains average and total revenue estimate.
