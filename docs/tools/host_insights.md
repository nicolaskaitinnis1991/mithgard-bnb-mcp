# host_insights

Illustrative performance dashboard. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `listing_id`: nonempty identifier, at most 200 characters.
- `period`: `last_30d` (default), `last_90d`, or `last_year`.
- `reference_date`: optional real `YYYY-MM-DD`; defaults to the current UTC date.

The listing/period hash selects one of three sample performance profiles. Revenue and competitor numbers are synthetic, not observations. Recommendation dates are relative to `reference_date`. Periods do not calculate actual historical revenue.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "listing_id": "12345",
  "period": "last_30d",
  "reference_date": "2026-10-01"
}
```

Output:

```json
{
  "occupancy_rate": 0.71,
  "revenue_eur": 4280,
  "competitor_avg_revenue_eur": 4350,
  "delta_pct": -1.6,
  "pricing_recommendations": [
    {
      "date_range": "2026-10-08..2026-10-15",
      "current": 109,
      "suggested": 119,
      "reason": "Sold-out competitors within 1km — small uplift safe"
    }
  ],
  "insights": [
    "Listing performs at market. Small upside via event-based pricing.",
    "Average daily rate within 2% of competitors.",
    "Recommend: monitor calendar gaps via calendar_optimizer."
  ],
  "reference_date": "2026-10-01",
  "_mock": true,
  "_pitch": "Surfaces revenue gaps and concrete pricing actions per listing"
}
```

## Source and validation

- [Schema](../../src/tools/host-insights/schema.ts)
- [Handler](../../src/tools/host-insights/handler.ts)
- [Fixture](../../src/mocks/host-insights.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
