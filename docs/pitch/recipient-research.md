# Recipient Research Playbook

> Living document. Fill in actual names as research turns them up. Don't send anything until at
> least 3 plausible recipients are identified — first batch should be staggered (Day 0, +3, +7) so
> the funnel has redundancy without looking like a mass blast.

---

## Suggested target roles

The right recipient is someone who **(a)** owns a host-side developer or AI surface and **(b)** is
senior enough to sponsor an experiment without seeking VP approval but junior enough to actually read
their LinkedIn DMs. Order is by signal strength.

1. **Head of Host Tools** / Director of Host Product — owns the host-side experience. Most direct fit.
2. **Head of Platform Engineering** / VP Platform — owns the API surface decision. Higher leverage but
   harder to reach.
3. **Head of Applied AI / Head of AI Foundations** — owns the company's stance on agent integrations
   and MCP. Most likely to have already thought about this exact problem.
4. **Head of Developer Experience** / Director of Developer Platform — if Airbnb has named such a role,
   they own the Partner API roadmap.
5. **Head of Trust & Safety, Hosts** — defensive recipient: useful as a co-pitch later because they
   would want to vet the security posture before the engineering team commits.

## LinkedIn search strings

Run each, sort by company = "Airbnb", filter People only, sort by current role.

- `"Head of Host" Airbnb`
- `"Director" "Host" Airbnb`
- `"VP Engineering" Airbnb` filter by AI / Platform / Host
- `"Head of Platform" Airbnb`
- `"Head of AI" Airbnb`
- `"Applied AI" Airbnb`
- `"Developer Platform" Airbnb`
- `"Partner API" Airbnb` (people who literally talk about Partner API on LinkedIn)
- `"Host Product" Airbnb`

## Cross-references

- Airbnb engineering blog (`medium.com/airbnb-engineering`) — find author bylines for AI / platform
  posts in the last 12 months. Engineers who blog tend to be reachable.
- Recent conference talks (RailsConf, KubeCon, AI Engineer Summit) by Airbnb engineers — speakers are
  warmer leads than non-speakers.
- Airbnb GitHub org (`github.com/airbnb`) — top contributors on platform / infra repos are real engineers
  doing this work today.

## Outreach tracker

| # | Name | Title | LinkedIn | Email if known | Status | Sent date | Channel | Next action |
|---|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  | RESEARCH |  |  |  |
| 2 |  |  |  |  | RESEARCH |  |  |  |
| 3 |  |  |  |  | RESEARCH |  |  |  |
| 4 |  |  |  |  | RESEARCH |  |  |  |
| 5 |  |  |  |  | RESEARCH |  |  |  |

**Status values:** `RESEARCH` (still profiling) → `READY` (researched, ready to send) → `SENT` →
`RESPONDED` → `FOLLOW-UP` (need a +3 / +7 nudge) → `MEETING` → `CLOSED-WIN` / `CLOSED-NOREPLY`.

## Recommended cadence

- **Day 0** — LinkedIn DM (Variant A, ~800 chars) to recipient #1. Soft connection request with note.
- **Day +3** — if no response: short follow-up DM ("worth a quick look?") + send the cold email
  (`airbnb-cold-email.md`) to recipient #2 in parallel.
- **Day +7** — if still no response from #1: second-touch DM with one new piece of value (e.g. "added
  one more demo tool today" or "live demo video now ready"). Send cold email to recipient #3.
- **Day +14** — if no response from anyone in batch 1: regroup. Either widen to 3 new recipients (batch
  2) or change the message. Don't keep nudging the same person past two follow-ups.

## Anti-patterns (do not do)

- Mass-blast the same DM to 10 people in one day — LinkedIn flags it, and it kills the founder-voice
  credibility instantly.
- Send a follow-up that just says "bumping this" with no new content. Always add a piece of value.
- Send to a public PR / press contact. They are not the technical decision-maker.
- Mention pricing / commercial terms in the first message. The pitch is "either you take it MIT or
  open the API and I ship it" — neither has a dollar figure attached.
- Send before the repo README / LICENSE / pitch material are all final. The first thing the recipient
  does is open the repo. It must look done.

## Pre-send checklist (final pass before any DM goes out)

- [ ] Repo README is the pitch-grade version (not the scaffolding stub).
- [ ] LICENSE file exists at repo root.
- [ ] All 5 pitch documents in `docs/pitch/` are final and proofread.
- [ ] CI is green on `main` (lint + typecheck + test).
- [ ] Tag `pitch-ready` exists on `main`.
- [ ] Recipient name and (if cold email) repo URL placeholders are filled in.
- [ ] LinkedIn URL in cold email signature is the recipient's connection-graph match (not a stale handle).
