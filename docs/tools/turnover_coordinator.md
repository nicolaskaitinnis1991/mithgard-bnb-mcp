# turnover_coordinator

Sample crew briefing and time-window checks. **Demo only:** output always carries `_mock: true`. This tool has no Airbnb Partner API connection and performs no external action. Treat results as examples, never as observed host data.

## Contract

- `listing_id`: nonempty identifier, at most 200 characters.
- `checkout_at`, `checkin_at`: real ISO timestamps with `Z` or an explicit offset (e.g. `+02:00`). Timezone-free and malformed timestamps fail validation.
- Check-in must be strictly after checkout.
- `cleaner_id`: optional nonempty identifier, at most 200 characters.

The output formats timestamps in UTC and supplies a fixed illustrative checklist and hash-selected duration of 90, 120 or 150 minutes. `window_minutes` records the actual elapsed window; `feasible` compares the sample duration to that window. A too-short window and absent cleaner assignment produce warnings. This is only arithmetic over a sample estimate, not confirmation that a crew is available or that the property will be ready.

`cleaner_id` identifies a proposed cleaner. No crew is assigned or contacted. Every output sets `approval_required: true`; verify the property-specific checklist, equipment, duration, cleaner availability and local times before approving a crew message.

All inputs reject unknown fields. Identifiers and free text are bounded. Invalid input produces an MCP tool error before the handler runs. Outputs are validated against the registered Zod schema.

## Reproducible offline example

This input/output pair was generated from the fixture handler, not from a real host account. Dates are explicit for reproducibility.

Input:

```json
{
  "listing_id": "12345",
  "checkout_at": "2026-10-01T11:00:00+02:00",
  "checkin_at": "2026-10-01T11:30:00+02:00",
  "cleaner_id": "demo-crew"
}
```

Output:

```json
{
  "brief": "Turnover for listing 12345\nCheckout: 2026-10-01 09:00 UTC → Check-in: 2026-10-01 09:30 UTC\nEstimated duration: 120 min\nProposed cleaner: demo-crew",
  "approval_required": true,
  "window_minutes": 30,
  "feasible": false,
  "warnings": [
    "Cleaning estimate exceeds the available turnover window; resolve before assigning.",
    "Demo checklist and duration are illustrative, not listing-specific or a confirmed crew booking."
  ],
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
  "crew_message_draft": "Hi! Quick turnover at listing 12345:\n- Checkout 2026-10-01 at 09:00 UTC\n- Next check-in 2026-10-01 at 09:30 UTC\n- Estimated 120 min\nDraft only: confirm assignment, checklist, supplies and time window before sending. Reply when started/done. Thanks!",
  "estimated_duration_min": 120,
  "_mock": true,
  "_pitch": "Coordinates turnover end-to-end with crew briefing and handover checklist"
}
```

## Source and validation

- [Schema](../../src/tools/turnover-coordinator/schema.ts)
- [Handler](../../src/tools/turnover-coordinator/handler.ts)
- [Fixture](../../src/mocks/turnover-coordinator.fixture.ts)
- [Synthetic host regression scenarios](../../tests/integration/virtual-host-scenarios.test.ts)
- [Limitations](../limitations.md)

Synthetic scenarios are automated acceptance tests. They do not constitute human user testing.
