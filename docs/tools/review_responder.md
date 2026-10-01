# review_responder

Sample review drafts and conservative escalation. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `review_id`: nonempty identifier, at most 200 characters.
- `review_text`: nonempty text, at most 16,000 characters.
- `rating`: integer 1–5.
- `host_voice`: `warm` (default) or `professional`.

Sentiment uses the star rating and a small English/German keyword heuristic. A concern keyword overrides ratings 3–5 to `mixed`. All ratings ≤2, and any matched concern keyword at any rating, set `needs_escalation: true`. `approval_required: true` applies even when escalation is false. The draft is returned for review; it is never posted.

The heuristic cannot interpret arbitrary language, negation, sarcasm or unlisted safety issues. Escalation flags must supplement human review. Drafts must not claim that repairs or investigations have happened unless the host verifies that fact.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "review_id": "demo-review",
  "review_text": "The place was dirty and the wifi was broken.",
  "rating": 2,
  "host_voice": "warm"
}
```

Output:

```json
{
  "draft": "We're truly sorry your stay didn't meet expectations. Your feedback is taken seriously and we will review the issues you mentioned.",
  "approval_required": true,
  "sentiment": "negative",
  "needs_escalation": true,
  "_mock": true,
  "_pitch": "Auto-drafts review responses, flags escalation cases for human review",
  "escalation_reason": "Review mentions \"broken\" — manual review recommended."
}
```

## Source and validation

- [Schema](../../src/tools/review-responder/schema.ts)
- [Handler](../../src/tools/review-responder/handler.ts)
- [Fixture](../../src/mocks/review-responder.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
