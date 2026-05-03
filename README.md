# Mithgard BnB MCP

> A production-grade Model Context Protocol server for Airbnb hosts.
> Built by hosts, for hosts, on the way to a real Airbnb Partner API for AI agents.

**Status:** v0.0.0 — scaffolding. See [`CLAUDE.md`](./CLAUDE.md) for vision and [`docs/specs/`](./docs/specs/) for the design.

---

## What it is

An MCP server that lets an AI agent (Claude Desktop, Claude Code, Cursor, etc.) operate Airbnb workflows the way it already operates email or calendar.

- **2 live tools** on public Airbnb data (`airbnb_search`, `airbnb_listing_details`)
- **7 mock tools** for host-side workflows that need Partner API access (`host_insights`, `guest_message_assistant`, `booking_request_triage`, `smart_pricing`, `calendar_optimizer`, `review_responder`, `turnover_coordinator`)

The mock tools aren't placeholders — they're spec'd, schema'd, fixture'd, documented surface area. Drop a real Airbnb Partner API behind them and they ship.

## Why

Individual hosts can't get Airbnb Partner API access today. We host on Airbnb. We use Claude. We wanted Claude to handle our guest comms, pricing, calendar, and turnovers. We built the missing piece. This repo is also a pitch — see [`docs/pitch/`](./docs/pitch/).

## Status

Pre-alpha. Repo is private until the pitch is sent.

## License

MIT (default; revisable before public release).
