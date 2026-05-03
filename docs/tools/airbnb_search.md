# airbnb_search

Search public Airbnb listings.

**Input:**
- `location` (required, string)
- `checkin`, `checkout` (ISO date)
- `adults` (default 2), `children` (default 0)
- `min_price`, `max_price` (int)
- `currency` (default EUR)

**Output:** `{ results: Listing[], total_estimate, query, _source: "public" }`

**Cache:** 15 min per query.

**Rate-Limit:** 1 req/s, 60 req/h.

**Example agent prompt:** "Find me Airbnbs in Berlin for 2 adults, June 1-4, under 100€."
