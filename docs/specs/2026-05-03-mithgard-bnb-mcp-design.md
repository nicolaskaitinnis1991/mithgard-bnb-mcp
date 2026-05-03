# Mithgard BnB MCP — Design Spec

**Date:** 2026-05-03
**Author:** Nico Kaitinnis (Mithgard)
**Status:** Draft — awaiting user approval before plan writing
**Repo:** `~/Desktop/16_MITHGARD-BNB-MCP` (private)

---

## 1. Problem

Individual Airbnb hosts cannot get a Partner API key. There is no first-party MCP server, no agent SDK, no programmatic access to host-side workflows (guest messages, booking requests, pricing, calendar, reviews, turnovers). The only options are:

1. Pay for a PMS (Hostaway, Smoobu, Hospitable) that has Partner API access — indirect, opinionated, not agent-native.
2. Use community scrapers (openbnb/mcp-server-airbnb) — read-only, public data only, ToS-fragile.

Neither serves the host who wants to wire **Claude / a personal AI agent** directly into their day-to-day Airbnb operations.

## 2. Solution

Ship a **production-grade, open-source MCP server** that:

1. **Today:** does what's legally and technically possible on public Airbnb data — search and listing details — at quality that beats existing community servers.
2. **Tomorrow (mocked, fully spec'd):** demonstrates the seven host-side workflows that need Partner API access. Each mock tool has the schema, the handler shape, the doc, and the fixture an Airbnb engineer would need to wire the real API to.

The repo is the **pitch artifact**: working code + designed surface area + clean architecture, sent to Airbnb's Head of Host Tools / Head of Platform Engineering with the message "we already built it; open the API and we ship."

## 3. Goals

- Beat `openbnb/mcp-server-airbnb` on robustness, types, error handling, observability, and docs.
- Make the demo tools so close to "real" that Airbnb's eng team can review them like a PR.
- Be installable in 60 seconds via `claude-desktop-config.json` snippet.
- Stay deployable as a single binary (Docker) for self-hosting hosts.
- Survive an Airbnb legal/security review (no scraping past public surfaces, no PII storage, no spoofing).

## 4. Non-goals

- Not a PMS replacement.
- Not a multi-platform aggregator (no VRBO / Booking.com in v1).
- Not a billing/payments tool.
- Not a guest-facing tool.
- Not a marketing site (the README + pitch deck do that job).

## 5. Architecture

### 5.1 High level

```
AI Agent (Claude / Claude Code / Cursor / etc.)
    │  MCP over stdio (default) or SSE (optional)
    ▼
Mithgard BnB MCP Server (Node 20+, TypeScript)
    │
    ├── Tool Registry (9 tools)
    │     ├── 2 live tools  → src/parsers/airbnb-public.ts → undici + cache + rate-limit
    │     └── 7 mock tools  → src/mocks/*.fixture.ts (deterministic, labeled _mock: true)
    │
    ├── Validation Layer (zod) — every input + output validated
    ├── Telemetry (pino structured logs, optional OTEL traces)
    └── Error envelope (Result<T, McpError>)
```

### 5.2 Module boundaries

| Module | Purpose | Depends on |
|---|---|---|
| `src/server.ts` | MCP server bootstrap, registers tools | sdk, registry |
| `src/tools/<name>/` | One tool per folder: schema + handler + test + doc | lib, parsers OR mocks |
| `src/lib/http.ts` | undici client, retry, 429 handling, jitter | undici, p-queue |
| `src/lib/cache.ts` | LRU cache, TTL'd, opt-in per tool | lru-cache |
| `src/lib/result.ts` | `Result<T, E>` type — no thrown errors across boundaries | — |
| `src/parsers/airbnb-public.ts` | HTML/JSON parsing of public Airbnb pages | cheerio |
| `src/mocks/<tool>.fixture.ts` | Hand-crafted realistic fixtures | — |
| `src/config/env.ts` | env parsing via zod | zod |
| `src/config/logger.ts` | pino logger factory | pino |

### 5.3 Why TypeScript over Python

- Official MCP SDK is most mature in TS.
- Single binary distribution via `pkg` or Docker is straightforward.
- Type safety on tool I/O matches Zod schemas 1:1.
- Existing Mithgard portfolio mixes TS (Mundart, Schreibtisch) and Python (Lemma, Idea-Genome) — TS keeps this in the host-tooling lane.

## 6. The 9 Tools

### Live (public data)

#### 6.1 `airbnb_search`
- **Input:** `{ location: string; checkin?: ISO_date; checkout?: ISO_date; adults?: int; children?: int; min_price?: int; max_price?: int; currency?: ISO_4217; }`
- **Output:** `{ results: Listing[]; total_estimate: int; query: NormalizedQuery; _source: "public"; }`
- **Source:** Airbnb public search page, parsed.
- **Cache:** 15 min per query.
- **Rate limit:** 1 req/sec, 60 req/hour, with jitter.

#### 6.2 `airbnb_listing_details`
- **Input:** `{ listing_id: string | number; checkin?: ISO_date; checkout?: ISO_date; }`
- **Output:** `{ listing: ListingFull; reviews_summary: ReviewsSummary; host_summary: HostSummary; _source: "public"; }`
- **Source:** public listing page.
- **Cache:** 30 min.

### Mock (Partner-API gated)

Every mock tool:
- Description starts with `[DEMO — requires Airbnb Partner API]`.
- Output includes `_mock: true` and `_pitch: "<one-line value statement>"`.
- Fixture is hand-crafted, realistic, deterministic (same input → same output).

#### 6.3 `host_insights`
Auslastung, Revenue, Konkurrenz-Vergleich, Pricing-Empfehlungen pro Listing.

#### 6.4 `guest_message_assistant`
Eingehende Nachricht in → drei Antwort-Vorschläge (kurz / freundlich / formal) + Empfehlung. Approval-Gate dokumentiert.

#### 6.5 `booking_request_triage`
Anfrage in → Risk-Score (0–100), Auto-Accept/Decline-Empfehlung, Begründung, "send to host"-Approval.

#### 6.6 `smart_pricing`
Listing + Datumsbereich → Tagespreise mit Begründung (Events, Wetter, Konkurrenz, historische Auslastung).

#### 6.7 `calendar_optimizer`
30/60/90-Tage-Kalender → Lücken erkennen, Last-Minute-Discount-Vorschläge, Min-Stay-Anpassungen.

#### 6.8 `review_responder`
Review in → Antwort-Entwurf in Host-Voice + Sentiment-Tag + Eskalations-Flag wenn nötig.

#### 6.9 `turnover_coordinator`
Check-out + Check-in → Reinigungs-Briefing, Übergabe-Checkliste, Crew-Notification-Entwurf.

## 7. Data flow examples

### 7.1 Search (live)
```
Agent → airbnb_search("Berlin", 2026-06-01, 2026-06-04, 2 adults)
     → zod validate input
     → cache lookup (miss)
     → p-queue acquire
     → undici GET https://www.airbnb.com/s/Berlin/homes?...
     → cheerio parse <script type="application/json"> with results
     → normalize → Listing[]
     → cache store
     → zod validate output
     → return { results, total_estimate, query, _source: "public" }
```

### 7.2 Guest message assistant (mock)
```
Agent → guest_message_assistant({ thread_id, last_message })
     → zod validate input
     → mocks/guest-message-assistant.fixture.ts (matches by message keyword)
     → return { suggestions: [...], recommended_index: 1, _mock: true,
                _pitch: "Drafts host-voiced replies with approval gate" }
```

## 8. Error handling

- All public boundaries return `Result<T, McpError>` — never throw.
- `McpError` is a tagged union: `RateLimited | UpstreamHTTP | ParseFailed | ValidationFailed | NotImplemented`.
- HTTP 429 → backoff + retry up to 3 times; if exhausted, surface `RateLimited` with `retry_after_ms`.
- HTML structure changes → `ParseFailed` with the failing selector logged at WARN.

## 9. Testing strategy

- **Unit:** every tool's handler with input fixtures (vitest).
- **Integration:** parser tests against captured HTML fixtures in `tests/integration/fixtures/`.
- **E2E:** spawn server, send MCP tool calls over stdio, assert responses.
- **Contract:** zod schema snapshot — fails CI if a tool's schema changes without a changeset.
- **Coverage gate:** 80% lines, 80% branches.

## 10. Observability

- Structured logs (pino) with `{tool, request_id, duration_ms, cache_hit, _source}`.
- Optional OTEL via `OTEL_EXPORTER_OTLP_ENDPOINT` env var.
- A `--debug` flag on CLI prints request/response envelopes (sanitized).

## 11. Security & compliance

- No credentials required for live tools. None accepted, even if user passes them.
- `.env.example` documents all knobs; no `.env` committed.
- `SECURITY.md` with private-disclosure flow.
- `LICENSE` MIT (default — switchable to Apache-2.0 before public release).
- `CODE_OF_CONDUCT.md` (Contributor Covenant).
- Dependabot + CodeQL on by default.

## 12. Distribution

- `npm pkg` published as `@mithgard/bnb-mcp` (private until pitch sent).
- Docker image `ghcr.io/mithgard/bnb-mcp` (multi-arch, distroless).
- One-line install snippet for `claude_desktop_config.json` in README.

## 13. Roadmap (post-MVP)

| Phase | Trigger | Adds |
|---|---|---|
| v0.1 | scaffold complete | 2 live tools functional, 7 mock tools labeled |
| v0.2 | first pitch sent | Pitch deck + landing page |
| v0.3 | feedback round 1 | Hardening based on reviewer notes |
| v1.0 | Airbnb Partner API access OR community traction | Real implementations of mock tools |

## 14. The 100–200 Prompt Build Catalog

The implementation plan will not be a prose checklist. It will be a **catalog of 100–200 self-contained prompts**, each one runnable by an agent (Claude Code / Codex), each one ending in a commit. Catalog lives at `docs/prompts/build-catalog.md` and is generated by the `writing-plans` skill in the next step.

Catalog structure (planned):

| Block | Prompts | Description |
|---|---|---|
| 0. Foundation | 1–15 | git init, package.json, tsconfig, eslint, prettier, husky, vitest, CI, Docker |
| 1. Core libs | 16–30 | http, cache, result, errors, logger, env |
| 2. MCP scaffolding | 31–40 | server bootstrap, tool registry, schema validation harness |
| 3. Live tools | 41–70 | parser, fixtures, search tool, listing-details tool, tests |
| 4. Mock tools | 71–120 | 7 tools × ~7 prompts each (schema, handler, fixture, test, doc) |
| 5. Observability | 121–135 | pino, OTEL, request_id, metrics |
| 6. DX & docs | 136–155 | README, ADRs, tool docs, examples, claude-desktop config |
| 7. Pitch material | 156–175 | cold email, LinkedIn DM, one-pager, landing v0 |
| 8. Release | 176–200 | changesets, npm publish dry-run, Docker build, GH release |

Each prompt is shaped: **precondition → action → acceptance criterion → commit message**.

## 15. Out of scope for v1

- Multi-language host-voice (German + English only).
- VRBO / Booking.com adapters.
- Mobile / web UI.
- Multi-tenant mode.
- Real-time webhooks (deferred to Partner API integration).

## 16. Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Airbnb changes public HTML | High | Version-pinned parsers, fixture-driven tests, fast WARN→FIX loop |
| Airbnb rejects pitch | Medium | The repo stands alone as a Mithgard showcase regardless |
| Scope creep into 7 mock tools "let me make this real" | High | Hard rule in CLAUDE.md: mocks stay mocks until Partner API |
| Time burn vs. Mundart / BAU priorities | High | Catalog-driven build → resumable, parkable, no half-finished state |

## 17. Success criteria

This spec is "done" when:
- [ ] User has approved this document.
- [ ] `writing-plans` skill has emitted `docs/prompts/build-catalog.md` with 100–200 entries.
- [ ] First commit on `main` carries: this spec, CLAUDE.md, prompt catalog, baseline `package.json` + `tsconfig.json`.
