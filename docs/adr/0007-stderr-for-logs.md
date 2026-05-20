# ADR 0007: Stderr for logs, stdout reserved for MCP JSON-RPC

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

MCP servers most commonly communicate with their host (Claude Desktop,
Cursor, Continue.dev, an agent loop) over **stdio**: the host writes
JSON-RPC requests to the server's stdin, the server writes JSON-RPC
responses to stdout. The transport is line-delimited (or framed by
Content-Length headers in some clients).

We use `pino` for structured logging. Pino's default destination is
**stdout**. That default is fine for ordinary Node services but breaks
MCP over stdio: every log line ends up interleaved with the JSON-RPC frames,
and the host's parser sees malformed protocol traffic.

The fix is well-known but easy to get wrong. We need to lock it in.

## Decision

Configure `pino` to write to **file descriptor 2 (stderr)**. Stdout is
reserved exclusively for MCP JSON-RPC. Any code path that wants to log
goes through the pino logger; no direct `console.log` is allowed in
server code (only in tests and scripts).

## Reasons

- **Required by the MCP transport contract over stdio.** Mixing logs with
  protocol on the same file descriptor breaks every host we tested
  (Claude Desktop, Cursor, Continue.dev).
- **Common pattern in CLI tooling.** Any program that talks to a parent
  process over stdout uses stderr for diagnostics. This is the convention
  for `grep`, `git`, `ssh`, every Unix tool — no surprises for engineers
  reading the codebase.
- **Container runtimes capture both streams independently.** Docker, k8s,
  Vercel, Fly.io — they all give you `stdout` and `stderr` as separate log
  streams. We lose nothing by writing to stderr.
- **Single point of enforcement.** `src/lib/logger.ts` constructs the logger
  with `pino.destination(2)`; every module imports from there. There is no
  other path that creates a logger.

## Consequences

### Positive

- MCP hosts see clean JSON-RPC on stdout and never trip over a stray log
  line.
- Operators get exactly the same diagnostics whether they run in Docker,
  k8s, or locally — both streams are captured.
- `console.log` discipline is easy to enforce via lint (a `no-console`
  rule with an allowlist for the tests directory).

### Negative / Trade-offs

- **Users debugging in a terminal have to merge streams.** Running
  `mithgard-bnb-mcp` directly in a shell shows nothing in stdout (correct —
  there's no host to send RPC to) and logs scroll on stderr. New users
  sometimes think the process is broken.
- **Pino's `pino-pretty` transport** has to be configured to read from
  stderr too, which is an extra `2>&1 | pino-pretty` in the developer
  workflow.
- **One more thing to teach** in onboarding. Documented in README and
  `docs/architecture.md`.

### Mitigations

- README's "Debugging locally" section shows the canonical incantation:
  `node dist/index.js 2>&1 | pino-pretty`.
- `docs/architecture.md` has a section on the stdio transport contract
  with this ADR linked.
- `npm run dev` script in `package.json` already wires up `pino-pretty` so
  developers get human-readable logs without thinking about it.

## References

- `src/lib/logger.ts` — `pino({ ... }, pino.destination(2))`.
- `src/server.ts` — uses the shared logger; no direct console writes.
- `.eslintrc` (next sprint) — `no-console` rule.
- README "Debugging locally" — terminal incantation.
- ADR-0002 (the SDK's stdio transport assumes stdout is clean).
- MCP transport spec: <https://modelcontextprotocol.io/docs/concepts/transports>
