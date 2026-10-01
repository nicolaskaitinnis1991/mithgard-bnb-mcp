> Historical May 2026 material. Claims, counts and workflows below are not current verification evidence. See [the current README](../../README.md) and [October verification](../readiness-2026-10-01.md). No outreach or deployment is authorized by this file.

# Value-Prop Matrix

> One row per tool. Crisp pain mapping. The "Time saved / week" column is a Superhost-self-reported
> estimate for a 1–3 listing portfolio; numbers scale roughly linearly with portfolio size.
> The "Partner API field required" column names the canonical Airbnb resource a real implementation
> would need — i.e. the surface area Airbnb would need to expose for the demo tool to ship live.

---

| Tool | Host pain solved | Time saved / week (per host) | Partner API field / resource required |
|---|---|---|---|
| `airbnb_search` | Comp-set discovery without manual browsing | 0.5 h | None — public data, already live |
| `airbnb_listing_details` | Pulling competitor amenities / pricing / reviews into Claude context | 0.5 h | None — public data, already live |
| `host_insights` | "How is my listing actually doing this month?" without Airbnb's slow dashboard | 1.5 h | `GET /v2/host/listings/{id}/performance` (occupancy, ADR, RevPAR, review velocity) |
| `guest_message_assistant` | Drafting on-brand replies to repetitive guest questions (wifi, parking, check-in) | 3.0 h | `GET /v2/host/threads`, `POST /v2/host/threads/{id}/messages` |
| `booking_request_triage` | Vetting inquiries against house rules (group size, length of stay, weekends, etc.) | 1.0 h | `GET /v2/host/reservations?status=request`, `POST /v2/host/reservations/{id}/{accept\|decline}` |
| `smart_pricing` | Manual nightly-rate tuning vs. local comp set + seasonality | 2.0 h | `GET /v2/host/listings/{id}/calendar`, `PUT /v2/host/listings/{id}/calendar/{date}/price` |
| `calendar_optimizer` | Catching gap-nights, blocked dates, mismatched min-stay rules before they cost bookings | 1.0 h | `GET /v2/host/listings/{id}/calendar`, `PATCH /v2/host/listings/{id}/availability_rules` |
| `review_responder` | Drafting review replies tuned to star rating + sentiment | 1.0 h | `GET /v2/host/reviews?listing_id={id}`, `POST /v2/host/reviews/{id}/response` |
| `turnover_coordinator` | Coordinating check-out → cleaning → check-in handoff across calendar + cleaner contact | 2.0 h | `GET /v2/host/reservations?status=upcoming`, plus webhook on `reservation.checkout` |

**Total time saved per host per week (mock tools live):** ~12 hours.
**Total time saved per host per year:** ~600 hours.

---

## Reading this table

- **Live (rows 1–2)** — already shipping value with zero Partner API surface.
- **Demo (rows 3–9)** — schema, fixture, handler, and tool-doc are all real. The "Partner API field
  required" column is the only thing Airbnb needs to provide for each row to go from demo to production.
- **Why these seven specifically** — they are exactly the workflows a host runs every day that the
  current Airbnb host UI makes painful, repetitive, or impossible to delegate to an AI.

The repo's 75-test coverage and Zod-validated schemas mean Airbnb's engineering team can review the demo
endpoints the way they would review an internal PR — the contracts are explicit and the seams are clean.
