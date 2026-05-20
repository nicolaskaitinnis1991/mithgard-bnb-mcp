# Mithgard BnB MCP

> The host-side Airbnb MCP server that doesn't exist yet — open source, audit-ready, written by a host.

[![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Status: pre-alpha](https://img.shields.io/badge/status-pre--alpha-orange.svg)](#status)
[![Version](https://img.shields.io/badge/version-0.1.0--alpha-orange)](./CHANGELOG.md)
[![MCP](https://img.shields.io/badge/protocol-MCP-7c3aed.svg)](https://modelcontextprotocol.io)
<!-- CI badge renders externally once repo visibility flips to public -->
[![CI](https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp/actions/workflows/ci.yml)

---

## What it is

A production-grade [Model Context Protocol](https://modelcontextprotocol.io) server that lets an AI agent
(Claude Desktop, Claude Code, Cursor, any MCP client) operate Airbnb workflows the way it already operates
email or calendar. Two tools work today on public Airbnb data. Seven tools are fully designed, schema-checked,
fixture-backed mocks waiting for Airbnb Partner API access. Everything is typed, tested, observable, and
shipped as a single distroless Docker image.

## Why it exists

Individual Airbnb hosts can't get a Partner API key. The community scrapers cover guest-side search; nothing
covers host-side workflows. I host on Airbnb. I use Claude every day. I wanted Claude to handle my guest
messages, booking triage, pricing, calendar, reviews, and turnovers — the way it already handles my inbox.
Nothing existed. So I built the reference implementation, with a clean schema for every tool an Airbnb
engineer would need to wire to a real API, and shipped it as the missing layer.

## The 9 tools

| Tool | Status | What it does |
|---|---|---|
| `airbnb_search` | live | Search public listings by location, dates, guests, price |
| `airbnb_listing_details` | live | Pull full details for a public listing (price, host, reviews, amenities) |
| `host_insights` | demo | Per-listing dashboard: occupancy, ADR, RevPAR, review velocity |
| `guest_message_assistant` | demo | Drafts on-brand replies to guest messages with house-rules context |
| `booking_request_triage` | demo | Scores inbound booking requests against host-defined rules |
| `smart_pricing` | demo | Dynamic nightly-rate suggestions vs. local comp set + seasonality |
| `calendar_optimizer` | demo | Detects gap-nights, blocks, minimum-stay misalignments |
| `review_responder` | demo | Drafts review replies tuned to rating + sentiment |
| `turnover_coordinator` | demo | Coordinates check-out → cleaning → check-in handoff |

Demo tools return `_mock: true` and a `_pitch` field documenting the Partner API endpoint they would consume.
The schemas, fixtures, and handler shape are real — drop a real API behind them and they ship.

## Install & run

**Prerequisites:** Node 20+, an MCP-capable client (e.g. Claude Desktop).

```bash
git clone https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp
cd mithgard-bnb-mcp
npm ci
npm run build
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mithgard-bnb": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mithgard-bnb-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. The 9 tools appear in the tool picker.

A distroless Docker image is also provided (`Dockerfile`) for self-hosting.

## Architecture

TypeScript strict mode, ESM, MCP SDK over stdio. Pure-function handlers behind Zod-validated schemas. HTTP
via `undici` with per-host rate limiting (`p-queue`) and LRU caching (`lru-cache`). Structured logs via
`pino` with per-request IDs. `Result<T, E>` tagged unions instead of thrown errors. 100% typed surface, no
`any`. Distroless Docker image, GitHub Actions CI (lint + typecheck + test + CodeQL), Husky-enforced
conventional commits.

Full design rationale: [`docs/specs/2026-05-03-mithgard-bnb-mcp-design.md`](./docs/specs/2026-05-03-mithgard-bnb-mcp-design.md).
Per-tool docs: [`docs/tools/`](./docs/tools/).

## Honesty section — what this is NOT

- **Not a Partner API client.** No Airbnb Partner API access exists for individual developers. The seven
  host-side tools are mocks with production-shaped schemas.
- **Not a host-account write tool.** The two live tools read public data only — no login, no impersonation,
  no actions on behalf of an account.
- **Not a ToS gray zone.** No login flows, no captcha bypassing, no cookie/session theft, no PII storage.
  Public Airbnb pages only, conservative rate limiting, polite User-Agent. Designed to survive a legal /
  security review at Airbnb.
- **Not a PMS replacement.** No multi-platform aggregation, no billing, no payments, no inventory writes.

## Pitch story

This repo is also a pitch artifact. If you're at Airbnb (Host Tools / Platform Engineering / Applied AI):
the cold email, one-pager, value-prop matrix, and outreach playbook live in [`docs/pitch/`](./docs/pitch/).
Open Partner API access for individual hosts and the seven mock tools become real on day one.

## Status

- **Version:** `v0.1.0-alpha` — tagged, not yet on npm or ghcr.io (public-flip pending, see [`docs/PRODUCTION-GAP-PLAN.md`](./docs/PRODUCTION-GAP-PLAN.md)).
- **Tests:** 118 passing (+2 skipped), 39 test files. All 4 gates green (`npm run lint` / `npm run typecheck` / `npm test` / `npm run build`).
- **Coverage thresholds:** 80 / 50 / 80 / 80 (lines / branches / functions / statements), enforced in CI.
- **Commits:** 170+ on `main`, conventional, Husky-enforced.
- **CI:** GitHub Actions green on every push to `main` (lint + typecheck + test + build + CodeQL).
- **Tags:** `foundation-complete`, `core-libs-complete`, `mcp-scaffolding-complete`, `search-tool-complete`,
  `listing-tool-complete`, `mock-tools-complete`, `pitch-ready`, `v0.1.0-alpha`.

## License

[MIT](./LICENSE) — Copyright 2026 Nico Kaitinnis / Mithgard.

## Contact

**Nico Kaitinnis** — solo founder, Mithgard.
Email: `nicolaskaitinnis1991@gmail.com`
LinkedIn: `https://www.linkedin.com/in/nicolaskaitinnis/` *(placeholder — confirm before sending)*
Site: [mithgard.ai](https://mithgard.ai)
