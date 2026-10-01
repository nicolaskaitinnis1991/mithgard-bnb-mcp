# turnover_coordinator

Proposes a serial task schedule using supplied duration, cleaner availability and existing assignments. Feasibility is arithmetic over caller data; no cleaner is booked or contacted.

## Mode and evidence

`mode: "provided"` requires `host_data`. Passing data without that mode, or omitting data in that mode, fails validation; there is no fixture fallback. With `mode: "demo"` (or no mode and no data), the existing synthetic fixture runs instead.

Every result has `_source`, `_mock`, and `data_evidence`. Provided calculations use `_source: "provided", _mock: false`; this means calculated from caller assertions, not authenticated/imported account data. Evidence includes the caller's `as_of` timestamp, IANA `timezone`, `currency`, `complete`, and detected `missing_fields`. `complete: true` is only retained when the source asserts completeness and required calculation facts are present. Demo evidence has `as_of: null`, `complete: false`, and `missing_fields: ["synthetic_data"]`.

Metadata is required in every supplied dataset. Supported currencies are EUR, GBP, USD, CAD, AUD and CHF; money supports up to two decimals, nonnegative values and a maximum of 1,000,000 per supplied amount. No currency conversion occurs. Input objects reject unknown fields; strings, arrays, dates and amounts are bounded. Outputs are validated at the MCP boundary.

## Supplied-data contract and calculation

- `listing_id`: nonempty ID up to 200 characters.
- `checkout_at`, `checkin_at`: real ISO timestamps with Z or explicit UTC offset. Check-in must follow checkout. `cleaner_id` optionally restricts candidates to that supplied cleaner.
- `host_data.tasks`: 1–30 distinct `{id, title, duration_min}` tasks. IDs max80 characters, titles max100, each duration1–480 minutes.
- Required `buffer_min`: 0–240. Tasks run sequentially on one proposed cleaner; parallel task execution/travel/material constraints are not inferred.
- `cleaners`: at most20 distinct IDs, each with `available` and `assignments` arrays (at most50 positive `{start,end}` intervals each). No contact data is required.

Required duration is sum(task minutes) + buffer. The engine chooses the earliest fitting supplied availability window, skips conflicting assignments, and checks that the complete sequence plus buffer finishes before both availability end and check-in. A selected cleaner remains `assignment_status: proposed_only`. Source complete=false cannot yield feasible=true; absent requested cleaner, insufficient availability or conflicts can make a long overall window infeasible.

Elapsed arithmetic uses timestamp instants/UTC, including offset changes at DST transitions. `scheduled_tasks`, `planned_start`, `planned_end` are ISO UTC timestamps; the end includes the buffer. `local_window` and the draft show the supplied IANA timezone. Without a fitting candidate, planned start/end and cleaner are null and scheduled_tasks is empty. Every result requires approval. Demo durations and checklists are illustrative rather than property-specific.

## Reproducible synthetic example

These caller facts are synthetic test data, not a real property account. Input:

```json
{
  "mode": "provided",
  "listing_id": "synthetic-property",
  "checkout_at": "2026-06-01T12:00:00+02:00",
  "checkin_at": "2026-06-01T15:00:00+02:00",
  "host_data": {
    "as_of": "2026-06-03T09:00:00Z",
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "complete": true,
    "tasks": [
      {
        "id": "clean",
        "title": "Clean apartment",
        "duration_min": 120
      }
    ],
    "buffer_min": 30,
    "cleaners": [
      {
        "id": "synthetic-crew",
        "available": [
          {
            "start": "2026-06-01T09:00:00Z",
            "end": "2026-06-01T15:00:00Z"
          }
        ],
        "assignments": []
      }
    ]
  }
}
```

Selected output fields (the full result also includes evidence and other validated fields):

```json
{
  "_source": "provided",
  "_mock": false,
  "window_minutes": 180,
  "estimated_duration_min": 120,
  "required_duration_min": 150,
  "feasible": true,
  "proposed_cleaner_id": "synthetic-crew",
  "assignment_status": "proposed_only",
  "planned_start": "2026-06-01T10:00:00.000Z",
  "planned_end": "2026-06-01T12:30:00.000Z",
  "approval_required": true
}
```

## External prerequisites and acceptance

Real assignment, crew acknowledgement, travel/stock constraints, status tracking and messaging require a separately authorized provider.

- [Schema](../../src/tools/turnover-coordinator/schema.ts)
- [Handler](../../src/tools/turnover-coordinator/handler.ts)
- [Strict host-data contracts](../../src/host-data/contracts.ts)
- [Local calculation engines](../../src/host-data/engines.ts)
- [Provided-data acceptance scenarios](../../tests/integration/provided-host-data.test.ts)
- [Saved acceptance plan](../acceptance-plan.md)

Automated scenarios and synthetic load are technical evidence, not human host acceptance.
