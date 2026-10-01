# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning 2.0.0](https://semver.org/).

> Note: `npx changeset version` (D12) consolidated the prerelease counter from
> `0.1.0-alpha` to `0.1.0-alpha.1`. The auto-bump produced `0.1.0` (collapse of the
> prerelease line) because changesets requires an explicit `pre enter` workflow
> to retain the `-alpha` track. We manually overrode `package.json#version` back
> to `0.1.0-alpha.1`. The audit trail of intent remains in `.changeset/`.

## [Unreleased]

- Seven supplied-data host engines with explicit provenance, missing-field evidence and rule-based DE/EN drafts.
- Bounded host_workflow plan/preflight/execute/verify with partial progress, approval propagation and cancellation.
- Serialized cache/output budgets, local-vs-upstream quota/deadline distinctions, circuit epochs, health freshness and actual EOF cleanup.
- Machine-produced acceptance, immutable offline container testing, all-tool synthetic load and content/function inventories.

- Harden public price evidence, input bounds, dates and currency-scoped caches.
- Remove fictional guest access details and require approval for demo recommendations.
- Publish generated MCP contracts, validate outputs, support cancellation and redact debug data.
- Add a local operations supervisor, bounded HTTP lifecycle and initialized client/container smoke.
- Move to Node 24 and Vitest 5, refresh dependency lockfile and add synthetic fault/load verification.
- Replace current docs and generate an indexed source/Markdown inventory. Public output fields may now be null; demo recommendation labels have changed. This remains alpha.

## [0.1.0-alpha.1] — 2026-05-04

Production-readiness pass on top of `0.1.0-alpha`. No behavioural changes for end
users beyond what `0.1.0-alpha` shipped; this release focuses on documentation,
observability, fixtures, release pipeline, and gate hardening.

### Added

- 7 ADRs documenting key architectural decisions (`docs/adr/`)
- `docs/architecture.md`, `docs/deploy.md`, `docs/limitations.md`
- 9 production-quality tool docs under `docs/tools/`
- `examples/usage.md`, `examples/agent-conversation.md` — real Claude transcripts
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`
- GitHub issue templates (`bug.yml`, `feature.yml`, `config.yml`), PR template, `FUNDING.yml`
- Release pipeline (`.github/workflows/release.yml`): multi-arch Docker build to GHCR on tag push
- `scripts/smoke.sh` for local + Docker smoke testing
- 3 additional pitch docs: `competitive-landscape.md`, `security-faq.md`, `legal-faq.md`
- `docs/dev/husky-v10-migration.md` — Husky v10 migration plan
- `docs/security-notes.md` — npm audit traceback (4 transitive, none in runtime path)
- `npm run verify` — single-command gate (`lint && typecheck && test && build`)
- Vitest `retry: 1` for flake tolerance on timing tests

### Changed

- HTML fixtures stripped (1.35 MB → 543 KB) — Bugsnag apiKey removed from snapshots
- JSON walker extracted to `src/lib/json-walker.ts`; parser is now strict-clean
- Vitest branch threshold tightened from 50% to 55%
- Self-identifying User-Agent: `mithgard-bnb-mcp/<ver> (+repo URL)` (no more spoofed Chrome string)

### Security

- Documented all 4 transitive npm audit findings; none in the runtime path
- Confirmed no `eslint-disable` rot in `src/` outside of two justified locations
  (`src/server.ts` for MCP-SDK deprecation, `src/lib/json-walker.ts` for walker-internal)
- No PII storage; logs are redacted at sink; `--debug` envelope dumps also redacted

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

[Unreleased]: https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/compare/v0.1.0-alpha.1...HEAD
[0.1.0-alpha.1]: https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/releases/tag/v0.1.0-alpha.1
[0.1.0-alpha]: https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/releases/tag/v0.1.0-alpha
