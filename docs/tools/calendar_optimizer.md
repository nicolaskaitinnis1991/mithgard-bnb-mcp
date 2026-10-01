# calendar_optimizer

Illustrative calendar gaps. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `listing_id`: nonempty identifier, at most 200 characters.
- `horizon_days`: exactly 30 (default), 60, or 90.
- `reference_date`: optional real `YYYY-MM-DD`; defaults to current UTC date.

The listing/horizon hash generates 3–5 synthetic, nonoverlapping gaps within the requested horizon. Each `end` is exclusive; `nights` equals the date difference. This tool does not read availability or bookings. Its example gaps remain synthetic even if the real property is fully booked.

Suggestions cycle through `discount`, `min_stay_relax` and `block`. `potential_recovery_eur` sums costs only for gaps that are not proposed for blocking. This is an illustrative upper bound, not guaranteed recoverable revenue. No calendar changes occur.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "listing_id": "12345",
  "horizon_days": 30,
  "reference_date": "2026-10-01"
}
```

Output:

```json
{
  "gaps": [
    {
      "start": "2026-10-08",
      "end": "2026-10-10",
      "nights": 2,
      "cost_estimate_eur": 206,
      "suggestion": "discount"
    },
    {
      "start": "2026-10-12",
      "end": "2026-10-15",
      "nights": 3,
      "cost_estimate_eur": 318,
      "suggestion": "min_stay_relax"
    },
    {
      "start": "2026-10-17",
      "end": "2026-10-20",
      "nights": 3,
      "cost_estimate_eur": 327,
      "suggestion": "discount"
    },
    {
      "start": "2026-10-22",
      "end": "2026-10-24",
      "nights": 2,
      "cost_estimate_eur": 186,
      "suggestion": "block"
    },
    {
      "start": "2026-10-26",
      "end": "2026-10-29",
      "nights": 3,
      "cost_estimate_eur": 363,
      "suggestion": "min_stay_relax"
    }
  ],
  "reference_date": "2026-10-01",
  "potential_recovery_eur": 1214,
  "_mock": true,
  "_pitch": "Surfaces calendar gaps and concrete actions to recover lost nights"
}
```

## Source and validation

- [Schema](../../src/tools/calendar-optimizer/schema.ts)
- [Handler](../../src/tools/calendar-optimizer/handler.ts)
- [Fixture](../../src/mocks/calendar-optimizer.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
