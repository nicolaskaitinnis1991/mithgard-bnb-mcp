# review_responder (DEMO)

> Requires Airbnb Partner API. Mock response uses sentiment derived from rating + keyword scan for escalation triggers.

**Pitch:** Auto-drafts review responses, flags escalation cases for human review.

## Sentiment

- rating 4-5 → `positive` (or `mixed` if a red-flag keyword appears)
- rating 3 → `neutral`
- rating 1-2 → `negative`

## Escalation triggers

If rating ≤ 2 AND text contains any of: refund, broken, dirty, noise, mold, unsafe, rude → `needs_escalation: true`.

## Output

```json
{
  "draft": "...",
  "sentiment": "positive",
  "needs_escalation": false,
  "_mock": true,
  "_pitch": "..."
}
```
