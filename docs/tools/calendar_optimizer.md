# calendar_optimizer

Finds contiguous runs of explicitly available nights and real minimum-stay conflicts in supplied calendar data. No calendar is synchronized or changed.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `listing_id`: nonempty ID up to 200 characters.
- `reference_date`: optional real date; provided default is the UTC date of `host_data.as_of`.
- `horizon_days`: 30 (default), 60 or 90; dates are calendar date keys in the source's timezone, without shifting their labels.
- `host_data.nights`: at most 366 distinct `{date, state, price?, revenue?}` records. `min_nights`: optional minimum stay, 1–365.

Only `available` creates a run. Booked/owner-blocked dates stop runs; absent/unknown/cancelled dates remain unknown and never become availability. A run bounded on both sides by actual booked dates is `orphan_gap`; otherwise it is `open_run`. `end` is exclusive. A run shorter than the supplied minimum stay yields `min_stay_conflict: true` and `suggestion: min_stay_relax`; missing rule means `null`/`review`, adequate length means `false`/`none`.

`opportunity_amount` sums only supplied nightly prices within that run, or is null if any price is missing. `opportunity_total` is null when the source/calendar is incomplete or any gap price is missing. It is conditional full-occupancy opportunity before fees, never observed loss or recoverable revenue. The legacy EUR aliases (`cost_estimate_eur`, `potential_recovery_eur`) are null for other currencies. No synthetic discounts, blocks or rates are introduced in provided mode.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "listing_id": "synthetic-property",
  "reference_date": "2026-06-01",
  "horizon_days": 30,
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "complete": true,
    "min_nights": 3,
    "nights": [
      {
        "date": "2026-06-01",
        "state": "booked"
      },
      {
        "date": "2026-06-02",
        "state": "available",
        "price": 100
      },
      {
        "date": "2026-06-03",
        "state": "available",
        "price": 100
      },
      {
        "date": "2026-06-04",
        "state": "booked"
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
  "gaps": [
    {
      "start": "2026-06-02",
      "end": "2026-06-04",
      "nights": 2,
      "gap_kind": "orphan_gap",
      "min_stay_conflict": true,
      "suggestion": "min_stay_relax",
      "opportunity_amount": 200
    }
  ],
  "opportunity_total": null
}
```

## External prerequisites and acceptance

The example deliberately supplies only four of thirty dates; evidence lists calendar_coverage and complete=false. Automatic calendar import/change needs an authorized provider.

- [Schema](../../src/tools/calendar-optimizer/schema.ts)
- [Handler](../../src/tools/calendar-optimizer/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
