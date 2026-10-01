> Historical May 2026 material. Claims, counts and workflows below are not current verification evidence. See [the current README](../../README.md) and [October verification](../readiness-2026-10-01.md). No outreach or deployment is authorized by this file.

# Cold Email — Airbnb Host Tools / Platform Engineering

> Drop the recipient name in `[Recipient name]` and the repo URL in `[link to repo]` before sending.
> Subject line tested for clarity and intrigue. Three short paragraphs only.

---

**Subject:** We built the host-side Airbnb MCP you don't have yet — open source, audit-ready

Hi [Recipient name],

I'm a Superhost and a Claude power user. I wanted Claude to handle my guest messages, booking triage,
pricing, calendar, and review replies the way it already handles my inbox — and noticed Airbnb has no
host-side API for individual hosts and no MCP server. So I built the reference implementation: a
production-grade TypeScript MCP server with two live tools on public data (`airbnb_search`,
`airbnb_listing_details`) and seven host-side tools fully designed, schema-checked, and fixture-backed,
waiting only for Partner API access to go live.

The repo is meant as a reviewable artifact for your team, not marketing: 75 passing tests, distroless
Docker, zero scraping beyond public pages, no login flows, no PII storage, conservative rate limiting,
polite UA. Each demo tool returns the exact endpoint shape it would need from a real Partner API, so a
half-day's wiring on your side turns the whole thing into something hosts can install via
`claude_desktop_config.json` in 60 seconds. Code: [link to repo] (private — happy to share access).

Two asks, either is great: **(1)** a 20-min walkthrough so I can show you what hosts could do with this
the day Partner API access opens, or **(2)** a pointer to whoever owns the host-side developer-platform
roadmap. Either way, it's MIT-licensed and yours if useful.

Best,
Nico Kaitinnis
Founder, Mithgard · `nicolaskaitinnis1991@gmail.com`
[mithgard.ai](https://mithgard.ai) · LinkedIn: `/in/nicolaskaitinnis`
