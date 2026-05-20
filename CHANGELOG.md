# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/).

## [Unreleased]

## [0.1.0-alpha] — 2026-05-04

### Added

- MCP server scaffolding with 9 tools registered via stdio transport
- **2 live tools** on public Airbnb data:
  - `airbnb_search` — search listings by location, dates, guests, price
  - `airbnb_listing_details` — full listing details (title, host, reviews, amenities)
- **7 demo tools** (`_mock: true`, awaiting Airbnb Partner API):
  - `host_insights`, `guest_message_assistant`, `booking_request_triage`,
    `smart_pricing`, `calendar_optimizer`, `review_responder`, `turnover_coordinator`
- Core libraries:
  - `Result<T, E>` tagged union for error-as-value
  - `McpError` typed errors with `RateLimited | UpstreamHTTP | ParseFailed | ValidationFailed | NotImplemented`
  - `undici` + `p-queue` HTTP client with 429 retry-with-backoff
  - LRU cache with TTL
  - `pino` structured logging to stderr (stdout reserved for MCP JSON-RPC)
  - PII redaction at sink
- CLI flags: `--version`, `--help`, `--debug`
- Self-identifying User-Agent: `mithgard-bnb-mcp/<ver> (+repo URL)`
- Telemetry wrapper with `request_id`, `duration_ms`, `cache_hit` fields
- Multi-strategy Airbnb parser (modern `niobeClientData` + legacy fallback)
- Landing page in `landing/` (deploy-ready for `bnb.mithgard.ai`)
- Pitch material in `docs/pitch/`
- Full test suite: 105 unit + integration + e2e tests; 2 e2e tests gated on `E2E_LIVE=1`
- CI: GitHub Actions (lint, typecheck, test, coverage gate 80/50/80/80, CodeQL conditional on public visibility)
- TypeScript strict mode, ESLint flat config, Prettier, Husky, commitlint
- Multi-stage distroless Dockerfile

### Known Limitations

- `airbnb_listing_details` returns `price_per_night: 0` because Airbnb's listing
  detail page does not embed per-night price without a check-in date. Use
  `airbnb_search` to get pricing.
- Live Airbnb HTML schema may change; the multi-strategy parser falls back
  gracefully but may require fixture refresh.
- 7 demo tools return deterministic mock data — they cannot interact with real
  Airbnb host accounts (Partner API required).

### Security

- No login flows, no captcha bypass, no cookie or session re-use
- No PII storage; logs are redacted at sink
- HTTPS-only outbound traffic
- Conservative rate limiting (1 req/sec, 60/hr)

[Unreleased]: https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/compare/v0.1.0-alpha...HEAD
[0.1.0-alpha]: https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/releases/tag/v0.1.0-alpha
