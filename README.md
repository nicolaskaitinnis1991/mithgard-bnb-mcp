# Mithgard BnB MCP

A TypeScript MCP server with two public Airbnb readers, seven local host-analysis tools, a bounded plan/execute/verify workflow and an operations agent inside the application.

Host tools calculate from explicitly supplied data (`mode: "provided"`), or return clearly marked synthetic demos. Supplied data is **not** an authenticated Airbnb import. The server drafts and analyzes; it does not send messages, change bookings/prices or assign staff. This remains an alpha portfolio project.

## Install and verify

Use Node.js 24 and npm. No API or LLM key is needed for local host analysis.

```sh
git clone https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp.git
cd mithgard-bnb-mcp
npm ci
npm run build
npm run smoke
npm run verify
# Complete local acceptance, including clean install, audit and Docker:
npm run acceptance
```

`verify` checks lint, strict types, coverage, current indexes, MCP smoke and 2,000 mixed synthetic calls. `acceptance` also builds and tests a constrained container, and writes exact command exits, test names and source fingerprints to `reports/acceptance.json`. Docker must be running. Reports contain synthetic test evidence, never imported host records. See [the acceptance plan](docs/acceptance-plan.md).

## Connect an MCP client

Configure a stdio client with an absolute path to Node 24 and the built entry point:

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

Initialize and discover tools before calls so the official SDK can validate advertised output contracts. Logs go to stderr; stdout carries MCP messages. CLI: `--help`, `--version`, `--debug`.

## Tools

| Tool                      | Data and behavior                                                  | Contract                                          |
| ------------------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| `airbnb_search`           | Public search with nightly/total/unknown quote evidence            | [Search](docs/tools/airbnb_search.md)             |
| `airbnb_listing_details`  | Public details; unknown numeric facts remain null                  | [Listing](docs/tools/airbnb_listing_details.md)   |
| `host_insights`           | Supplied calendar occupancy, ADR, RevPAR and revenue               | [Insights](docs/tools/host_insights.md)           |
| `guest_message_assistant` | DE/EN multi-topic drafts using supplied facts and policy           | [Messages](docs/tools/guest_message_assistant.md) |
| `booking_request_triage`  | Capacity/rule checks and review recommendation                     | [Triage](docs/tools/booking_request_triage.md)    |
| `smart_pricing`           | Bounded price rules, actual baselines and configured caps          | [Pricing](docs/tools/smart_pricing.md)            |
| `calendar_optimizer`      | Actual available gaps, unknown nights and minimum-stay conflicts   | [Calendar](docs/tools/calendar_optimizer.md)      |
| `review_responder`        | Complaint/safety classification and approval-required drafts       | [Reviews](docs/tools/review_responder.md)         |
| `turnover_coordinator`    | Tasks, buffers, cleaner availability and assignment conflicts      | [Turnover](docs/tools/turnover_coordinator.md)    |
| `host_workflow`           | Preflight every step, execute bounded dependencies, verify results | [Workflow](docs/tools/host_workflow.md)           |
| `operations_status`       | Process counters, circuit state, freshness and resource budgets    | [Operations](docs/tools/operations_status.md)     |

Each tool publishes input/output schemas generated from Zod. Success contains matching JSON text and validated structured content. Generic failures have `isError: true` and a bounded error envelope. Workflow partial/deadline failures additionally return valid structured progress under their explicit output contract.

## Provided data and agentic use

Start with [the executable synthetic example](examples/host-workflow.json): call `host_workflow` in `plan` mode to validate arguments without running tools; change to `execute` to run and verify. An MCP client or agent supplies the explicit plan. The orchestrator uses deterministic rules; it does not call an LLM or pass earlier output into later arguments automatically.

Host results retain `_source`, `_mock` and `data_evidence` with timestamp, timezone, currency, completeness and missing fields. Any `host_data` requires `mode: "provided"`; missing/invalid data cannot silently fall back to fixtures. Business drafts continue to require human approval after technical verification. See [data sources](docs/data-sources.md).

## Reliability and Docker

HTTP deadlines, queue/body budgets, cancellation, finite429 retries and per-origin cooldown bound public requests. Caches have entry, TTL and serialized-byte limits. Responses have a 256KiB UTF8 envelope limit. Workflow limits are eight steps, four concurrent workflows and at most 60 seconds. EOF, SIGINT and SIGTERM cancel work and release local state.

The local operations agent isolates repeated upstream failures, clears caches and permits one later recovery probe. Health reflects recent public observations only; provided/demo success cannot verify Airbnb. It stores counters, not guest text. See [operations](docs/operations.md).

```sh
docker build -t mithgard-bnb-mcp:local .
node scripts/smoke.mjs --docker mithgard-bnb-mcp:local
MITHGARD_STRESS_DOCKER_IMAGE=mithgard-bnb-mcp:local npm run test:stress
```

The runtime is distroless Node 24, non-root. Tests use a read-only filesystem, disabled networking, dropped capabilities, no-new-privileges and 256 MB memory. No HTTP port is exposed.

## Evidence and integration

[File/Markdown hashes](docs/INDEX.md), [functions/methods](docs/FUNCTIONS.md), [architecture](docs/architecture.md), [integration](docs/integration.md), [acceptance](docs/acceptance-plan.md) and [limitations](docs/limitations.md) describe the maintained scope. An index and passing tests establish traceability; they do not prove every line correct or establish human acceptance.

Authenticated provider access, provider contract tests, target Base360 integration and real host feedback remain external gates. Public Airbnb HTML may change or be unavailable. Contact: [mithgard.ai](https://mithgard.ai). License: [MIT](LICENSE).
