# Architecture

> How `mithgard-bnb-mcp` actually works, as of `v0.1.0-alpha`. Newcomer-readable
> companion to the formal design contract in
> [`docs/specs/2026-05-03-mithgard-bnb-mcp-design.md`](./specs/2026-05-03-mithgard-bnb-mcp-design.md).
> The spec is the contract; this doc is the welcome mat.

---

## Overview

`mithgard-bnb-mcp` is a Model Context Protocol (MCP) server that lets an AI
agent operate Airbnb host workflows over a stdio JSON-RPC transport. Two tools
read public Airbnb pages live (`airbnb_search`, `airbnb_listing_details`); seven
tools are production-shaped mocks of Partner-API-gated host workflows
(`host_insights`, `guest_message_assistant`, `booking_request_triage`,
`smart_pricing`, `calendar_optimizer`, `review_responder`,
`turnover_coordinator`). All nine share the same registration, validation,
error, and telemetry pipeline.

```
┌─────────────────────────────────────────────────────────────────┐
│  MCP-capable agent (Claude Desktop, Claude Code, Cursor, ...)   │
└──────────────────────────────┬──────────────────────────────────┘
                               │  JSON-RPC over stdio
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Mithgard BnB MCP Server (Node 20+)             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  src/index.ts  — CLI parsing, deps wiring, transport      │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  src/server.ts — MCP Server, ListTools + CallTool handlers│  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                ▼                                │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  src/tools/registry.ts — wrapHandler(schema, fn)          │  │
│  │  validate input → run handler → return JSON envelope      │  │
│  └─────────────────────────────┬─────────────────────────────┘  │
│                                ▼                                │
│       ┌────────────────────────┴────────────────────────┐       │
│       ▼                                                 ▼       │
│  ┌─────────────────────┐                  ┌─────────────────┐   │
│  │  Live tools (2)     │                  │  Mock tools (7) │   │
│  │  parser + http      │                  │  fixtures, det. │   │
│  │  + cache + queue    │                  │  output         │   │
│  └─────────┬───────────┘                  └─────────────────┘   │
│            ▼                                                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  src/parsers/airbnb-public.ts  multi-strategy HTML→JSON │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Module map

One short paragraph per top-level `src/` directory.

### `src/config/`

Two files. `env.ts` parses the process environment through a Zod schema with
sensible defaults (1 req/sec, 60/hr, 15-min search cache, 30-min listing
cache) and a `__SELF_IDENTIFY__` sentinel for the User-Agent that `index.ts`
substitutes with the real package version. `logger.ts` is a thin `pino`
factory pinned to file descriptor 2 (stderr) with default PII-redaction paths
(`*.email`, `*.phone`, `*.guest_name`, `*.message_text`). See
[ADR-0007](./adr/0007-stderr-for-logs.md) for the stderr rationale.

### `src/lib/`

Primitives used everywhere. `result.ts` exports the `Result<T, E>` tagged
union (`ok` / `err`) used in place of thrown errors at module boundaries
([ADR-0004](./adr/0004-result-type-not-throw.md)). `errors.ts` defines the
`McpError` tagged union (`RateLimited | UpstreamHTTP | ParseFailed |
ValidationFailed | NotImplemented`) with constructor helpers that respect
`exactOptionalPropertyTypes: true`. `http.ts` wraps `undici` with `p-queue`
for per-host rate limiting and a 3-attempt 429 retry-with-backoff. `cache.ts`
is an LRU cache (`lru-cache`) with per-tool TTL injection. `request-id.ts`
generates a short, sortable ID per tool call. `telemetry.ts` is the
`withTelemetry(log, name, fn, opts)` wrapper that threads `request_id`,
`duration_ms`, `status`, `error_kind`, and `cache_hit` into a single
structured log line per call. `redaction.ts` is the extra-paranoid PII strip
used by `--debug` envelope dumps (beyond pino's redact paths). `cli.ts` is
the argv parser for `--version`, `--help`, `--debug`.

### `src/parsers/`

`airbnb-public.ts` is the multi-strategy HTML parser for the two live tools.
It first tries the modern `niobeClientData` JSON blob embedded in
`<script id="data-deferred-state-0">`, then falls back to the legacy
`niobeMinimalClientData` shape if the modern one is absent. Listing IDs are
decoded from the base64-encoded `DemandStayListing:<num>` Apollo-cache keys.
See [ADR-0006](./adr/0006-multi-strategy-parser.md) for the fallback
rationale and rotation playbook.

### `src/mocks/`

One fixture file per mock tool, plus `hash.ts` for deterministic input →
fixture matching. Fixtures are handwritten, realistic, and shaped to look
exactly like what a Partner-API response would produce. Every mock output
carries `_mock: true` and a `_pitch` field documenting the API endpoint the
real implementation would call. See
[ADR-0005](./adr/0005-mock-vs-live-honesty.md).

### `src/tools/<name>/`

One folder per tool. Each folder contains exactly three files: `schema.ts`
(Zod input + output schemas), `handler.ts` (pure-function business logic,
returns `Result<T, McpError>`), and `tool.ts` (wires schema + handler into a
`ToolDefinition` via `wrapHandler` + `withTelemetry`). Tests live alongside
in `tests/unit/tools/<name>.test.ts`. `src/tools/registry.ts` exports the
`wrapHandler` helper and the `ToolDefinition` type. `src/tools/index.ts`
collects all 9 builders into the `allTools(deps)` factory.

### `src/server.ts`

The MCP server bootstrap. Reads `name` and `version` from `package.json` at
runtime, instantiates `Server` (the low-level SDK class — see
[ADR-0002](./adr/0002-modelcontextprotocol-sdk.md)), registers the
`ListToolsRequestSchema` and `CallToolRequestSchema` handlers. The
`CallToolRequestSchema` handler finds the right tool by name and delegates to
its `handler` function.

### `src/index.ts`

The entry point. Parses CLI flags (`--version`, `--help`, `--debug`), loads
the env, substitutes the User-Agent sentinel with the real version, wires up
the HTTP client + caches + parsers as `AppDeps`, builds the tool list,
constructs the server, and connects it to `StdioServerTransport`.

---

## Tool anatomy

Every tool follows the same four-file pattern. The `airbnb_search` tool is the
canonical example:

| File | Responsibility |
|---|---|
| [`src/tools/search/schema.ts`](../src/tools/search/schema.ts) | `SearchInput` (Zod): `{ location, checkin?, checkout?, adults?, children?, min_price?, max_price?, currency? }`. `SearchOutput` (Zod): `{ results: Listing[], total_estimate, query, _source: "public" }`. |
| [`src/tools/search/handler.ts`](../src/tools/search/handler.ts) | Pure function: `(deps) => (input) => Promise<Result<SearchOutput, McpError>>`. Does cache lookup, HTTP GET on miss, parser invocation, cache store. |
| [`src/tools/search/tool.ts`](../src/tools/search/tool.ts) | Wires schema + handler into a `ToolDefinition`. Wraps the handler with `wrapHandler` (Zod input validation) and `withTelemetry` (structured logging). |
| `tests/unit/tools/search.test.ts` | Unit tests against fixture HTML. No mocks of internal modules — real cache, real parser, fixture HTML in lieu of network. |

The seven mock tools follow the same pattern, except `handler.ts` consults a
`src/mocks/<name>.fixture.ts` instead of `deps.http`.

---

## Data flow examples

### Live search

```
Agent → tools/call airbnb_search { location: "Berlin", adults: 2 }
     → src/server.ts CallToolRequestSchema handler
     → wrapHandler validates input (Zod)
     → withTelemetry assigns request_id, starts timer
     → searchHandler(deps): cache.get(key) → miss
     → http.get("https://www.airbnb.com/s/Berlin/homes?…")
       (p-queue gates: 1 req/sec, 60/hr)
     → parseSearchResults(html, query) → Listing[]
     → cache.set(key, results)
     → returns ok({ results, total_estimate, query, _source: "public" })
     → withTelemetry logs { tool: "airbnb_search", request_id, duration_ms,
                            status: "ok", cache_hit: false }
     → JSON-RPC response on stdout
```

### Mock tool

```
Agent → tools/call guest_message_assistant { thread_id, last_message }
     → wrapHandler validates input
     → withTelemetry start
     → guestMessageHandler(): hash(last_message) → fixture key
     → src/mocks/guest-message-assistant.fixture.ts returns
       { suggestions: [...], recommended_index: 1,
         _mock: true, _pitch: "…" }
     → withTelemetry logs duration + status
     → JSON-RPC response on stdout
```

### Tool registration

```
src/index.ts main():
  deps = { search: {…}, listing: {…}, log, debug }
  tools = allTools(deps)              // src/tools/index.ts
         = [buildSearchTool(…),
            buildListingDetailsTool(…),
            buildHostInsightsTool(…),
            … 6 more …]
  server = buildServer(tools, log)    // src/server.ts
  server.connect(new StdioServerTransport())
```

### Error envelope

A handler returning `err({ kind: "RateLimited", retry_after_ms: 12000 })`
flows out as:

```json
{
  "error": "Upstream rate-limited; retry after 12000ms",
  "kind": "RateLimited"
}
```

The agent sees this as the JSON-RPC `result` payload, not an exception. See
[ADR-0004](./adr/0004-result-type-not-throw.md).

---

## Error handling

`McpError` is a tagged union. Each variant has a documented trigger and a
default agent-facing message:

| Variant | Fires when | Agent sees |
|---|---|---|
| `RateLimited` | Upstream returned 429 after 3 backoff retries | `"Upstream rate-limited; retry after <ms>ms"` + `retry_after_ms` |
| `UpstreamHTTP` | Non-429 HTTP error (4xx, 5xx) | `"Upstream HTTP <status>: <reason>"` |
| `ParseFailed` | HTML didn't match modern or legacy parser strategy | `"Could not parse response: <missing selector>"` (WARN log) |
| `ValidationFailed` | Output schema didn't match handler return value | `"Internal validation error: <zod path>"` (never seen in prod if tests are honest) |
| `NotImplemented` | Mock tool received an input it has no fixture for | `"This tool is a demo; input not covered by fixture"` |

Live tools never throw across the public boundary. Internal helpers may
throw; `handler.ts` catches and converts.

---

## Observability

Every tool call emits exactly one JSON line to stderr via `pino`:

```json
{
  "level": 30,
  "time": 1714814534812,
  "tool": "airbnb_search",
  "request_id": "8f3a7c",
  "duration_ms": 432,
  "status": "ok",
  "cache_hit": false,
  "msg": "tool.complete"
}
```

Fields:

- `tool` — tool name as registered.
- `request_id` — short sortable ID, unique per call.
- `duration_ms` — wall-clock from `withTelemetry` entry to exit.
- `status` — `"ok"` or `"error"`.
- `error_kind` — when `status="error"`, the `McpError.kind` value.
- `cache_hit` — `true` if the result came from `lru-cache`, `false` otherwise.

`--debug` mode (`node dist/index.js --debug`) sets `LOG_LEVEL=debug`, which
makes `withTelemetry` additionally dump the sanitized request and response
envelopes per call. Sanitization runs through `src/lib/redaction.ts` to strip
any `review_text`, `last_message`, `host_name`, `guest_name`, `email`, or
`phone` before the dump reaches stderr.

Optional OTEL traces are gated on the `OTEL_EXPORTER_OTLP_ENDPOINT` env var.
The env var is parsed today; full auto-instrumentation of undici is on the
"Future work" list below.

---

## Performance characteristics

| Aspect | Value | Notes |
|---|---|---|
| HTTP rate limit | 1 req/sec, 60 req/hour | `HTTP_RATE_PER_SEC`, `HTTP_RATE_PER_HOUR` env vars |
| Search cache TTL | 15 min | `CACHE_TTL_SEARCH_MS` (default 900000) |
| Listing cache TTL | 30 min | `CACHE_TTL_LISTING_MS` (default 1800000) |
| Cache size | 500 entries each | `CACHE_MAX_SEARCH`, `CACHE_MAX_LISTING` |
| p95 latency, search (cache miss) | ~500-900 ms | dominated by Airbnb response + parse |
| p95 latency, search (cache hit) | ~2 ms | LRU lookup + Zod validate |
| p95 latency, mock tool | ~3 ms | fixture lookup + Zod validate |

Rate limiting is enforced via `p-queue` with jitter. A 429 from upstream
triggers up to 3 retries with exponential backoff before yielding
`RateLimited`.

---

## Security model

Public-only data. The two live tools read URLs that any browser can reach
without a login. No credentials are accepted by any tool — even when an
operator passes them via env var, they're ignored. No PII is persisted; the
LRU cache holds search and listing data only, and is process-memory-only
(evaporates on restart).

Outbound HTTP identifies as
`mithgard-bnb-mcp/<version> (+https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp)`.
Operators can override with `HTTP_USER_AGENT` but the default is
self-identifying so Airbnb security can attribute traffic to this project.

See [`SECURITY.md`](../SECURITY.md) for the disclosure process and out-of-scope
boundary.

---

## ADR pointer

| #                                           | Topic                              |
| ------------------------------------------- | ---------------------------------- |
| [0001](./adr/0001-typescript-not-python.md) | TypeScript over Python             |
| [0002](./adr/0002-modelcontextprotocol-sdk.md) | Official MCP SDK over hand-roll |
| [0003](./adr/0003-zod-validation.md)        | Zod for runtime validation         |
| [0004](./adr/0004-result-type-not-throw.md) | `Result<T, E>` over thrown errors  |
| [0005](./adr/0005-mock-vs-live-honesty.md)  | Mock tools clearly labelled        |
| [0006](./adr/0006-multi-strategy-parser.md) | Multi-strategy parser with fallback|
| [0007](./adr/0007-stderr-for-logs.md)       | Stderr for logs, stdout for MCP    |

The full index lives in [`docs/adr/README.md`](./adr/README.md).

---

## Future work

- **Partner API integration.** When (if) Airbnb opens a Partner API to
  individual developers, the seven mock tools become real. The current
  handler signature (`(deps) => (input) => Promise<Result<Output, McpError>>`)
  is already deps-injected — swapping `src/mocks/<name>.fixture.ts` for a
  real HTTP adapter is a one-file change per tool.
- **Full OTEL auto-instrumentation.** Today `OTEL_EXPORTER_OTLP_ENDPOINT` is
  parsed but unused. Adding `@opentelemetry/auto-instrumentations-node` would
  give per-undici-request spans for free. Deferred until a self-hoster asks.
- **McpServer migration.** The low-level `Server` class from the SDK is
  marked deprecated; the `McpServer` wrapper is the future. We pin to the
  low-level class today because `setRequestHandler`-based registration is
  stable and the wrapper's API is still rolling. Re-evaluate at MCP SDK 2.0.
- **Live `airbnb_listing_details` price.** The PDP HTML does not embed a
  per-night price without a check-in date, so `listing.price_per_night`
  returns `0` from the live parser. Use `airbnb_search` for pricing.
  Documented inline at `src/parsers/airbnb-public.ts:243`.
