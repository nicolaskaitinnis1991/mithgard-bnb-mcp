# booking_request_triage

> Risk-scores a booking request from guest profile + trip facts, with
> auditable reasoning and red/green flags. Never auto-acts without host
> approval.
> Status: **Demo (requires Airbnb Partner API)** — current implementation
> computes a deterministic score from explicit signals.

## Purpose

`booking_request_triage` lets a host (or a host-side agent) get a quick
read on whether a new booking request looks safe to accept, risky enough
to manually review, or bad enough to decline. The score, recommendation,
red flags, and green flags are produced from explicit inputs — no opaque
model — so a host can audit every reason. Even when the recommendation is
`auto_accept` or `auto_decline`, downstream code is expected to gate on
host confirmation; the tool never side-effects.

## Input schema

```ts
{
  thread_id: string;                  // required
  guest_profile: {
    joined: string;                   // ISO date "YYYY-MM-DD"
    reviews: number;                  // int >= 0
    rating?: number;                  // 0..5 if present
    verified: boolean;                // ID verified by Airbnb
  },
  trip: {
    adults: number;                   // int >= 1
    children: number;                 // int >= 0
    pets: boolean;
    nights: number;                   // int >= 1
    reason?: string;                  // free-form trip purpose
  }
}
```

Source: [`src/tools/booking-request-triage/schema.ts`](../../src/tools/booking-request-triage/schema.ts).

## Scoring (deterministic, fully auditable)

Start at 50 (neutral). Lower score = safer.

| Signal                                       | Score delta |
|----------------------------------------------|-------------|
| Account age ≥ 3 years                        | −15         |
| Account age < 6 months                       | +20         |
| ≥ 5 prior reviews                            | −15         |
| 0 prior reviews                              | +15         |
| Verified ID                                  | −10         |
| Unverified ID                                | +10         |
| Avg host rating ≥ 4.8                        | −5          |
| Avg host rating < 4.0                        | +15         |
| Large party (adults + children ≥ 6)          | +5          |
| Single-night stay                            | +10         |
| Trip reason provided (>10 chars)             | −5          |

Score is clamped to 0..100. Recommendation:

- score ≤ 25 → `auto_accept`
- score ≥ 75 → `auto_decline`
- else → `review`

Full implementation: [`src/mocks/booking-request-triage.fixture.ts`](../../src/mocks/booking-request-triage.fixture.ts).

## Output shape

```jsonc
{
  "risk_score": 30,                                // int 0..100
  "recommendation": "review",                      // auto_accept | review | auto_decline
  "reasoning": ["Account age 1.4 years.", "..."],  // neutral observations
  "red_flags": ["Identity not verified."],         // risk-up signals
  "green_flags": ["5 prior reviews."],             // risk-down signals
  "_mock": true,
  "_pitch": "Risk-scores guests with auditable reasoning, never auto-acts without approval"
}
```

## Example

### Agent prompt

> "I got a booking request for a one-night stay from a guest who joined last
> month with no reviews. Should I worry?"

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "booking_request_triage",
    "arguments": {
      "thread_id": "thread-bnb-9912",
      "guest_profile": {
        "joined": "2026-04-01",
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
  }
}
```

### Response

Score build-up (relative to 2026-05-03 reference date):
50 base + 20 (account <6mo) + 15 (0 reviews) + 10 (unverified) + 10 (1-night) = 105 → clamped to 100.

```jsonc
{
  "risk_score": 100,
  "recommendation": "auto_decline",
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

## Edge cases & failure modes

- **Demo data only** — `_mock: true` always set. A real implementation would
  pull guest profile via Partner API and could incorporate Airbnb's own trust
  signals.
- **Score saturation** — clamped to 0..100 at both ends, so extreme
  combinations don't blow past the bounds.
- **`rating` omitted** → no contribution either way (neutral).
- **No reason provided** → no green flag, no penalty.
- **The recommendation is a recommendation only** — downstream code MUST gate
  any actual accept/decline on host confirmation. The "auto" in
  `auto_accept` / `auto_decline` refers to the recommendation, not to
  side-effects.

## Performance characteristics

- **Cache TTL**: none (pure compute).
- **Rate-limited**: no.
- **Typical p95 latency**: <1 ms.

## When to use

- ✅ Best for: triage queues, agent-driven host coaching ("here's why this
  request scored 70"), policy demos showing auditable scoring, integration
  testing of approval workflows.
- ❌ Not for: any auto-decision pipeline that bypasses host approval.
  Discrimination risk is real — see
  [`docs/limitations.md`](../limitations.md). Real-world deployment requires
  policy review.

## See also

- Source: [`src/tools/booking-request-triage/`](../../src/tools/booking-request-triage/)
- Schema: [`src/tools/booking-request-triage/schema.ts`](../../src/tools/booking-request-triage/schema.ts)
- Fixture / scoring source:
  [`src/mocks/booking-request-triage.fixture.ts`](../../src/mocks/booking-request-triage.fixture.ts)
- Related tools: [`guest_message_assistant`](./guest_message_assistant.md),
  [`host_insights`](./host_insights.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
- Limitations / discrimination caveat:
  [`docs/limitations.md`](../limitations.md)
