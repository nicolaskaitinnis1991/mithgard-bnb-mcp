# Mithgard BnB MCP

A TypeScript MCP server for public Airbnb listing data, seven clearly labelled host workflow demos, and a local operations agent.

**Current scope:** two tools read public pages; seven tools use synthetic fixtures; `operations_status` reports this process's observations. There is no authenticated host or Partner API integration. This is an alpha portfolio project, with a reproducible verification suite.

## Install and verify

Use Node.js 24 and npm. No API key is needed for the demo workflows.

```sh
git clone https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp.git
cd mithgard-bnb-mcp
npm ci
npm run build
npm run smoke
npm run verify
npm audit --audit-level=moderate
```

`smoke` uses the official MCP client, including initialization, tool discovery, schema validation, a demo call and an invalid-input call. It does not contact Airbnb. `verify` also runs lint, strict TypeScript checks, coverage, documentation checks and 2,000 synthetic MCP calls with bounded concurrency. These tests are simulated software tests; they are not a human usability study or an external Airbnb load test.

## Connect an MCP client

Configure a stdio MCP client with an absolute path to the built entry point:

```json
{
  "mcpServers": {
    "mithgard-bnb": {
      "command": "node",
      "args": ["/absolute/path/mithgard-bnb-mcp/dist/index.js"]
    }
  }
}
```

Use a Node 24 executable if your client's environment defaults to an older runtime. Logs go to stderr; stdout carries MCP messages. The server supports `--help`, `--version` and `--debug`.

## Tools

| Tool | Data and behavior | Contract |
| --- | --- | --- |
| `airbnb_search` | Public-page search; distinguishes nightly, stay-total and unknown price basis | [Search](docs/tools/airbnb_search.md) |
| `airbnb_listing_details` | Public listing details; unavailable numeric facts remain null | [Listing](docs/tools/airbnb_listing_details.md) |
| `host_insights` | Demo operational metrics | [Insights](docs/tools/host_insights.md) |
| `guest_message_assistant` | Demo drafts with missing context flagged | [Messages](docs/tools/guest_message_assistant.md) |
| `booking_request_triage` | Demo recommendations requiring review | [Triage](docs/tools/booking_request_triage.md) |
| `smart_pricing` | Demo nightly estimates, bounded to 30 dates | [Pricing](docs/tools/smart_pricing.md) |
| `calendar_optimizer` | Demo calendar suggestions with explicit reference date | [Calendar](docs/tools/calendar_optimizer.md) |
| `review_responder` | Demo response drafts requiring approval | [Reviews](docs/tools/review_responder.md) |
| `turnover_coordinator` | Demo cleaning plan with timing feasibility checks | [Turnover](docs/tools/turnover_coordinator.md) |
| `operations_status` | Local counters, circuit state and recovery guidance | [Operations](docs/tools/operations_status.md) |

MCP publishes JSON input and output schemas generated from Zod. Successes contain validated `structuredContent` plus JSON text. Tool failures contain `isError: true` and a bounded text error envelope, without success-shaped structured content. All tools are read-only; no message, booking decision, price change or cleaner assignment is sent.

## Reliability and operations

Public requests have a total deadline, bounded queue and response body, cancellation, finite retries, per-origin Retry-After handling, and shutdown cleanup. Dates, identifiers, prices and maximum output size are validated. Cache keys include dates and currency.

The built-in agent is a local rule-based supervisor. It observes calls, limits concurrency, clears local caches after repeated upstream failures, pauses the affected public workflow, and allows a single recovery probe after cooldown. It never stores guest text, restarts itself, edits code or changes a host account. See [operations](docs/operations.md) and [limitations](docs/limitations.md).

## Docker

```sh
docker build -t mithgard-bnb-mcp:local .
node scripts/smoke.mjs --docker mithgard-bnb-mcp:local
MITHGARD_STRESS_DOCKER_IMAGE=mithgard-bnb-mcp:local npm run test:stress
```

The runtime image is distroless Node 24 running as a non-root user. The smoke client runs it with a read-only filesystem, no added capabilities, no-new-privileges and a 256 MB memory limit. The server is stdio-based; it does not expose an HTTP port.

## Integration and evidence

Start with [the repository index](docs/INDEX.md), [architecture](docs/architecture.md), [integration guide](docs/integration.md), and [verification report](docs/readiness-2026-10-01.md). The index covers source files and Markdown documents and checks local links. An index hash is a change detector, not proof of code correctness.

An authenticated provider adapter, explicit permissions, field mapping and provider contract tests are required before connecting real host operations. Compatibility with Base360 or any employer's internal system has not been tested. Public Airbnb HTML can change or be blocked; fixture tests do not guarantee live availability.

Contact: [mithgard.ai](https://mithgard.ai). License: [MIT](LICENSE).
