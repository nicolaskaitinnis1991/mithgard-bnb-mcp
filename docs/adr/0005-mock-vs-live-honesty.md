# ADR 0005: Mock tools clearly labelled, never silently degraded

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

Of the 9 tools shipped in `mithgard-bnb-mcp`, only two — `airbnb_search` and
`airbnb_listing_details` — work on real Airbnb data via public catalog
scraping. The remaining 7 (calendar lookups, pricing recommendations,
guest-message drafting, payout summaries, etc.) require **Airbnb Partner API
access**, which is not available to individual hosts.

That leaves a design question: do we ship the 7 host-side tools at all, and
if so, how?

Three options were considered:

1. **Don't ship them.** Keep the repo to the 2 live tools.
2. **Ship them with synthesized but realistic outputs**, and present them as
   if they were real — the implementation could be swapped later when API
   access is granted.
3. **Ship them with synthesized outputs but mark every response as a mock**,
   with documentation and a pitch statement explaining the value.

Option 1 loses the pitch story (we want to demonstrate the full surface area
to Airbnb partnerships). Option 2 is dishonest — an agent calling these
tools could plumb mock data into a real action (sending an email to a real
guest based on a fake reservation). Option 3 keeps the demonstration without
the risk.

## Decision

Ship the 7 host-side tools as **clearly labelled mock implementations**.
Every mock tool:

- Sets `_mock: true` in its output schema.
- Includes a `_pitch: string` field describing the value statement.
- Has a description that **starts** with `[DEMO — requires Airbnb Partner API]`.
- Returns realistic fixture-based data that lines up with how the real API
  is expected to respond.

The two live tools (`airbnb_search`, `airbnb_listing_details`) have no
`_mock` flag and operate on real public Airbnb HTML.

## Reasons

- **Honesty over performance theatre.** Pretending mock output is real
  invites foot-guns — an agent could chain a mock `airbnb_get_reservations`
  into a real `send_email_to_guest` and embarrass the user.
- **The repo doubles as a pitch artefact for Airbnb.** Engineers reviewing
  it need to see exactly what would be real if Partner API access were
  granted. Clear `_mock: true` flags make that boundary visible at a glance.
- **No risk of unsuspecting users.** Even users who skim the README can't
  miss the `[DEMO — requires Airbnb Partner API]` prefix in the tool
  description that the MCP client surfaces.
- **The `_pitch` field doubles as documentation.** A reviewer who calls a
  mock tool gets back a short statement of what value it would deliver,
  which is exactly what we want to communicate.
- **Symmetric output schemas.** When/if Partner API access is granted, the
  swap is mechanical — drop the `_mock` / `_pitch` fields, keep the rest of
  the schema, point the handler at the real API.

## Consequences

### Positive

- Reviewers immediately understand the surface area without confusing demo
  data for real data.
- The repo is safe to install today — no risk of agents acting on fake state.
- The pitch artefact and the production artefact are the same codebase,
  reducing drift.
- Output schemas double as the future Partner-API contract spec.

### Negative / Trade-offs

- **Slight cognitive overhead** for users — every response from a mock tool
  has two extra fields they don't strictly need.
- **The `[DEMO — ...]` prefix is verbose** in tool-discovery listings.
- **Test fixtures duplicate work** — we still maintain mock fixtures even
  though they don't represent real-world data the way live-tool fixtures do.

### Mitigations

- The `_mock` and `_pitch` fields are documented once in
  `docs/limitations.md` (D6) so the conventions are clear.
- README's "What's mock, what's live" section names the 7 mock tools
  explicitly with a one-liner each.
- The mock fixtures are deliberately small (one happy-path + one edge-case
  per tool) — we don't try to be comprehensive.

## References

- `src/tools/airbnb_get_calendar/handler.ts` (and 6 siblings) — every mock
  handler sets `_mock: true` and `_pitch: "..."`.
- `src/tools/airbnb_get_calendar/schema.ts` — output schema includes those
  fields as required.
- `docs/limitations.md` (added in D6) — full discussion of the
  mock-vs-live boundary.
- `docs/pitch/value-prop-matrix.md` — table of all 9 tools with
  Partner-API-field column.
- ADR-0003 (Zod schemas).
