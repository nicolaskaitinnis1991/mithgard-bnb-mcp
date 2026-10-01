# host_insights

Calculates occupancy, recorded revenue, ADR and RevPAR from explicitly supplied nightly records. No account import, market feed or business action occurs.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `listing_id`: nonempty ID, at most 200 characters; it never influences provided metrics.
- `host_data.from`, `to`: real dates covering 1–366 nights; `to` is exclusive. This explicit reporting range is authoritative in provided mode. Legacy `period` and `reference_date` select/demo-label fixtures only.
- `host_data.nights`: at most 366 distinct `{date, state, price?, revenue?}` records within the reporting range. States: `available`, `booked`, `owner_block`, `cancelled`, `unknown`.
- Optional `benchmark`: `{revenue, currency, from, to, sample_size}`. Revenue is the supplied comparison revenue per property for the same reporting period; period/currency must match exactly. No comparable listings are fetched.

Occupancy is booked nights divided by booked + available nights. Owner blocks and cancelled records are excluded from offered nights. Revenue is summed only from booked-night `revenue`, never from advertised prices or cancelled records. ADR = recorded revenue / booked nights; RevPAR = recorded revenue / offered nights. Zero denominators produce `null`; an incomplete source or missing/unknown dates prevents aggregate metrics. Missing booked revenue leaves occupancy calculable but financial metrics `null`.

`revenue`, `adr`, `revpar` and `benchmark_revenue` use the supplied currency. Legacy `revenue_eur` and `competitor_avg_revenue_eur` aliases are `null` for non-EUR datasets. Missing benchmark means `delta_pct: null` and no market claim. No causal pricing recommendation is fabricated; `pricing_recommendations` is empty in provided mode.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "listing_id": "synthetic-property",
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "complete": true,
    "from": "2026-06-01",
    "to": "2026-06-03",
    "nights": [
      {
        "date": "2026-06-01",
        "state": "booked",
        "revenue": 100
      },
      {
        "date": "2026-06-02",
        "state": "owner_block"
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
  "occupancy_rate": 1,
  "revenue": 100,
  "adr": 100,
  "revpar": 100,
  "available_nights": 1,
  "occupied_nights": 1,
  "delta_pct": null,
  "pricing_recommendations": []
}
```

## External prerequisites and acceptance

Automatic account import and independently sourced comparable revenue need an authorized provider and actual datasets.

- [Schema](../../src/tools/host-insights/schema.ts)
- [Handler](../../src/tools/host-insights/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
