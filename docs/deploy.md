# Deploying `mithgard-bnb-mcp`

> Self-host guide. Audience: someone who wants to run this MCP server on their
> own machine and wire it into an MCP-capable client.

---

## Prerequisites

- **Node 20+** (LTS recommended). Check with `node --version`.
- **An MCP-capable client** — any client that speaks the Model Context
  Protocol over stdio. Tested with:
  - [Claude Desktop](https://claude.ai/download)
  - [Claude Code](https://docs.claude.com/en/docs/claude-code) (CLI)
  - [Cursor](https://www.cursor.com/)
  - [Continue.dev](https://www.continue.dev/)
  - Any other stdio-MCP-compatible agent

---

## Option A — From source (recommended for development)

```bash
git clone https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp
cd mithgard-bnb-mcp
npm ci
npm run build
```

The build emits a runnable JS bundle at `dist/index.js`. Point your MCP
client at that path.

Snippet for Claude Desktop (cross-reference
[`examples/claude-desktop-config.json`](../examples/claude-desktop-config.json)):

```json
{
  "mcpServers": {
    "mithgard-bnb": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/TO/mithgard-bnb-mcp/dist/index.js"]
    }
  }
}
```

Replace `/ABSOLUTE/PATH/TO/` with the actual checkout path on your machine
(e.g. `/Users/you/code/mithgard-bnb-mcp/dist/index.js`). Restart Claude
Desktop after editing the config.

---

## Option B — Docker

> **Coming in v0.1.0-alpha.1.** The GHCR image is not yet published. The
> release pipeline (Dispatch 9 of the production-gap plan) wires this up.
> Snippets below show what the workflow will look like once the image is
> available.

```bash
docker pull ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:0.1.0-alpha
docker run --rm -i ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:0.1.0-alpha
```

Wire into Claude Desktop with:

```json
{
  "mcpServers": {
    "mithgard-bnb": {
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:0.1.0-alpha"
      ]
    }
  }
}
```

The `-i` (interactive) flag keeps stdin open for JSON-RPC traffic; `--rm`
ensures the container is cleaned up after the client disconnects. The image
is multi-arch (amd64 + arm64) and runs on a distroless base.

---

## MCP client configurations

### Claude Desktop

Config lives at:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

Add the `mcpServers.mithgard-bnb` block from Option A or Option B above.
Restart Claude Desktop. The nine tools appear in the tool picker (look for
`airbnb_search`, `airbnb_listing_details`, and the seven `_mock: true` host
workflows).

### Claude Code

Use the `claude mcp` CLI to add the server. From a project root:

```bash
claude mcp add mithgard-bnb -- node /ABSOLUTE/PATH/TO/mithgard-bnb-mcp/dist/index.js
```

This writes to your Claude Code config. Run `claude mcp list` to verify
registration.

### Cursor

Cursor's MCP config lives in its settings UI under "MCP Servers". The
schema matches Claude Desktop's — supply `command: "node"` and `args` with
the absolute path to `dist/index.js`. See the
[Cursor docs](https://docs.cursor.com/) for the canonical location.

### Continue.dev

Continue's `config.json` (typically `~/.continue/config.json`) accepts an
`mcpServers` block with the same shape. See the
[Continue.dev docs](https://docs.continue.dev/) for the canonical location.

### Other stdio-MCP-compatible clients

Any agent that speaks MCP over stdio can register this server. The contract:

- The binary is `node /path/to/dist/index.js` (or
  `docker run --rm -i ghcr.io/.../mithgard-bnb-mcp:<tag>`).
- It reads JSON-RPC on stdin and writes JSON-RPC on stdout.
- All logs go to stderr (so they don't pollute the JSON-RPC channel —
  see [ADR-0007](./adr/0007-stderr-for-logs.md)).
- The first thing a client should send is `tools/list`; the server responds
  with 9 tool definitions.

---

## Environment variables

All optional. Defaults are production-sane.

| Variable | Default | Purpose |
|---|---|---|
| `LOG_LEVEL` | `info` | `pino` level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`). `--debug` flag sets this to `debug` automatically. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | _(unset)_ | OTLP endpoint for trace export. Parsed today; full auto-instrumentation deferred (see `architecture.md` Future work). |
| `CACHE_TTL_SEARCH_MS` | `900000` (15 min) | Search result cache TTL. |
| `CACHE_TTL_LISTING_MS` | `1800000` (30 min) | Listing details cache TTL. |
| `CACHE_MAX_SEARCH` | `500` | Max entries in the search LRU cache. |
| `CACHE_MAX_LISTING` | `500` | Max entries in the listing LRU cache. |
| `HTTP_RATE_PER_SEC` | `1` | Upstream HTTP rate cap, req/sec. |
| `HTTP_RATE_PER_HOUR` | `60` | Upstream HTTP rate cap, req/hour. |
| `HTTP_USER_AGENT` | `mithgard-bnb-mcp/<version> (+repo URL)` | Outbound UA. Default self-identifies. Override only if you have a specific operator reason. |

The schema is enforced at startup by `src/config/env.ts` (Zod). Invalid
values exit non-zero with a readable error.

---

## Health check / smoke test

Verify the server starts and lists 9 tools without a real client:

```bash
(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'; sleep 1) \
  | node dist/index.js 2>/dev/null
```

Expected output (formatted): a JSON-RPC response with `result.tools` of length
9. The seven demo tools have descriptions starting with `[DEMO — needs Airbnb
Partner API]`; the two live tools (`airbnb_search`, `airbnb_listing_details`)
do not.

For a richer self-test, supply `--version`:

```bash
node dist/index.js --version
# → 0.1.0-alpha
```

Or print the usage banner:

```bash
node dist/index.js --help
```

---

## Common issues

### "Logs appear in my terminal mixed with JSON"

They don't — by design. All logs go to stderr (fd 2); only MCP JSON-RPC is
written to stdout (fd 1). If you're seeing them mixed, your terminal or
client is merging both streams. See [ADR-0007](./adr/0007-stderr-for-logs.md).

To capture them separately:

```bash
node dist/index.js 2>logs.jsonl
```

### "tools/list returns empty"

Usually a build error. Re-run `npm run build` and check exit code 0. If it
succeeds but the server still lists nothing, run `npm test` and look for
red. Tool registration is exercised by `tests/e2e/server.test.ts`.

### "Live search returns empty results"

Airbnb's HTML structure may have rotated. The parser
([`src/parsers/airbnb-public.ts`](../src/parsers/airbnb-public.ts)) is
multi-strategy: it tries modern `niobeClientData` first, then legacy
`niobeMinimalClientData`. If both fail, you'll see a `ParseFailed` error
with the missing selector logged at WARN level.

To diagnose: check the fixture capture date in
`tests/integration/fixtures/live-*` against today. If the fixtures are months
old, the live HTML has likely drifted. See
[ADR-0006](./adr/0006-multi-strategy-parser.md) for the rotation playbook.

### "Rate limit errors"

Airbnb is throttling. The defaults (1 req/sec, 60/hr) are conservative; if
you're hitting them, you're either running many parallel agents or the
upstream is itself in a tightened mode. Options:

- Reduce request volume (the agent shouldn't normally hit this).
- Wait — `RateLimited` errors include `retry_after_ms`.
- Lower `HTTP_RATE_PER_SEC`/`HOUR` if you want even more padding.

Do **not** raise the rate limits above the defaults without a clear reason.
Polite scraping is part of the security posture (see
[`SECURITY.md`](../SECURITY.md) and
[`docs/limitations.md`](./limitations.md)).

### "Server starts but Claude Desktop doesn't see the tools"

Three failure modes, in order of likelihood:

1. **Stale config.** Re-open `claude_desktop_config.json`, confirm the
   absolute path, restart the app fully (quit, don't just close window).
2. **Wrong Node version.** Claude Desktop sometimes invokes a system Node
   different from your shell's. Try replacing `"command": "node"` with the
   absolute path: `"command": "/usr/local/bin/node"`.
3. **Build artifact missing.** Run `ls dist/index.js` to confirm the build
   output exists. If not, re-run `npm run build`.
