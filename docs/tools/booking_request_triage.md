# booking_request_triage

Illustrative booking triage with required human review. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `thread_id`: nonempty identifier, at most 200 characters.
- `guest_profile`: real `joined` date, nonnegative integer `reviews`, `verified` boolean, optional 0–5 `rating`.
- `trip`: integer `adults` 1–100, integer `children` 0–100, `pets` boolean, integer `nights` 1–365, optional `reason` up to 4,000 characters.
- `reference_date`: optional real `YYYY-MM-DD`; defaults to current UTC date. `joined` cannot be later.

The uncalibrated demo score starts at 50. Account age, review count, ID verification, rating, group size, single-night stays and a supplied trip reason adjust it. This is a hand-coded illustrative heuristic, not a validated probability of harm or a policy engine. It does not know listing capacity, pet rules or the full conversation.

Scores ≤25 recommend `accept_after_review`; scores ≥75 recommend `decline_after_review`; other scores recommend `review`. Every output sets `approval_required: true`. No reservation is accepted or declined. Any future production use needs the host's explicit rules, appropriate policy review and human approval.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "thread_id": "demo-thread",
  "reference_date": "2026-10-01",
  "guest_profile": {
    "joined": "2026-09-01",
    "reviews": 0,
    "verified": false
  },
  "trip": {
    "adults": 2,
    "children": 0,
    "pets": false,
    "nights": 1
  }
}
```

Output:

```json
{
  "risk_score": 100,
  "approval_required": true,
  "reference_date": "2026-10-01",
  "recommendation": "decline_after_review",
  "reasoning": [],
  "red_flags": [
    "Account younger than 6 months (0.08 yr).",
    "No prior reviews on Airbnb.",
    "Identity not verified.",
    "Single-night stay (party-risk pattern)."
  ],
  "green_flags": [],
  "_mock": true,
  "_pitch": "Risk-scores guests with auditable reasoning, never auto-acts without approval"
}
```

## Source and validation

- [Schema](../../src/tools/booking-request-triage/schema.ts)
- [Handler](../../src/tools/booking-request-triage/handler.ts)
- [Fixture](../../src/mocks/booking-request-triage.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
