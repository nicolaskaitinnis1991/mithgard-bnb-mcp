# Mithgard BnB MCP

**The host-side Airbnb MCP server that doesn't exist yet — open source, audit-ready, written by a host.**

---

## Problem

Individual Airbnb hosts can't get a Partner API key. Community scrapers cover guest-side search;
nothing covers host-side workflows. There is no MCP server, no agent SDK, no programmatic surface for the
work hosts actually do every day: guest messages, booking triage, pricing, calendar, reviews, turnovers.
Hosts who use Claude or Cursor have no way to wire their AI into Airbnb without a third-party PMS.

## Solution

A production-grade Model Context Protocol server. Two tools live today on public Airbnb data
(`airbnb_search`, `airbnb_listing_details`). Seven host-side tools are fully designed, schema-checked,
and fixture-backed mocks waiting for Partner API access. Each demo tool documents the exact endpoint it
would consume. Drop a real API behind them and they ship — no rewrite, no architectural change.

## The 9 tools

| Tool | Status | What it does |
|---|---|---|
| `airbnb_search` | live | Search public listings by location / dates / guests / price |
| `airbnb_listing_details` | live | Full public listing details: price, host, reviews, amenities |
| `host_insights` | demo | Per-listing dashboard: occupancy, ADR, RevPAR, review velocity |
| `guest_message_assistant` | demo | Drafts on-brand guest replies using house-rules context |
| `booking_request_triage` | demo | Scores inbound requests against host rules |
| `smart_pricing` | demo | Dynamic rates vs. local comp set + seasonality |
| `calendar_optimizer` | demo | Detects gap-nights, blocks, min-stay misalignments |
| `review_responder` | demo | Drafts review replies tuned to rating + sentiment |
| `turnover_coordinator` | demo | Coordinates check-out → cleaning → check-in handoff |

## Why this team

Mithgard is the umbrella brand for a small portfolio of AI-native tools, founded by Nico Kaitinnis — solo
founder, Airbnb Superhost, ex-handwerksbetrieb-operator-turned-engineer. Every tool in the repo is built
on workflows the founder runs himself. The repo is the artifact: 95+ commits, conventional, Husky-
enforced. No outsourced code. No marketing fluff.

## Technical proof points

TypeScript strict, ESM, MCP SDK over stdio. `Result<T, E>` tagged unions, no thrown errors. `undici` HTTP
with `p-queue` rate limiting and `lru-cache`. Structured `pino` logs with per-request IDs. Zod-validated
schemas at every tool boundary. 75 passing tests across unit / integration / e2e. Distroless Docker.
GitHub Actions CI: lint + typecheck + test + CodeQL. Husky-enforced conventional commits. 100% typed
surface, zero `any`.

## Call to action

Either Airbnb takes it (MIT license, no strings) or Airbnb opens Partner API access for individual hosts
and the seven mock tools become real on day one. Asking for 20 minutes to walk through the architecture
and the demo. Repo: `github.com/nicolaskaitinnis1991/mithgard-bnb-mcp` (private, share on request).

---

**Nico Kaitinnis** · Founder, Mithgard · `nicolaskaitinnis1991@gmail.com` · [mithgard.ai](https://mithgard.ai)
