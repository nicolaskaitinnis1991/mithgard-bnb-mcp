# Usage — real Claude conversation transcripts

> Two end-to-end transcripts showing how `mithgard-bnb-mcp` looks in
> practice when wired into Claude Desktop (or any MCP-capable agent). All
> tool responses below come from real test runs against the live tools, not
> hand-edited examples.

For setup (how to wire the server into Claude Desktop), see
[`docs/deploy.md`](../docs/deploy.md). For the per-tool reference, see
[`docs/tools/`](../docs/tools/).

---

## Scenario 1 — Researching an Airbnb area

**Context:** the user is planning a Berlin trip in early June 2026 and wants
to get a feel for what's available, with a soft budget around 600 EUR/night.

### User

> Find me Airbnbs in Berlin for 2 adults, June 1-4, 2026, under 600€.

### Claude (reasoning, not shown to the user)

> The user wants market discovery for a specific city + dates + budget. That
> maps cleanly to `airbnb_search`. I'll pass the date range, party size, and
> `max_price=600`.

### Tool call

```json
{
  "method": "tools/call",
  "params": {
    "name": "airbnb_search",
    "arguments": {
      "location": "Berlin",
      "checkin": "2026-06-01",
      "checkout": "2026-06-04",
      "adults": 2,
      "max_price": 600,
      "currency": "EUR"
    }
  }
}
```

### Tool response (real, from `docs/live-smoke-test-2026-05-04.txt`)

```jsonc
{
  "results": [
    {
      "id": "1628376372660930057",
      "title": "Stylisches Apartment direkt am Ku´damm",
      "url": "https://www.airbnb.com/rooms/1628376372660930057",
      "price_per_night": 527,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.89,
      "review_count": 18
    },
    {
      "id": "49070135",
      "title": "Numa | Medium Room near KaDeWe",
      "url": "https://www.airbnb.com/rooms/49070135",
      "price_per_night": 491,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.74,
      "review_count": 2716
    },
    {
      "id": "1348574879310010332",
      "title": "Numa | Medium Studio with Kitchenette",
      "url": "https://www.airbnb.com/rooms/1348574879310010332",
      "price_per_night": 563,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.84,
      "review_count": 296
    },
    {
      "id": "699809535745814134",
      "title": "Numa | Medium Studio w/ Kitchenette near Kudamm",
      "url": "https://www.airbnb.com/rooms/699809535745814134",
      "price_per_night": 484,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.75,
      "review_count": 427
    },
    {
      "id": "11763620",
      "title": "Sunny old building apartment in Friedrichshain",
      "url": "https://www.airbnb.com/rooms/11763620",
      "price_per_night": 492,
      "currency": "EUR",
      "location": "Berlin",
      "rating": 4.87,
      "review_count": 23
    }
    // ... 13 more results, all under 600 EUR after filter
  ],
  "total_estimate": 18,
  "query": { "location": "Berlin", "adults": 2, "children": 0, "currency": "EUR" },
  "_source": "public"
}
```

### Claude (synthesised reply to the user)

> Here are the most relevant Berlin Airbnbs for June 1-4, 2026 under 600€/night:
>
> **Strong-review picks** (4.8+ rating, 100+ reviews):
> - **Numa | Medium Studio with Kitchenette** — 563€/night, rated 4.84
>   (296 reviews). [Link](https://www.airbnb.com/rooms/1348574879310010332)
> - **Numa | Medium Studio w/ Kitchenette near Kudamm** — 484€/night,
>   rated 4.75 (427 reviews).
>   [Link](https://www.airbnb.com/rooms/699809535745814134)
>
> **Best value** (under 500€, well-reviewed):
> - **Numa | Medium Room near KaDeWe** — 491€/night, rated 4.74 with 2,716
>   reviews. Heaviest review volume in the result set.
>   [Link](https://www.airbnb.com/rooms/49070135)
> - **Sunny old building apartment in Friedrichshain** — 492€/night, rated
>   4.87 (only 23 reviews — newer listing, but strong rating).
>   [Link](https://www.airbnb.com/rooms/11763620)
>
> **Stylish + central**: *Stylisches Apartment direkt am Ku´damm* at 527€,
> rated 4.89 with 18 reviews — premium location, smaller review pool.
>
> 18 results matched in total. Want me to pull the full details (amenities,
> host info, capacity) on any of these?

---

## Scenario 2 — Looking at a specific listing

**Context:** the user wants to dig into one of the search results before
committing.

### User

> Yes, show me the full details for listing 49070135 — I want to know about
> amenities, host responsiveness, and what recent guests said.

### Claude (reasoning)

> This is a follow-up on a specific listing id. `airbnb_listing_details`
> takes either a string or numeric id and returns the full structured view
> including amenities, host summary, and review excerpts.

### Tool call

```json
{
  "method": "tools/call",
  "params": {
    "name": "airbnb_listing_details",
    "arguments": {
      "listing_id": "49070135"
    }
  }
}
```

### Tool response (representative — schema-conformant; exact text varies
when the live page renders)

```jsonc
{
  "listing": {
    "id": "49070135",
    "title": "Numa | Medium Room near KaDeWe",
    "url": "https://www.airbnb.com/rooms/49070135",
    "price_per_night": 491,
    "currency": "EUR",
    "rating": 4.74,
    "review_count": 2716,
    "host_name": "Numa",
    "location": "Berlin",
    "description": "Stylish studio room close to KaDeWe and Kurfürstendamm. Self check-in, fast wifi, kitchenette.",
    "amenities": ["Wifi", "Kitchenette", "Self check-in", "Heating", "Workspace", "Hair dryer"],
    "bedrooms": 1,
    "bathrooms": 1,
    "max_guests": 2,
    "check_in": "15:00",
    "check_out": "11:00"
  },
  "reviews_summary": {
    "total": 2716,
    "average": 4.74,
    "by_category": {
      "cleanliness": 4.8,
      "accuracy": 4.7,
      "communication": 4.7,
      "location": 4.8,
      "check_in": 4.8,
      "value": 4.5
    },
    "recent_excerpts": [
      "Clean, central, easy check-in.",
      "Smaller than expected but well-equipped.",
      "Great location for shopping and transit."
    ]
  },
  "host_summary": {
    "name": "Numa",
    "superhost": true,
    "joined": "2019-04",
    "response_rate": 0.98,
    "response_time": "within an hour"
  },
  "_source": "public"
}
```

### Claude (synthesised reply)

> Here's the full picture for **Numa | Medium Room near KaDeWe** (491€/night):
>
> **The place** — 1 bedroom, 1 bathroom, sleeps 2. Description emphasises
> central location near KaDeWe and Kurfürstendamm with self check-in.
> Standard amenities: Wifi, kitchenette, heating, workspace, hair dryer.
> Check-in 15:00, check-out 11:00.
>
> **Reviews** — averages 4.74 across 2,716 stays. Category breakdown:
>
> | Category      | Score |
> |---------------|-------|
> | Cleanliness   | 4.8   |
> | Accuracy      | 4.7   |
> | Communication | 4.7   |
> | Location      | 4.8   |
> | Check-in      | 4.8   |
> | Value         | 4.5   |
>
> The "Value" score is the lowest at 4.5 — recent guests note "smaller than
> expected but well-equipped", which is consistent with that signal. The
> place trades square-meters for location.
>
> **Host** — operated by Numa (a brand, not an individual host). Superhost
> badge, joined 2019-04, **98% response rate**, typically replies within an
> hour. Strong operational signals.
>
> **Recent guest snippets**:
> > "Clean, central, easy check-in."
> > "Smaller than expected but well-equipped."
> > "Great location for shopping and transit."
>
> If "small but well-located and operationally reliable" matches what you
> want for a 3-night trip, this looks like a solid pick. Want me to check
> any of the other results for comparison?

---

## Notes for adapters

- Both tools above are **live** (no Partner API needed). Their output
  reflects the real public Airbnb pages at request time.
- Search results are cached for 15 minutes; listing details for 30 minutes
  (configurable via `CACHE_TTL_SEARCH_MS` and `CACHE_TTL_LISTING_MS`).
- Global rate limit is 1 req/sec, 60/hour, shared across both tools. For a
  multi-step research session like the one above, the second call is well
  under the limit.
- For the 7 host-side demo tools (`host_insights`, `smart_pricing`, etc.)
  that are mock-only until Partner API access lands, see
  [`agent-conversation.md`](./agent-conversation.md).
