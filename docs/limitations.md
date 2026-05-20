# Limitations

> What `mithgard-bnb-mcp` is **not**. This is the safety doc: it prevents
> misuse perceptions, sets correct expectations for reviewers and contributors,
> and survives a legal/security review at Airbnb.

The README has a brief honesty section. This doc is the long form.

---

## Not a Partner API client

No Airbnb Partner API access exists for individual developers. The Partner
API is gated behind an enterprise application process aimed at PMS vendors
(Hostaway, Smoobu, Hospitable, etc.), not at solo hosts or open-source
contributors.

**Seven of the nine tools in this server are mocks** with production-shaped
schemas:

- `host_insights`
- `guest_message_assistant`
- `booking_request_triage`
- `smart_pricing`
- `calendar_optimizer`
- `review_responder`
- `turnover_coordinator`

Each one returns `_mock: true` and a `_pitch` field documenting the Partner
API endpoint a real implementation would call. The schemas, handler shape,
and fixtures are real — drop a real API behind them and they ship. But
**today, they are demos**.

See [ADR-0005](./adr/0005-mock-vs-live-honesty.md) for the labelling
convention and rationale.

---

## Not a host-account write tool

The two live tools (`airbnb_search`, `airbnb_listing_details`) **read only
public Airbnb pages**. They:

- Do not log in to any Airbnb account.
- Do not re-use a session cookie, even if one is provided.
- Do not impersonate a host or guest.
- Do not perform any action on behalf of a real Airbnb account.

Anything that implies a write — sending a message, accepting a booking,
changing a price, blocking a date — is one of the seven mock tools, and its
output carries `_mock: true`. **Mock output must never be plumbed into a real
action.** Treat the `_mock` flag like a `dry-run` marker: useful for showing
shape, not for executing.

---

## Not a ToS gray zone

The server is designed to survive a legal and security review at Airbnb.
Concretely:

- **Only public pages.** The live tools fetch the same URLs any
  unauthenticated browser can reach (`airbnb.com/s/<location>/homes`,
  `airbnb.com/rooms/<id>`).
- **Conservative rate limits.** 1 req/sec, 60 req/hour by default
  (`HTTP_RATE_PER_SEC`, `HTTP_RATE_PER_HOUR` env vars). Adjustable downward
  but not realistically upward.
- **Polite, self-identifying User-Agent.** Default is
  `mithgard-bnb-mcp/<version> (+https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp)`.
  Airbnb security can attribute traffic to this project on sight.
- **No captcha bypass.** If Airbnb fronts a page with a captcha, the parser
  surfaces `ParseFailed`. There is no headless-browser fallback, no captcha
  solver integration, no proxy rotation.
- **No cookie or session theft.** No credentials are accepted by any tool,
  even if an operator passes them via env var.
- **No PII storage.** The LRU cache holds public search and listing data
  only, in process memory, evaporating on restart.

See [`SECURITY.md`](../SECURITY.md) for the full security posture and the
private disclosure flow.

---

## Not a PMS replacement

This is a complement to property management systems, not a substitute. The
server does not:

- Aggregate across multiple platforms. No VRBO. No Booking.com. No Direct.
  No Vrbo, no Hostfully, no Lodgify. Airbnb only.
- Handle billing or payments. No payouts, no refunds, no chargebacks. By
  rule: when money is involved, this server only reads (and even that, only
  through mocks).
- Write inventory or calendar state to any upstream. Calendar-blocking is a
  mock; the real action requires Partner API.
- Replace a real PMS for a multi-listing operator. If you operate 10+
  listings across platforms, you want Hostaway or similar. This server is
  for the host who wants Claude to assist on their existing setup, not for
  the operator who wants a different stack.

---

## Not a guest-facing tool

Output is consumed by an MCP agent assisting a host. **It is never shown to
guests.** Specifically:

- `guest_message_assistant` drafts replies. The host reviews and sends.
  There is no autopilot mode.
- `review_responder` drafts review responses. The host reviews and posts.
- `booking_request_triage` recommends accept/decline. The host decides.

Every action that touches a guest goes through a human approval gate by
design. The mock outputs include explicit approval-gate documentation
(`_pitch` field).

---

## Not a finished product

**Version:** `v0.1.0-alpha`.

- APIs may change. Schemas will stabilise at `v1.0`.
- Until then, expect breaking changes between minor versions.
- The 7 mock tools will not become live until Partner API access is
  obtained, either via Airbnb opening the API to individual developers or
  via a partnership.
- Coverage is high (>94% statements) but not 100%. Some branches are
  exercised only by integration tests that depend on captured HTML fixtures.
- The release pipeline (Docker images on GHCR, npm publication) lands in a
  later dispatch. Today, the only install path is "build from source".

---

## Specific tool limitations

### `airbnb_listing_details.price_per_night` returns `0`

Airbnb's PDP (product detail page) HTML does not embed a per-night price
without a check-in date. The parser at
[`src/parsers/airbnb-public.ts:243`](../src/parsers/airbnb-public.ts)
hardcodes `0` for the listing-details case as a deliberate, documented
choice. To get prices, use `airbnb_search` which does embed per-night rates
in result cards. The price-per-night field on `airbnb_listing_details`
output remains for schema symmetry, but consumers should not rely on it.

### Live HTML schema can rotate without warning

Airbnb is a living website; the JSON-blob shapes inside `<script
id="data-deferred-state-0">` change occasionally. The parser is
multi-strategy ([ADR-0006](./adr/0006-multi-strategy-parser.md)) — modern
`niobeClientData` first, legacy `niobeMinimalClientData` fallback — but a
third schema we haven't seen yet will produce `ParseFailed` until a
maintainer captures fresh fixtures and adds a third strategy.

Integration tests use HTML fixtures captured at known dates
(`tests/integration/fixtures/live-<date>/`). When live searches start
returning `ParseFailed` in production, check the fixture-capture date as the
first diagnostic.

### Mock tools cannot reflect real listing performance

The seven mock tools return **deterministic demo data**. `host_insights`
will tell you the same occupancy and ADR every time for a given input.
`smart_pricing` will recommend the same nightly rates. The data is realistic
in shape and reasonable in magnitude, but it is not derived from any real
listing's state. **Do not use mock-tool output to make real business
decisions.**

---

## What it does well

To balance the "not" list above — here is what this server is genuinely good
at today:

- **Search and listing-details from public pages** with reasonable accuracy.
  The modern parser handles the current Airbnb HTML; the legacy fallback
  covers a one-version-behind rotation.
- **Deterministic, schema-shaped mock outputs** for the seven host-side
  workflows. Useful for demos, agent-prompt development, and as a reference
  implementation.
- **Production-grade observability.** Structured logging via `pino` with
  per-call `request_id`, `duration_ms`, `status`, and `cache_hit`. Optional
  OTEL export gated on env var.
- **Production-grade error handling.** `Result<T, McpError>` tagged unions
  at every public boundary. No thrown errors crossing module lines.
- **Production-grade security posture.** Public-only, polite UA, conservative
  rate limits, no PII, no auth. Reviewer-friendly.
- **Sub-60-second install** via `claude_desktop_config.json`. See
  [`docs/deploy.md`](./deploy.md).
