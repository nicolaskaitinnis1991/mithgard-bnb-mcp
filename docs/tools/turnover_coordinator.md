# turnover_coordinator

> Produces a turnover brief, an 8-item cleaning checklist, a crew message
> draft, and an estimated duration for a checkout-to-checkin window.
> Status: **Demo (requires Airbnb Partner API + cleaner-coordination
> backend)** — current implementation returns a fixed checklist, formatted
> brief, and a duration deterministically chosen from `listing_id`/`cleaner_id`.

## Purpose

`turnover_coordinator` is the operational glue between checkout and check-in.
Given a checkout timestamp, the next check-in timestamp, and (optionally) a
cleaner id, it produces (a) a short brief the host can paste into the
cleaner's app, (b) a fixed 8-item checklist for the cleaner to tick through,
(c) a crew-message-ready draft, and (d) an estimated duration in minutes.
Typically called after [`calendar_optimizer`](./calendar_optimizer.md)
identifies a back-to-back booking, or as a recurring per-booking task in a
host-side automation.

## Input schema

```ts
{
  listing_id: string;                            // required
  checkout_at: string;                           // ISO datetime "YYYY-MM-DDTHH:MM..."
  checkin_at: string;                            // ISO datetime "YYYY-MM-DDTHH:MM..."
  cleaner_id?: string;                           // optional
}
```

Source: [`src/tools/turnover-coordinator/schema.ts`](../../src/tools/turnover-coordinator/schema.ts).

Datetimes only need to start with `YYYY-MM-DDTHH:MM` — timezone suffix is
parsed but not strictly required by the regex.

## Output shape

```jsonc
{
  "brief": "Turnover for listing 12345\nCheckout: ...\nEstimated duration: 120 min\nAssigned cleaner: ...",
  "checklist": [
    "Strip and replace all bed linens (master + guest bedrooms)",
    "Clean and sanitize bathrooms (toilet, shower, sink, mirrors)",
    "Wipe kitchen surfaces, run dishwasher, restock essentials",
    "Vacuum and mop all floors",
    "Empty all trash bins; replace liners",
    "Restock toiletries, towels, coffee, tea, water",
    "Inspect for damages or missing items; photograph any issues",
    "Final walk-through and lock-up; confirm key/lockbox status"
  ],
  "crew_message_draft": "Hi! Quick turnover at listing 12345:\n- Checkout ...\n- Next check-in ...\n- Estimated 120 min\nFull checklist + supplies status in the app. Reply when started/done. Thanks!",
  "estimated_duration_min": 120,                 // 90 | 120 | 150
  "_mock": true,
  "_pitch": "Coordinates turnover end-to-end with crew briefing and handover checklist"
}
```

The checklist is always the same 8 items in the same order — the demo's
contract is that the *briefing wrapper* is dynamic, not the checklist
contents. Duration is `90 | 120 | 150`, chosen deterministically from
`hash(listing_id:cleaner_id || listing_id) % 3`.

## Example

### Agent prompt

> "Set up the turnover for listing 12345 — checkout June 12 at 11:00 UTC,
> next check-in same day at 15:00 UTC, cleaner is crew-erin."

### Tool call (JSON-RPC)

```json
{
  "method": "tools/call",
  "params": {
    "name": "turnover_coordinator",
    "arguments": {
      "listing_id": "12345",
      "checkout_at": "2026-06-12T11:00:00Z",
      "checkin_at": "2026-06-12T15:00:00Z",
      "cleaner_id": "crew-erin"
    }
  }
}
```

### Response (representative)

```jsonc
{
  "brief": "Turnover for listing 12345\nCheckout: 2026-06-12 11:00 UTC → Check-in: 2026-06-12 15:00 UTC\nEstimated duration: 120 min\nAssigned cleaner: crew-erin",
  "checklist": [
    "Strip and replace all bed linens (master + guest bedrooms)",
    "Clean and sanitize bathrooms (toilet, shower, sink, mirrors)",
    "Wipe kitchen surfaces, run dishwasher, restock essentials",
    "Vacuum and mop all floors",
    "Empty all trash bins; replace liners",
    "Restock toiletries, towels, coffee, tea, water",
    "Inspect for damages or missing items; photograph any issues",
    "Final walk-through and lock-up; confirm key/lockbox status"
  ],
  "crew_message_draft": "Hi! Quick turnover at listing 12345:\n- Checkout 2026-06-12 at 11:00 UTC\n- Next check-in 2026-06-12 at 15:00 UTC\n- Estimated 120 min\nFull checklist + supplies status in the app. Reply when started/done. Thanks!",
  "estimated_duration_min": 120,
  "_mock": true,
  "_pitch": "Coordinates turnover end-to-end with crew briefing and handover checklist"
}
```

## Edge cases & failure modes

- **Demo data only** — `_mock: true` always set. A real implementation would
  pull listing-specific cleaning protocols (number of bedrooms, hot tub,
  laundry on-site, etc.) and integrate with the cleaner's scheduling tool.
- **`cleaner_id` omitted** → the brief explicitly flags
  `"Cleaner: TBD — assign before crew message goes out"` instead of pretending
  someone is assigned. The crew message draft is still returned but the
  caller should not send it without an assignment.
- **Tight turnover window** (e.g. 11:00 checkout → 13:00 checkin) → no
  warning emitted in the demo. A real implementation should compare
  duration to window and warn if the math doesn't work.
- **Invalid datetime format** → `ValidationFailed` before the handler runs.
- **Same `listing_id` + same `cleaner_id`** always produces the same
  duration (deterministic seed).

## Performance characteristics

- **Cache TTL**: none (pure compute, deterministic).
- **Rate-limited**: no.
- **Typical p95 latency**: <1 ms.

## When to use

- ✅ Best for: per-booking turnover automation, sending consistent crew
  messages, demos of operational-glue agents, integration testing of
  scheduling UIs.
- ❌ Not for: listing-specific cleaning protocols (it's a fixed 8-item
  checklist). Not for window-feasibility checks (no warning if 120-min
  duration doesn't fit the gap). Real deployment needs the listing
  protocol + a window check.

## See also

- Source: [`src/tools/turnover-coordinator/`](../../src/tools/turnover-coordinator/)
- Schema: [`src/tools/turnover-coordinator/schema.ts`](../../src/tools/turnover-coordinator/schema.ts)
- Fixture: [`src/mocks/turnover-coordinator.fixture.ts`](../../src/mocks/turnover-coordinator.fixture.ts)
- Related tools: [`calendar_optimizer`](./calendar_optimizer.md),
  [`host_insights`](./host_insights.md)
- Mock-vs-live honesty policy:
  [ADR-0005](../adr/0005-mock-vs-live-honesty.md)
