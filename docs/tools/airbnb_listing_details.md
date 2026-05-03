# airbnb_listing_details

Fetch full details for a single public Airbnb listing.

**Input:**
- `listing_id` (required, string or number)
- `checkin`, `checkout` (ISO date, optional)

**Output:** `{ listing: ListingFull, reviews_summary: ReviewsSummary, host_summary: HostSummary, _source: "public" }`

**Cache:** 30 min per listing.

**Rate-Limit:** 1 req/s, 60 req/h (shared with `airbnb_search`).

**Example agent prompt:** "Show me details for Airbnb listing 12345 — bedrooms, average rating, host info."
