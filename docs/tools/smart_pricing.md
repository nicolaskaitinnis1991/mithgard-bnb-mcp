# smart_pricing

Calculates bounded suggestions from supplied base prices and owner-defined factors. No price is changed and no market demand is fetched.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `listing_id`: nonempty ID up to 200 characters; no hash influences provided prices.
- `from`, `to`: inclusive real dates, ordered, at most 30 dates.
- `host_data.nights`: at most 366 distinct nightly records; only explicitly `available` nights are priced.
- Required `min_price`, `max_price` must be ordered. A nightly `price` takes precedence over optional explicit `base_price`. Without either, the date is skipped as `missing_price`.
- Optional `weekday_factors`: exactly seven factors, Sunday index 0 through Saturday index 6. Optional `date_factors`: at most 30 unique `{date, factor}` records. Factors are 0.1–5; absent factors are 1.

Suggestion = base × weekday factor × date factor, rounded to cents and clamped to supplied bounds. Reasons state these actual supplied inputs. Booked, owner-blocked, cancelled, absent and unknown nights are not priced. `skipped_dates` distinguishes the causes. Missing baselines/unknown dates make evidence incomplete. `current` is the supplied baseline, not a read of the channel's current price. Zero baseline omits the undefined percentage delta.

`currency` is preserved without conversion. `summary.total_revenue_estimate` sums only calculated suggestions assuming **every suggested night is booked before fees** (`estimate_basis: all_nights_booked_before_fees`); it is not an occupancy/demand/revenue forecast. Empty suggestions give total 0 and `avg_suggested: null`. In demo mode, both base and factors are synthetic.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "listing_id": "synthetic-property",
  "from": "2026-06-01",
  "to": "2026-06-02",
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "GBP",
    "complete": true,
    "nights": [
      {
        "date": "2026-06-01",
        "state": "available",
        "price": 100
      },
      {
        "date": "2026-06-02",
        "state": "booked"
      }
    ],
    "min_price": 80,
    "max_price": 120,
    "date_factors": [
      {
        "date": "2026-06-01",
        "factor": 1.25
      }
    ]
  }
}
```

Selected output fields (the full result also includes evidence and other validated fields):

```json
{
  "_source": "provided",
  "_mock": false,
  "currency": "GBP",
  "daily_prices": [
    {
      "date": "2026-06-01",
      "current": 100,
      "suggested": 120,
      "delta_pct": 20
    }
  ],
  "skipped_dates": [
    {
      "date": "2026-06-02",
      "reason": "booked"
    }
  ],
  "estimate_basis": "all_nights_booked_before_fees",
  "summary": {
    "avg_suggested": 120,
    "total_revenue_estimate": 120
  }
}
```

## External prerequisites and acceptance

Live market data, occupancy forecasting and actual channel price writes are separate integration/evaluation tasks.

- [Schema](../../src/tools/smart-pricing/schema.ts)
- [Handler](../../src/tools/smart-pricing/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
