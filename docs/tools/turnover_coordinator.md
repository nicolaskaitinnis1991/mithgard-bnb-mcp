# turnover_coordinator (DEMO)

> Requires Airbnb Partner API. Mock implementation produces a brief, 8-item fixed checklist, crew message draft, and a deterministic duration (90/120/150 min).

**Pitch:** Coordinates turnover end-to-end with crew briefing and handover checklist.

## Input

```json
{
  "listing_id": "12345",
  "checkout_at": "2026-06-12T11:00:00Z",
  "checkin_at": "2026-06-12T15:00:00Z",
  "cleaner_id": "crew-erin"
}
```

`cleaner_id` is optional. When omitted, the brief flags "TBD — assign before crew message goes out".

## Output

```json
{
  "brief": "...",
  "checklist": ["..."],
  "crew_message_draft": "...",
  "estimated_duration_min": 120,
  "_mock": true,
  "_pitch": "..."
}
```
