# Security Notes

## Dependency audit — 2026-05-04

`npm audit --production` reports **4 vulnerabilities** (3 moderate, 1 high).

All four are **transitive sub-dependencies of `@modelcontextprotocol/sdk@1.29.0`**
and live in code paths this server does not import. The runtime is not exposed.

### Traceback

| Package | Severity | Direct dep? | Runtime path? | Path via | Resolution |
|---|---|---|---|---|---|
| `fast-uri` `<=3.1.1` | high | No | No | `@modelcontextprotocol/sdk → ajv → fast-uri` | Used by AJV for JSON-schema URI validation. The SDK's `Server`/`StdioServerTransport` (our only entry points) does not pass user-controlled URIs to AJV. Tracked upstream; not exploitable in our usage. |
| `hono` `<=4.12.17` | moderate | No | No | `@modelcontextprotocol/sdk → hono` and `@modelcontextprotocol/sdk → @hono/node-server → hono` | Hono ships with the SDK for the HTTP/SSE transport variants we do **not** use (we use `StdioServerTransport`). Vulnerabilities affect JSX-SSR, JWT verify, and cache middleware — none of which are reachable from stdio. |
| `ip-address` `<=10.1.0` | moderate | No | No | `@modelcontextprotocol/sdk → express-rate-limit → ip-address` | XSS in `Address6` HTML-emitting methods. We never call those methods; we don't even instantiate `express-rate-limit`. |
| `express-rate-limit` `8.0.1 – 8.5.0` | moderate | No | No | `@modelcontextprotocol/sdk → express-rate-limit` | Only the SDK's HTTP transport uses this. Stdio transport bypasses it entirely. |

### Method

```bash
npm audit --production
npm ls hono ip-address express-rate-limit fast-uri
grep -rn "from ['\"]hono" src/                  # 0 hits
grep -rn "from ['\"]ip-address" src/            # 0 hits
grep -rn "from ['\"]express-rate-limit" src/    # 0 hits
grep -rn "from ['\"]fast-uri" src/              # 0 hits
grep -rn "from ['\"]ajv" src/                   # 0 hits
```

All four are hoisted into `node_modules/` by `@modelcontextprotocol/sdk`. They are
not imported by any file under `src/`. The SDK entry points we use (`Server`,
`StdioServerTransport`, schema types from `types.js`) do not transit these libs at
runtime when communicating over stdio.

### Why we don't run `npm audit fix` today

The "fix" path either:

1. Bumps `@modelcontextprotocol/sdk` to a version we haven't validated against our
   test suite, or
2. Forces a downgrade/upgrade of transitive deps that creates lockfile drift
   without changing the actual runtime behaviour (because we never touch those
   libs).

We accept the audit noise rather than risk a SDK-version regression on the eve
of the v0.1.0-alpha.1 cut.

### What would change this calculus

- If we switch from stdio to HTTP/SSE transport, `hono` / `express-rate-limit` /
  `ip-address` enter the runtime path. At that point we patch immediately or
  pin to a fixed minor.
- If any of these become a direct dependency in our `package.json`, the table
  above is wrong and the fix becomes mandatory.
- If a fixed minor of `@modelcontextprotocol/sdk` ships, we bump on its own commit
  (not bundled with feature work) and re-run `npm audit --production` to confirm
  the count drops to zero.

### Last review

| Date | By | Result |
|---|---|---|
| 2026-05-04 | claude (D11) | 4 transitive-only via MCP SDK, documented, no action |
