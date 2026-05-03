# CLAUDE.md — Mithgard BnB MCP

> **Agent context file.** Every Claude Code / Codex / Copilot agent that touches this repo reads this first. Keep it crisp, keep it true, keep it the source of truth for vision and constraints.

---

## 1. Vision (one paragraph)

**Mithgard BnB MCP** is a Model Context Protocol server that gives AI agents structured, host-grade access to Airbnb. Today it works on public data only (search, listing details). Its real purpose is to be the **reference implementation** Airbnb adopts — or licenses — once they open a Partner-grade API for AI agents. We built it because we host on Airbnb ourselves, we noticed the gap, and we'd rather build the missing piece than wait for it.

## 2. Why this exists

- **For us:** automate guest messaging, booking triage, pricing, calendar gaps, review responses, and turnover coordination on our own listings.
- **For other hosts:** ship the same automation as a clean, open MCP — no scraper hacks, no ToS gray zones.
- **For Airbnb:** demonstrate, in working code, the surface area of a host-grade AI API. This repo is the pitch.

## 3. North-star metric

A host using this MCP saves **5–10 hours/week** on guest comms, pricing, and ops — without losing personality, accuracy, or compliance with Airbnb's Hospitality Standards.

## 4. Non-goals (NEVER do these)

- ❌ **No scraping that violates Airbnb ToS.** Public read-only endpoints only. No login replay. No session hijacking.
- ❌ **No write-side spoofing.** If we don't have the official Partner API, the tool is **mocked and clearly labeled** — never silently degraded.
- ❌ **No PII storage.** We pass through, we don't persist guest data. Local cache is opt-in and time-bound.
- ❌ **No financial actions.** No payouts, no refunds, no chargebacks. Read-only on money. Always.
- ❌ **No "AI on auto-pilot" without approval gates.** Every outbound action (message, price change, decline) routes through a human approval step by default.

## 5. Architecture (one screen)

```
┌──────────────────────────────────────────────────────────────┐
│                    AI Agent (Claude / etc.)                  │
└────────────────────────┬─────────────────────────────────────┘
                         │ stdio / SSE
┌────────────────────────▼─────────────────────────────────────┐
│              Mithgard BnB MCP Server (TS)                    │
│  ┌────────────┐  ┌─────────────────┐  ┌──────────────────┐   │
│  │ Tool       │  │ Validation      │  │ Telemetry        │   │
│  │ Registry   │  │ (Zod schemas)   │  │ (pino, OTEL)     │   │
│  └──────┬─────┘  └────────┬────────┘  └─────────┬────────┘   │
│         │                 │                     │            │
│  ┌──────▼─────────────────▼─────────────────────▼────────┐   │
│  │ 9 Tools (2 live · 7 mock until Partner API)           │   │
│  └──────┬───────────────────────────────────┬────────────┘   │
│         │                                   │                │
│  ┌──────▼─────────┐                  ┌──────▼──────────┐     │
│  │ Public Data    │                  │ Mock Fixtures   │     │
│  │ (search, list) │                  │ (host insights, │     │
│  │ rate-limited,  │                  │  guest msgs,    │     │
│  │ cached         │                  │  pricing, etc.) │     │
│  └────────────────┘                  └─────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

## 6. The 9 Tools

| # | Tool | Status | Source |
|---|---|---|---|
| 1 | `airbnb_search` | ✅ Live | Public search |
| 2 | `airbnb_listing_details` | ✅ Live | Public listing |
| 3 | `host_insights` | 🚧 Mock | Needs Partner API |
| 4 | `guest_message_assistant` | 🚧 Mock | Needs Partner API |
| 5 | `booking_request_triage` | 🚧 Mock | Needs Partner API |
| 6 | `smart_pricing` | 🚧 Mock | Needs Partner API |
| 7 | `calendar_optimizer` | 🚧 Mock | Needs Partner API |
| 8 | `review_responder` | 🚧 Mock | Needs Partner API |
| 9 | `turnover_coordinator` | 🚧 Mock | Needs Partner API |

Each tool has its own folder under `src/tools/<name>/` with: `tool.ts`, `schema.ts` (Zod), `handler.ts`, `*.test.ts`, and a fixture (for mocks) or live adapter (for public-data tools).

## 7. Tech stack (non-negotiable)

- **Language:** TypeScript (strict, ES2022, Node 20+)
- **MCP SDK:** `@modelcontextprotocol/sdk` (official)
- **Validation:** `zod` for every tool input/output
- **HTTP:** `undici` + `p-queue` (rate limit) + `lru-cache`
- **Logging:** `pino` (structured JSON)
- **Tests:** `vitest` + `msw` for HTTP mocking
- **Lint:** `eslint` (flat config) + `prettier`
- **Hooks:** `husky` + `lint-staged` + `commitlint` (Conventional Commits)
- **CI:** GitHub Actions (lint, typecheck, test, build, codeql)
- **Release:** `changesets` for SemVer
- **Docker:** Multi-stage build, distroless runtime
- **Docs:** Markdown in `docs/`, ADRs in `docs/adr/`

## 8. Constraints inherited from Mithgard portfolio

(From `~/.claude/projects/.../memory/MEMORY.md`:)

- **Build right first time.** Full infra from day one — no "we'll add tests/CI/types later."
- **99% certainty default.** Verify before asserting; double-check all assumptions.
- **No mocks in production code paths.** Mocks live in `src/mocks/` and are explicitly imported by mock tools only.
- **Real services in tests.** Integration > unit when feasible. No mock-everything tests.
- **Always check existing.** Before adding any new helper, grep the repo.

## 9. Pitch story (the why behind the what)

> "We host on Airbnb. We use Claude. We wanted Claude to handle our guest messages, booking requests, pricing, and turnovers — the way it handles our email. We discovered Airbnb has no host-side API for individual hosts and no MCP. So we built the reference implementation: 2 working tools on public data, 7 designed-and-spec'd tools waiting for Partner API access. Take it. Audit it. License it. Or open the API and let us ship it for real."

Pitch material lives in `docs/pitch/`:
- `airbnb-cold-email.md` — to Head of Host Tools / Head of Platform Eng
- `linkedin-dm.md` — short variant
- `one-pager.md` — for engineering leads

## 10. Where things live

- `src/` — production code only. No experimental scratch.
- `tests/` — `unit/`, `integration/`, `e2e/`. One folder per kind.
- `docs/specs/` — design specs (this is the source of truth before code).
- `docs/prompts/` — the 100–200 prompt build catalog used to drive agent-led development.
- `docs/adr/` — architecture decision records.
- `docs/tools/` — one user-facing doc per tool.
- `docs/pitch/` — Airbnb-facing material.
- `examples/` — `claude-desktop-config.json`, end-to-end usage examples.
- `scripts/` — dev/build/publish helpers, not application code.

## 11. Workflow rules for agents

1. **Read the spec first** (`docs/specs/2026-05-03-mithgard-bnb-mcp-design.md`).
2. **Read the prompt catalog** (`docs/prompts/build-catalog.md`) — work top-to-bottom, one prompt at a time, commit after each.
3. **Conventional commits.** `feat(tool): add airbnb_search`, `fix(http): handle 429`, etc.
4. **Every tool change ships with tests.** No exceptions. Coverage gates in CI.
5. **No new dependency** without an ADR.
6. **No tool added** without: schema, handler, test, doc, registry entry.
7. **Mocks must be obvious.** Every mock tool starts its description with `[DEMO]` and emits a `_mock: true` field in output.

## 12. Open questions / decisions still live

- [ ] Airbnb pitch recipient: name + email (LinkedIn first?)
- [ ] License: MIT vs Apache-2.0 (default: MIT until decided)
- [ ] Public release timing: stay private until pitch sent? (default: yes)

## 13. Status

**v0.0.0 — scaffolding.** Spec written, repo initialized, 0/9 tools implemented. Build catalog is the next artifact.
