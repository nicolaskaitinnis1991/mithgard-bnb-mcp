# ADR 0006: Multi-strategy parser with modern + legacy fallback

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

The two live tools (`airbnb_search`, `airbnb_listing_details`) extract data
from Airbnb's public HTML by reading the embedded JSON blob in the
server-rendered page (the Apollo client cache hydrated into the document).

Airbnb rotates that JSON's shape without warning. During the 04 May 2026
catalog implementation we caught two distinct shapes in flight:

- **Modern** (live in 2026): `niobeClientData` with GraphQL operation
  results — `StaySearchResult`, `stayProductDetailPage`, base64-encoded
  `DemandStayListing:<num>` IDs.
- **Legacy** (still served to some buckets / older user agents):
  `niobeMinimalClientData` with flat fields — `id`, `name`,
  `pricingQuote.rate`, etc.

A parser hardcoded to one shape breaks silently when the shape rotates —
fetches succeed, JSON.parse succeeds, but the selector returns `undefined`
and the tool emits "0 results" with no diagnostic.

## Decision

Implement the parser as a **multi-strategy walker**: try the modern path
first, fall back to the legacy walker if it fails. Both fixtures live in
the test suite so both paths are verified on every CI run.

If both strategies fail, return a `ParseFailed` `McpError` whose payload
includes the JSON-path selector that failed last — useful diagnostic for the
agent and for human debugging.

## Reasons

- **Graceful degradation across schema rotations.** When the modern shape
  changes again (it will), the legacy walker is at least a fallback we can
  rely on until we add a new strategy.
- **Test fixtures are checkpoint snapshots.** Each new shape we encounter
  becomes a fixture file. Test cases assert that the parser handles all of
  them — old + new — so we never regress.
- **New strategies are easy to add.** The walker is an ordered list; a new
  one slots in at the right priority.
- **Useful diagnostics on failure.** When both strategies fail, the agent
  gets back enough information (`ParseFailed { selector: "niobeClientData.data.presentation..." }`)
  to know what changed, instead of a silent zero-result.
- **Honest test coverage.** Branch coverage drops because each strategy is
  itself a chain of optional-chained property reads. We accept that and
  document the 50% branches threshold in `vitest.config.ts`.

## Consequences

### Positive

- Schema rotations don't kill the tool overnight. We have time to add a new
  strategy in a normal PR cycle instead of an emergency.
- Both fixture sets (synthesized + live) verify the parser, catching
  regressions in either direction.
- Failure mode is actionable — the error tells you which selector failed.
- The pattern generalises: when we add a third live tool that scrapes a
  different Airbnb page, it reuses the same walker abstraction.

### Negative / Trade-offs

- **More code than a single-strategy parser** — the walker, the strategy
  list, the fallback orchestrator, the diagnostic-builder.
- **Branch coverage is lower.** Defensive `?.` chains read as untested
  branches by Istanbul, even when both fixtures exercise the parser end-to-end.
- **Cognitive overhead.** Readers see two parsers and have to understand
  why. Mitigated by inline comments in `src/parsers/airbnb-public.ts` and
  this ADR.

### Mitigations

- `vitest.config.ts` sets `coverage.branches: 50` rather than the default
  80, with a comment pointing to this ADR.
- The walker module is small (~200 LoC including both strategies) and
  heavily commented at the strategy-selection point.
- When a new shape appears in the wild, the workflow is documented in
  `docs/architecture.md` (D6) — capture the HTML, add a fixture, write the
  new strategy, slot it at the top of the list.

## References

- `src/parsers/airbnb-public.ts` — the multi-strategy walker.
- `tests/fixtures/airbnb-search-modern.html` — live 2026 shape.
- `tests/fixtures/airbnb-search-legacy.html` — earlier synthesized shape.
- `docs/live-smoke-test-2026-05-04.txt` — proof that 18 real Berlin listings
  flow end-to-end through the modern strategy.
- ADR-0004 (`ParseFailed` is one variant of `McpError`).
