> Historical May 2026 material. Claims, counts and workflows below are not current verification evidence. See [the current README](../../README.md) and [October verification](../readiness-2026-10-01.md). No outreach or deployment is authorized by this file.

# Competitive Landscape

> Where this project sits relative to existing tools that touch Airbnb workflows. This is honest:
> the named PMS players solve a different (and larger) problem set. We compare on the dimensions
> that matter for the MCP-native, host-side, AI-agent-first niche this project is built for.

---

## Comparison table

| Project | Scope (read / PMS) | Partner-API access | Host-side workflows covered | MCP-native | License | Notes |
|---|---|---|---|---|---|---|
| **mithgard-bnb-mcp** (this project) | Read-only on public Airbnb pages; 7 schema-checked mocks for host-side flows | No (designed to *receive* access; mocks document the exact endpoints needed) | 7 (insights, messages, triage, pricing, calendar, reviews, turnover) | Yes — native MCP server over stdio, 9 tools | MIT | Solo-built, audit-ready, distroless Docker, 118 tests. The reference implementation for an MCP layer on top of Airbnb. |
| [openbnb/mcp-server-airbnb](https://github.com/openbnb-org/mcp-server-airbnb) | Read-only on public Airbnb pages (guest-side discovery) | No | 0 host-side; ~2 guest-side (search, listing) | Yes — MCP server | MIT | Closest neighbour by tech stack. Focused on guest-side search; explicit non-goal of host workflows. We complement, we don't replace. |
| [Hostaway](https://www.hostaway.com/) | Full PMS — multi-platform aggregation (Airbnb, Vrbo, Booking.com, Expedia, direct) | Yes — channel manager partnership | All host workflows + cross-platform reconciliation, billing, accounting, unified inbox | No (REST + webhooks; no MCP) | Proprietary (closed source) | Enterprise PMS. ~$200+/month/listing. Targets professional 5+-listing hosts and property managers. Different buyer, different budget. |
| [Smoobu](https://www.smoobu.com/) | Full PMS — channel manager + website builder + bookings | Yes — channel manager partnership | All host workflows + cross-platform sync, channel manager, accounting | No (REST API; no MCP) | Proprietary (closed source) | German PMS, ~€25–€60/month/listing. Strong in EU SMB host segment. Web UI + REST API, not agent-native. |
| [Hospitable](https://hospitable.com/) | Full PMS — heavy on AI-assisted guest messaging | Yes — channel manager partnership | All host workflows; their differentiator is AI auto-reply | No (REST + webhooks; no MCP) | Proprietary (closed source) | Closest in *spirit* to what `guest_message_assistant` aims at, but locked inside their UI. ~$30+/month/listing. The user can't bring their own AI. |

---

## Why we're different

Three honest reasons:

1. **MCP-native, not API-with-AI-glued-on.** Hostaway, Smoobu, and Hospitable expose REST APIs. Even
   Hospitable's AI features live inside *their* product — the host can't point Claude at them. This
   project ships an MCP server, which means any MCP client (Claude Desktop, Claude Code, Cursor,
   Continue, Cline, future agents) can call the tools natively. The agent is the host's, not the
   vendor's.

2. **Host-side surface area, not guest-side or PMS-side.** openbnb covers guest-side discovery
   (search, listing details) and explicitly stops there. The PMS players go the other way and cover
   *everything* — channel management, billing, multi-platform aggregation — which is overkill (and
   wrong budget) for the ~80% of Airbnb hosts who run 1–3 listings and only want Claude to handle
   the repetitive workflows. This project fills the gap exactly between the two, and the 7-tool
   shape mirrors the 7 daily-pain workflows ([value-prop-matrix.md](value-prop-matrix.md)).

3. **Designed to receive Partner-API access, not work around its absence.** The 7 demo tools are
   not scrapers, not session-stealers, not captcha-bypassers. They are production-shaped schemas
   with mocked handlers, each `_pitch` field naming the Airbnb endpoint a real implementation would
   call. The repo is built to be the reference implementation Airbnb's Host Tools team could review
   like an internal PR and approve in a sitting — and that's the explicit pitch.

---

## What this project is NOT competing with

- **Hostaway / Smoobu / Hospitable on the PMS surface.** Those companies have years of
  channel-manager engineering, billing, accounting, and multi-platform sync. We don't and won't
  ship that. If you have 10+ listings across 3+ platforms, you need a real PMS.
- **openbnb on guest-side search.** Their tool is fine; we use it as prior art. Our `airbnb_search`
  and `airbnb_listing_details` exist to give Claude a complete picture (comp-set discovery is a
  host workflow too), not to replace openbnb for guest-side agents.
- **The (hypothetical) future official Airbnb MCP server.** If Airbnb ships one, our project
  becomes either the reference architecture they study or a thin community wrapper around their
  official server. Both outcomes are fine.

---

## Reference architecture, not a moat

This is a *reference implementation*. It is MIT-licensed on purpose. The pitch to Airbnb is not
"buy our company"; it's "open Partner-API access to individual hosts, and here is the layer your
ecosystem already needs." If a PMS adopts the patterns, that is a win. If Airbnb forks the repo,
that is a bigger win. The 7 host-side workflows are too important to gate behind any single vendor's
proprietary AI feature.
