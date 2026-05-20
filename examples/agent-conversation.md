# Agent conversations — host-side demo tools

> Three end-to-end transcripts using the **demo tools** (the 7 host-workflow
> tools that currently return deterministic mock data while waiting on
> Airbnb Partner API access). Each scenario chains 2-3 tools the way an
> actual host-agent would. All tool responses below are produced by the
> real fixture code in `src/mocks/` — they match exactly what the running
> server emits.

Caveat reproduced for every scenario: these tools always set `_mock: true`
and `_pitch: "..."`. The contracts are stable; the data sources are not yet
live. See [ADR-0005 mock-vs-live honesty](../docs/adr/0005-mock-vs-live-honesty.md).

For the live tools (search + listing details), see
[`usage.md`](./usage.md).

---

## Scenario 1 — Host triages a borderline booking request

**Setting:** A host gets a booking request from a guest who joined Airbnb
last month, has zero prior reviews, isn't ID-verified, and wants to book
one night. The host asks the agent to look at it.

### User

> Got a booking request — guest joined April 1st 2026, no reviews, not ID
> verified, 2 adults, no kids or pets, 1-night stay. Worth taking?

### Claude (reasoning)

> The user wants a triage call on a new booking request. `booking_request_triage`
> takes guest profile + trip facts and returns an auditable score. After the
> score I should look at how to phrase a decline-with-kindness reply via
> `guest_message_assistant`.

### Tool call (1/2)

```json
{
  "method": "tools/call",
  "params": {
    "name": "booking_request_triage",
    "arguments": {
      "thread_id": "thread-bnb-9912",
      "guest_profile": {
        "joined": "2026-04-01",
        "reviews": 0,
        "verified": false
      },
      "trip": {
        "adults": 2,
        "children": 0,
        "pets": false,
        "nights": 1
      }
    }
  }
}
```

### Tool response (real fixture output)

Score build-up against 2026-05-03 reference date:
50 base + 20 (account <6mo) + 15 (0 reviews) + 10 (unverified) + 10 (1-night) = 105 → clamped to 100.

```jsonc
{
  "risk_score": 100,
  "recommendation": "auto_decline",
  "reasoning": [],
  "red_flags": [
    "Account younger than 6 months (0.08 yr).",
    "No prior reviews on Airbnb.",
    "Identity not verified.",
    "Single-night stay (party-risk pattern)."
  ],
  "green_flags": [],
  "_mock": true,
  "_pitch": "Risk-scores guests with auditable reasoning, never auto-acts without approval"
}
```

### Tool call (2/2) — draft a polite decline

```json
{
  "method": "tools/call",
  "params": {
    "name": "guest_message_assistant",
    "arguments": {
      "thread_id": "thread-bnb-9912",
      "last_message": "Hi, would like to book for 1 night, thanks.",
      "host_voice": "warm"
    }
  }
}
```

### Tool response

```jsonc
{
  "suggestions": [
    { "tone": "short",    "text": "Thanks for reaching out — getting back to you shortly." },
    { "tone": "friendly", "text": "Hi! Thanks for the message — I will get back to you with details shortly." },
    { "tone": "formal",   "text": "Dear guest, thank you for your message. I will respond with the requested information shortly." }
  ],
  "recommended_index": 1,
  "approval_required": true,
  "_mock": true,
  "_pitch": "Drafts host-voiced replies with approval gate"
}
```

### Claude (synthesised reply)

> The triage score is **100/100 → auto_decline**. Four red flags stacked on
> this request:
>
> - Account is ~5 weeks old (penalty for accounts < 6 months).
> - Zero prior reviews on Airbnb.
> - Identity not verified.
> - Single-night stay (party-risk pattern in this scorer).
>
> No green flags balance them out. I'd recommend declining.
>
> The guest hasn't said much in the thread yet, so the message library didn't
> pick up a specific topic — the draft replies are the generic
> acknowledgement template. None of them are a decline message, so for the
> actual reply I'd suggest something hand-written like:
>
> > "Hi — thanks for the interest. Unfortunately I can't host this stay.
> > I generally only take bookings from accounts with at least one review
> > and a verified ID — it's a policy that keeps things smooth for
> > everyone. Best of luck with your trip!"
>
> Want me to send the polite acknowledgement template now and you reply
> personally to the decline reason, or shall I draft the decline directly?

> **Mock-data caveat:** the triage scoring above is real (the actual
> deterministic algorithm — same inputs always produce score 100). What's
> mocked is the fact that real guest profiles aren't being pulled from
> Airbnb; the agent took the host's verbal description and fed it in.
> With Partner API access, the agent would call Airbnb to fetch the
> guest's verified profile and bypass the description step.

---

## Scenario 2 — Pricing the next 30 days

**Setting:** Listing 12345 has been quietly under-priced. The host asks the
agent to figure out where the money is leaking.

### User

> Take a look at how listing 12345 is doing and tell me what to do about
> pricing for the next few weeks.

### Claude (reasoning)

> Start broad with `host_insights` for the listing's current performance vs
> the local market. If insights flag pricing as the issue, run
> `smart_pricing` for a per-day plan. Then check `calendar_optimizer` to
> see whether there are also concrete gaps to attack with discounts or
> min-stay changes.

### Tool call (1/3)

```json
{ "method": "tools/call",
  "params": {
    "name": "host_insights",
    "arguments": { "listing_id": "12345", "period": "last_30d" }
  }
}
```

### Tool response (under-performing fixture profile)

```jsonc
{
  "occupancy_rate": 0.52,
  "revenue_eur": 3120,
  "competitor_avg_revenue_eur": 4480,
  "delta_pct": -30.4,
  "pricing_recommendations": [
    { "date_range": "2026-05-15..2026-05-22",
      "current": 89, "suggested": 119,
      "reason": "Mid-week dip + local trade fair drives demand" },
    { "date_range": "2026-05-23..2026-05-31",
      "current": 89, "suggested": 99,
      "reason": "Weekend uplift, competition averaging 105 EUR" }
  ],
  "insights": [
    "Occupancy 30% below local benchmark — pricing is too rigid for weekday/weekend split.",
    "Competitor avg nightly: 112 EUR. You charge 89 EUR flat. Loss estimated at 1.4K EUR/30d.",
    "Recommend: enable smart_pricing tool for daily price tuning."
  ],
  "_mock": true,
  "_pitch": "Surfaces revenue gaps and concrete pricing actions per listing"
}
```

### Tool call (2/3) — per-day pricing for the same window

```json
{ "method": "tools/call",
  "params": {
    "name": "smart_pricing",
    "arguments": { "listing_id": "12345", "from": "2026-06-01", "to": "2026-06-14" }
  }
}
```

### Tool response (first few days of representative output)

```jsonc
{
  "daily_prices": [
    { "date": "2026-06-01", "suggested": 138, "reasons": ["Off-peak weekday baseline", "High-season factor (×1.20)"] },
    { "date": "2026-06-02", "suggested": 138, "reasons": ["Off-peak weekday baseline", "High-season factor (×1.20)"] },
    { "date": "2026-06-03", "suggested": 144, "reasons": ["Weekday uplift (+5 EUR)", "High-season factor (×1.20)"] },
    { "date": "2026-06-04", "suggested": 156, "reasons": ["Weekday uplift (+15 EUR)", "High-season factor (×1.20)"] },
    { "date": "2026-06-05", "suggested": 168, "reasons": ["Weekend uplift (+25 EUR)", "High-season factor (×1.20)"] },
    { "date": "2026-06-06", "suggested": 168, "reasons": ["Weekend uplift (+25 EUR)", "High-season factor (×1.20)"] }
    // ... 8 more days
  ],
  "summary": { "avg_suggested": 152, "total_revenue_estimate": 2128 },
  "_mock": true,
  "_pitch": "Per-day pricing with explainable factors"
}
```

### Tool call (3/3) — any concrete gaps?

```json
{ "method": "tools/call",
  "params": {
    "name": "calendar_optimizer",
    "arguments": { "listing_id": "12345", "horizon_days": 30 }
  }
}
```

### Tool response (representative)

```jsonc
{
  "gaps": [
    { "start": "2026-05-10", "end": "2026-05-12", "nights": 2,
      "cost_estimate_eur": 196, "suggestion": "discount" },
    { "start": "2026-05-18", "end": "2026-05-22", "nights": 4,
      "cost_estimate_eur": 416, "suggestion": "min_stay_relax" },
    { "start": "2026-05-27", "end": "2026-05-28", "nights": 1,
      "cost_estimate_eur": 101, "suggestion": "discount" }
  ],
  "potential_recovery_eur": 713,
  "_mock": true,
  "_pitch": "Surfaces calendar gaps and concrete actions to recover lost nights"
}
```

### Claude (synthesised reply)

> Listing 12345 is underpriced. Three things stand out:
>
> **1. The gap to the local market is large.** Occupancy 52% (benchmark
> would be ~70%+), revenue 3,120€ vs a comp set averaging 4,480€. That's
> -30%, or roughly 1.4k€/month of foregone revenue. You're charging a flat
> 89€/night while competitors run 105-119€ with daily variation.
>
> **2. The per-day pricing plan for June 1-14 shows the shape.** Off-peak
> weekdays should sit around 138-144€ (high-season factor kicks in for
> June). Weekends should jump to 168€. Today you're charging the same 89€
> regardless. The average suggested price for the 2-week window is **152€**.
>
> **3. Three specific calendar gaps to attack right now:**
>
> - **May 10-11 (2 nights, ~196€)** → drop the price ("discount" signal).
> - **May 18-21 (4 nights, ~416€)** → relax your minimum-stay; many gaps
>   like this are caused by a 3-night minimum colliding with mid-week
>   travellers.
> - **May 27 (1 night, ~101€)** → discount or accept that gap-fillers go
>   cheap.
>
> Total recoverable in the next 30 days: **~713€**, on top of the structural
> pricing fix.
>
> Concrete next step: update your nightly price floor to ~115€, enable
> weekday/weekend variation, relax the minimum-stay to 1 night for the May
> 18-21 window. Want me to draft the price-change notification message for
> any confirmed upcoming guests?

> **Mock-data caveat:** all three tool responses are deterministic mocks.
> With Partner API access, `host_insights` would compute live competitor
> data, `smart_pricing` would account for the listing's actual current
> price (not just a hash-derived base), and `calendar_optimizer` would read
> real blocked/unbooked dates. The shape of the output and the agent's
> reasoning flow stay the same.

---

## Scenario 3 — Responding to a difficult review

**Setting:** A 2-star review just came in saying the place was dirty and the
wifi was broken. The host asks the agent to draft a reply and check whether
this should be escalated.

### User

> A guest left a 2-star review: "The place was dirty and the wifi was
> broken." How should I respond?

### Claude (reasoning)

> A 2-star review with words like "dirty" and "broken" likely triggers the
> escalation logic in `review_responder`. Call it, then look at how the
> listing has been doing recently via `host_insights` to give the host
> context on whether this is a one-off or a pattern.

### Tool call (1/2)

```json
{ "method": "tools/call",
  "params": {
    "name": "review_responder",
    "arguments": {
      "review_id": "rev-7782",
      "review_text": "The place was dirty and the wifi was broken.",
      "rating": 2,
      "host_voice": "warm"
    }
  }
}
```

### Tool response (real fixture output — escalation triggered)

```jsonc
{
  "draft": "We're truly sorry your stay didn't meet expectations. Your feedback is taken seriously and we're already looking into the issues you mentioned.",
  "sentiment": "negative",
  "needs_escalation": true,
  "escalation_reason": "Negative review mentions \"dirty\" — manual review recommended.",
  "_mock": true,
  "_pitch": "Auto-drafts review responses, flags escalation cases for human review"
}
```

### Tool call (2/2) — recent performance for context

```json
{ "method": "tools/call",
  "params": {
    "name": "host_insights",
    "arguments": { "listing_id": "12345", "period": "last_30d" }
  }
}
```

### Tool response (under-performing fixture again)

```jsonc
{
  "occupancy_rate": 0.52,
  "revenue_eur": 3120,
  "competitor_avg_revenue_eur": 4480,
  "delta_pct": -30.4,
  // ... full output as in Scenario 2
  "insights": [
    "Occupancy 30% below local benchmark — pricing is too rigid for weekday/weekend split.",
    "Competitor avg nightly: 112 EUR. You charge 89 EUR flat. Loss estimated at 1.4K EUR/30d.",
    "Recommend: enable smart_pricing tool for daily price tuning."
  ],
  "_mock": true,
  "_pitch": "Surfaces revenue gaps and concrete pricing actions per listing"
}
```

### Claude (synthesised reply)

> Important up front: **this review needs your eyes, not an auto-reply.**
> The responder flagged it for escalation because a 2-star review mentioning
> "dirty" is one of the keyword categories where careless responses have
> cost hosts their superhost status.
>
> Here's a starting draft in your warm tone — but please treat it as a
> rough first pass, not a send-as-is:
>
> > "We're truly sorry your stay didn't meet expectations. Your feedback is
> > taken seriously and we're already looking into the issues you mentioned."
>
> Before you reply, I'd suggest:
>
> 1. **Verify the specifics.** Was the cleaner late or did they skip the
>    turnover? Was the router actually broken or a guest-side wifi issue
>    (password mistype, device problem)?
> 2. **Address the two concrete claims separately.** Generic "we take
>    feedback seriously" lands worse than "we've spoken with our cleaner
>    about the kitchen and replaced the router."
> 3. **Take the L if it's real.** If the place genuinely was dirty, a brief
>    "we let you down, we've taken these specific steps" beats any defense.
>
> For context, the listing's last-30-days performance: occupancy 52% (30%
> below local benchmark), and reviews are one of the few channels you have
> to recover ground. A thoughtful response visible on the listing page can
> meaningfully help future bookings — a defensive or template-y one will
> hurt.
>
> Want me to draft three different specific responses based on (a) "cleaner
> issue, now fixed", (b) "wifi issue, now fixed", (c) "both, here's the
> remediation"?

> **Mock-data caveat:** the review-responder escalation logic ran real
> (keyword scan against the 7-word escalation list, sentiment classification
> by rating). The `host_insights` numbers are the deterministic
> under-performing-fixture profile — they're illustrative, not real
> revenue.

---

## Wrap-up

These three scenarios show the demo tools doing their job: surfacing
auditable signals, drafting starting-point text, and gating side-effects on
host approval. The contracts and behaviours are stable; only the data
sources are mocked until Partner API access is granted.

For per-tool reference: [`docs/tools/`](../docs/tools/).
For live-tool transcripts: [`usage.md`](./usage.md).
For the mock-vs-live policy: [ADR-0005](../docs/adr/0005-mock-vs-live-honesty.md).
