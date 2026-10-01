# smart_pricing

Explainable sample nightly prices. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `listing_id`: nonempty identifier, at most 200 characters.
- `from`, `to`: real `YYYY-MM-DD` dates, both inclusive.
- `to` must be on or after `from`; the inclusive span must be at most 30 days. Longer ranges fail validation rather than truncating silently.

The listing hash supplies a sample EUR base rate of 70–150. Weekday increments and a fixed global monthly table modify it. This has no local market, event, weather, booking or competitor data. `summary.total_revenue_estimate` is the sum of all suggested nights assuming they are all booked, before fees and costs; it is not an occupancy-adjusted revenue forecast. This assumption is explicit in `estimate_basis: "all_nights_booked_before_fees"`.

Monthly factors Jan→Dec: `0.85, 0.85, 0.95, 1.05, 1.10, 1.15, 1.20, 1.20, 1.05, 1.00, 0.90, 1.10`. Weekday increments: Sun/Mon/Tue 0, Wed +5, Thu +15, Fri/Sat +25 EUR. No prices are changed.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "listing_id": "12345",
  "from": "2026-10-01",
  "to": "2026-10-03"
}
```

Output:

```json
{
  "daily_prices": [
    {
      "date": "2026-10-01",
      "suggested": 127,
      "reasons": [
        "Weekday uplift (+15 EUR)"
      ]
    },
    {
      "date": "2026-10-02",
      "suggested": 137,
      "reasons": [
        "Weekend uplift (+25 EUR)"
      ]
    },
    {
      "date": "2026-10-03",
      "suggested": 137,
      "reasons": [
        "Weekend uplift (+25 EUR)"
      ]
    }
  ],
  "currency": "EUR",
  "estimate_basis": "all_nights_booked_before_fees",
  "summary": {
    "avg_suggested": 134,
    "total_revenue_estimate": 401
  },
  "_mock": true,
  "_pitch": "Per-day pricing with explainable factors"
}
```

## Source and validation

- [Schema](../../src/tools/smart-pricing/schema.ts)
- [Handler](../../src/tools/smart-pricing/handler.ts)
- [Fixture](../../src/mocks/smart-pricing.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
