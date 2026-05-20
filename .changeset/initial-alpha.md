---
"@mithgard/bnb-mcp": minor
---

v0.1.0-alpha — initial public-pitchable release.

- 9 MCP tools registered via stdio transport
- 2 live tools on public Airbnb data (`airbnb_search`, `airbnb_listing_details`)
- 7 demo tools awaiting Partner API (`host_insights`, `guest_message_assistant`,
  `booking_request_triage`, `smart_pricing`, `calendar_optimizer`, `review_responder`,
  `turnover_coordinator`)
- CLI: `--version`, `--help`, `--debug`
- Self-identifying User-Agent
- pino structured logs to stderr, telemetry wrapper with `request_id`/`duration_ms`/`cache_hit`
- Multi-strategy HTML parser (modern + legacy fallback)
- Distroless multi-stage Dockerfile
- 118 tests passing
