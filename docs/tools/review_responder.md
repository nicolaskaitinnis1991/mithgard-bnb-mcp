# review_responder

> Drafts a host-voiced review response keyed to the rating + sentiment, and
> flags escalation cases for human review.
> Status: **Demo (requires Airbnb Partner API)** — current implementation
> picks one of 8 templates by sentiment × host-voice and runs a keyword scan
> for escalation triggers.

## Purpose

`review_responder` writes the host's reply to a guest review. It classifies
sentiment from the star rating (with a keyword override for "mixed"), picks
one of two host-voice flavours (warm / professional), and — critically —
flags reviews that warrant a human-only response so the agent doesn't
glibly auto-reply to "the place was unsafe and the host was rude." Pairs
with [`host_insights`](./host_insights.md) when an agent is doing a
periodic review-tone sweep.

## Input schema

```ts
{
  review_id: string;                                 // required
  review_text: string;                               // required, non-empty
  rating: 1 | 2 | 3 | 4 | 5;                         // star rating
  host_voice?: "warm" | "professional";              // default "warm"
}
```

Source: [`src/tools/review-responder/schema.ts`](../../src/tools/review-responder/schema.ts).

## Sentiment classification

| Rating | Has escalation keyword | Sentiment   |
|--------|------------------------|-------------|
| 5      | no                     | `positive`  |
| 5      | yes                    | `positive`  |
| 4      | no                     | `positive`  |
| 4      | yes                    | `mixed`     |
| 3      | —                      | `neutral`   |
| 1-2    | —                      | `negative`  |

Escalation keywords (case-insensitive substring scan):
`refund`, `broken`, `dirty`, `noise`, `mold`, `unsafe`, `rude`.

`needs_escalation` is `true` only when **rating ≤ 2 AND text contains at
least one escalation keyword**. A 4-star review mentioning "dirty" becomes
`mixed` sentiment but does not escalate.

## Output shape

```jsonc
{
  "draft": "...",                       // single-paragraph reply
  "sentiment": "positive",              // positive | neutral | negative | mixed
  "needs_escalation": false,
  "escalation_reason": "Negative review mentions \"dirty\" — manual review recommended.", // only when needs_escalation
  "_mock": true,
  "_pitch": "Auto-drafts review responses, flags escalation cases for human review"
}
```

## Example

### Agent prompt

> "Draft a warm response to this 2-star review: 'The place was dirty and the
> wifi was broken.'"

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "review_responder",
    "arguments": {
      "review_id": "rev-7782",
      "review_text": "The place was dirty and the wifi was broken.",
      "rating": 2,
      "host_voice": "warm"
    }
  }
}
```

### Response (escalation case)

```jsonc
{
  "draft": "We're truly sorry your stay didn't meet expectations. Your feedback is taken seriously and we're already looking into the issues you mentioned.",
  "sentiment": "negative",
  "needs_escalation": true,
  "escalation_reason": "Negative review mentions \"dirty\" — manual review recommended.",
  "_mock": true,
  "_pitch": "Auto-drafts review responses, flags escalation cases for human review"
}
```

Contrast — a 5-star review in warm voice:

```jsonc
{
  "draft": "Thank you so much for the kind words! It made our day to read your review — we hope to welcome you back soon.",
  "sentiment": "positive",
  "needs_escalation": false,
  "_mock": true,
  "_pitch": "Auto-drafts review responses, flags escalation cases for human review"
}
```

Full template list (8 entries: 4 sentiments × 2 voices) in
[`src/mocks/review-responder.fixture.ts`](../../src/mocks/review-responder.fixture.ts).

## Edge cases & failure modes

- **Demo data only** — `_mock: true` always set. A real implementation would
  use an LLM to generate a context-aware reply, ideally referencing
  specifics the guest mentioned, and would post via the Partner Reviews API
  after host approval.
- **`needs_escalation: true`** → the `draft` is still returned (the warm-tone
  apology template), but downstream code MUST gate on host review. The
  template is generic on purpose.
- **Multiple escalation keywords** → the first match found is reported in
  `escalation_reason`.
- **Mixed-sentiment edge** (4★ + escalation keyword) → `sentiment: "mixed"`,
  `needs_escalation: false`. Mixed template is gentler than negative.

## Performance characteristics

- **Cache TTL**: none (pure compute).
- **Rate-limited**: no.
- **Typical p95 latency**: <1 ms.

## When to use

- ✅ Best for: routine 4-5 star review responses (low-stakes), surfacing
  escalation cases to a host's inbox, demos showing escalation gating in
  agent workflows, host-coaching ("here's the tone you usually use").
- ❌ Not for: any 1-2 star auto-post. Don't bypass `needs_escalation`. Real
  hosts have lost superhost status over careless replies to bad reviews —
  see [`docs/limitations.md`](../limitations.md).

## See also

- Source: [`src/tools/review-responder/`](../../src/tools/review-responder/)
- Schema: [`src/tools/review-responder/schema.ts`](../../src/tools/review-responder/schema.ts)
- Fixture: [`src/mocks/review-responder.fixture.ts`](../../src/mocks/review-responder.fixture.ts)
- Related tools: [`host_insights`](./host_insights.md),
  [`guest_message_assistant`](./guest_message_assistant.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
