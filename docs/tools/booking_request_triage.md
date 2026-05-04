# booking_request_triage (DEMO)

> Requires Airbnb Partner API. Mock implementation computes a deterministic risk score from guest profile + trip facts.

**Pitch:** Risk-scores guests with auditable reasoning, never auto-acts without approval.

## Scoring

Base 50, adjusted by:
- Account age (>3y −15, <0.5y +20)
- Reviews (≥5 −15, 0 +15)
- Verified ID (−10 / +10)
- Rating (≥4.8 −5, <4.0 +15)
- Single-night stay (+10)
- Stated trip reason (−5)

Recommendation: ≤25 auto_accept, ≥75 auto_decline, else review.

## Output

```json
{
  "risk_score": 30,
  "recommendation": "review",
  "reasoning": ["..."],
  "red_flags": ["..."],
  "green_flags": ["..."],
  "_mock": true,
  "_pitch": "..."
}
```
