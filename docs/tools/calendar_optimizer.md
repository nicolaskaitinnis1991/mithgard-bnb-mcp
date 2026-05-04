# calendar_optimizer (DEMO)

> Requires Airbnb Partner API. Mock implementation produces 3-5 deterministic gaps based on `listing_id` + `horizon_days`.

**Pitch:** Surfaces calendar gaps and concrete actions to recover lost nights.

## Input

```json
{ "listing_id": "12345", "horizon_days": 30 }
```

`horizon_days` must be 30, 60, or 90 (default 30).

## Output

Each gap has start/end/nights, a `cost_estimate_eur`, and a `suggestion` (discount, min_stay_relax, or block). `potential_recovery_eur` is the sum of cost estimates.
