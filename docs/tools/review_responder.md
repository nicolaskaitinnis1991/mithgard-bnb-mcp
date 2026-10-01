# review_responder

Drafts an EN/DE review reply while prioritizing detected or supplied concerns over the star rating. No review reply is published.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `review_id`: nonempty ID up to 200 characters; `review_text`: 1–16,000 trimmed characters.
- `rating`: integer 1–5; `host_voice`: `warm` (default) or `professional`.
- `host_data.language`: `en` or `de` (required).
- Optional `concerns`: up to 20 supplied concerns, at most 200 characters each.
- Optional `completed_actions`: up to 10 `{description, confirmed: true}` records, description at most 500 characters. False/missing confirmations fail validation. These are caller assertions, not independently verified repair completion.

Finite patterns detect some electrical hazards, safety concerns and condition complaints. Any detected/supplied concern requires escalation even at five stars, and yields `mixed` sentiment for ratings >=3. Ratings <=2 also require escalation. Escalating drafts acknowledge concerns and future review; they do not invent an investigation, refund or completed repair. Only explicitly supplied confirmed actions can be stated as completed. `concerns`, `classification_limits`, `needs_escalation`, and conditional `escalation_reason` are visible.

Classification is non-exhaustive and cannot reliably handle negation, sarcasm or arbitrary languages. Positive stars do not establish that a stay was enjoyable; the draft thanks the reviewer without adding property facts. Every reply requires `approval_required: true` and host review.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "review_id": "synthetic-review",
  "review_text": "Five stars but dangerous exposed electrical wires.",
  "rating": 5,
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "complete": true,
    "language": "en"
  }
}
```

Selected output fields (the full result also includes evidence and other validated fields):

```json
{
  "_source": "provided",
  "_mock": false,
  "sentiment": "mixed",
  "needs_escalation": true,
  "concerns": [
    "electrical_safety",
    "safety"
  ],
  "approval_required": true,
  "draft": "Thank you for your feedback. We take your concerns seriously and will review the points you raised."
}
```

## External prerequisites and acceptance

Publishing a reply and evaluating open-ended language interpretation need a separate authorized integration and real review evaluation.

- [Schema](../../src/tools/review-responder/schema.ts)
- [Handler](../../src/tools/review-responder/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
