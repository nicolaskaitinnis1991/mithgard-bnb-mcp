> Historical May 2026 material. Claims, counts and workflows below are not current verification evidence. See [the current README](../../README.md) and [October verification](../readiness-2026-10-01.md). No outreach or deployment is authorized by this file.

# LinkedIn DM — short variant

> LinkedIn DM character limit: ~1300 connection-request char limit, ~8000 message char limit.
> This variant is tuned for ~800 chars to fit a connection-request note plus stay punchy in a regular DM.
> Keep it founder-voice, no formal subject line, no "I hope this finds you well".

---

## Variant A — connection request note (≤ 800 chars)

Hi [Recipient name] — Superhost + Claude power user here. Noticed Airbnb has no host-side MCP server, so I built it: 2 live tools on public data, 7 host-side tools fully spec'd and schema-checked, waiting on Partner API. Production-grade TS, 75 tests, distroless Docker, zero scraping past public pages. Reviewable artifact, MIT-licensed, repo private until I find the right person on your side. Worth a 20-min walkthrough? — Nico, Mithgard

---

## Variant B — full DM (after they accept)

Hey [Recipient name], thanks for connecting.

Quick context: I'm a Superhost, I run my whole hosting workflow through Claude, and I wanted Claude to do
guest messages / pricing / calendar / reviews / turnovers — not just search. Airbnb has nothing for that
on the host side for individual hosts, so I built the reference implementation as an MCP server.

Two live tools on public Airbnb data (search + listing details), seven host-side tools fully designed
with real schemas and fixtures, waiting on Partner API access. TypeScript strict, 75 tests, distroless
Docker, MIT. The mock tools document the exact endpoint shape they'd need from a real API.

Happy to walk you through it in 20 minutes, or send it to whoever owns the host developer-platform
roadmap. Repo link on request.

— Nico Kaitinnis · Mithgard · nicolaskaitinnis1991@gmail.com
