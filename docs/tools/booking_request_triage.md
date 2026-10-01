# booking_request_triage

Checks explicit property rules against a requested stay. Provided mode returns auditable policy checks, not a pseudo-precise guest trust score.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `thread_id`: nonempty ID up to 200 characters.
- `guest_profile`: `joined` real date, `reviews` 0–100,000 integer, `verified` boolean, optional `rating` 0–5. Joined dates after the UTC reference date fail validation. These are caller assertions, not an identity verification performed here.
- `trip`: `adults` 1–100, `children` 0–100, `pets` boolean, `nights` 1–365, optional `reason` up to 4,000 characters.
- `reference_date`: optional date; provided default is the UTC date of `host_data.as_of`.
- Optional `host_data.policy` fields: `max_guests`, `min_nights`, `pets_allowed`, `events_allowed`. Optional `events_requested` states actual event context.

Capacity includes adults + children. Any failed rule has precedence over profile history and produces `decline_after_review`. Unknown required rules or event context, ambiguous/negated event text, and incomplete source data produce `review`; all known passing rules produce `accept_after_review`. No recommendation executes a booking decision. `approval_required` is always true; `risk_score` is null and `score_basis` is `explicit_policy_checks`.

Event terms in free text are conservative concern signals. Explicit event requests cannot be negated away. Contradictory/negated text is uncertain, never a policy pass. These patterns are not a reliable natural-language classifier. A long trip reason gives no trust bonus. Legacy demo scores remain illustrative and cannot validate listing rules.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "thread_id": "synthetic-thread",
  "guest_profile": {
    "joined": "2018-01-01",
    "reviews": 100,
    "rating": 4.99,
    "verified": true
  },
  "trip": {
    "adults": 20,
    "children": 0,
    "pets": false,
    "nights": 3
  },
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "complete": true,
    "policy": {
      "max_guests": 4,
      "min_nights": 2,
      "pets_allowed": false,
      "events_allowed": false
    },
    "events_requested": false
  }
}
```

Selected output fields (the full result also includes evidence and other validated fields):

```json
{
  "_source": "provided",
  "_mock": false,
  "risk_score": null,
  "score_basis": "explicit_policy_checks",
  "recommendation": "decline_after_review",
  "red_flags": [
    "Rule failed: capacity"
  ],
  "approval_required": true
}
```

## External prerequisites and acceptance

Source authenticity, actual booking decisions and account operations require an authorized booking integration.

- [Schema](../../src/tools/booking-request-triage/schema.ts)
- [Handler](../../src/tools/booking-request-triage/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
