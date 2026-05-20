# ADR 0002: Official @modelcontextprotocol/sdk over a custom implementation

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

MCP is a JSON-RPC 2.0 protocol over stdio (and optionally HTTP/SSE). The wire
format is small enough that we could implement it ourselves — message
parsing, request/response correlation, capability advertisement, tool
registration. Doing so would remove a dependency and give us total control
over behaviour.

The alternative is to use Anthropic's official `@modelcontextprotocol/sdk`
package, which ships:

- A `Server` class (low-level) and a `McpServer` class (higher-level,
  Zod-aware) for hosting tool servers.
- Transport adapters: stdio, HTTP, SSE.
- Streaming support for long-running tools.
- Schema types matching the protocol spec.

The trade-off is the usual build-vs-buy: bus factor, time-to-first-tool,
control over edge cases, exposure to upstream churn.

## Decision

Use **`@modelcontextprotocol/sdk`** as the protocol layer. Build our tool
business logic on top of it.

## Reasons

- **Protocol compliance is handled** — the SDK encodes the wire format
  correctly across versions, including the bits that are tricky (request IDs,
  error envelopes, capability handshake during `initialize`).
- **Streaming support comes for free** — once we want to stream large
  responses (e.g. a long listing-details payload) we get it without
  re-implementing chunking and back-pressure.
- **Maintained by Anthropic** — the SDK moves in lockstep with the protocol
  spec. Bug fixes and protocol-version bumps land upstream and we get them
  via `npm update`.
- **Lower bus factor** — if Nico stops working on this MCP for six months,
  the SDK keeps pace with the ecosystem. A bespoke implementation would
  bit-rot.
- **Ecosystem signal** — every public MCP server we've seen in the wild
  (anthropic/mcp-servers reference repos, third-party tool servers) builds on
  the SDK. Following the herd is the right call for a portfolio project that
  doubles as a pitch artefact.

## Consequences

### Positive

- Less code in our repo, more focus on the business logic of the 9 tools.
- We inherit any protocol-version bumps without effort.
- New transports (when SDK adds them) become available with a config flag.
- Documentation and Stack Overflow / GitHub-issue answers are aimed at the
  SDK, not at our internal JSON-RPC parser.

### Negative / Trade-offs

- We are tied to the SDK's API evolution. The SDK currently exposes two
  server APIs: a low-level `Server` (which we use) and a higher-level
  `McpServer` (which is still maturing).
- The `Server` class is marked deprecated in newer SDK versions in favour of
  `McpServer`. We knowingly stay on `Server` because the higher-level API
  doesn't yet expose every hook we need (custom error envelopes, request
  middleware for `userAgent` overrides).
- Bumping the SDK can be a breaking change — we treat it as a minor version
  bump for our package even when the SDK changes are non-breaking, just to be
  safe.

### Mitigations

- One inline `eslint-disable-next-line @typescript-eslint/no-deprecated` in
  `src/server.ts` where we instantiate `new Server(...)`, with a comment
  pointing to this ADR.
- `.dependabot.yml` groups `@modelcontextprotocol/*` together so SDK bumps
  arrive as a single PR with all the relevant tests in one place.
- When `McpServer` reaches parity, the migration is single-file — `src/server.ts`
  is small (~80 lines).

## References

- `src/server.ts` — current `Server` instantiation + tool routing.
- `package.json` — `"@modelcontextprotocol/sdk"` dependency.
- ADR-0001 (TypeScript choice), ADR-0003 (Zod validation), ADR-0007 (stderr
  logging dovetails with stdio transport).
- MCP spec: <https://modelcontextprotocol.io>
