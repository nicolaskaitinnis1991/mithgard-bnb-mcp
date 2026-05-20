# ADR 0001: TypeScript over Python

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

The Mithgard portfolio mixes language stacks deliberately: host-tooling
(Mundart, Schreibtisch, Cockpit, this MCP) is TypeScript, ML- and data-heavy
projects (Lemma, Idea-Genome embedding services) are Python. When starting
`mithgard-bnb-mcp` we had to pick one.

The Model Context Protocol has two reference SDK implementations from
Anthropic: a TypeScript SDK (`@modelcontextprotocol/sdk`) and a Python SDK
(`mcp` on PyPI). Both are official; both implement the same wire protocol.
Either could host the 9 tools we needed.

The decision needed to factor in: (a) where the code will run (Claude Desktop,
Cursor, Continue.dev — all of which spawn MCP servers as subprocesses), (b)
how the team will distribute the binary, (c) what other Mithgard tools we want
to share patterns with, and (d) which SDK has the smoother developer
experience for a tool-heavy server.

## Decision

Use **TypeScript strict mode** with the official
`@modelcontextprotocol/sdk` and Zod for validation.

## Reasons

- The official TypeScript MCP SDK is the more mature of the two — the JSON-RPC
  layer, transport adapters, and tool-registration helpers are battle-tested
  by Anthropic's first-party tools.
- Single-binary distribution via Docker is straightforward (`node:22-alpine`
  base, `npm run build`, copy `dist/`) and we get a slim image with no
  language-runtime gymnastics.
- Type-safety on tool I/O lines up 1:1 with Zod schemas — one definition gives
  us both the runtime validator AND the inferred TypeScript type, which we
  return from handlers.
- The MCP host-tooling lane of the Mithgard portfolio is already TypeScript
  (Mundart's webhook handlers, Schreibtisch's ops UI, the upcoming Cockpit).
  Sharing the lane keeps mental load low when context-switching between
  projects.
- Python's place in the portfolio is ML and scientific computing — Lemma's
  foresight engine, Idea-Genome's 22 embedding services. Pulling Python into
  a tool server doesn't earn anything we don't already get from TS.
- npm publish + Docker GHCR + Claude Desktop config snippets are all
  copy-paste idioms that work without bespoke packaging.

## Consequences

### Positive

- Strict TypeScript catches a class of bugs at compile time (null, undefined,
  exhaustiveness over tagged unions) that we would otherwise have to write
  tests for.
- Zod + TS inference means we never write a type twice — the schema IS the
  type.
- Bundle size with `esbuild` is small enough to fit in a Docker image around
  ~120 MB.
- We can lean on the rest of the Mithgard TS stack (shared lint rules,
  husky/lint-staged config patterns, our standard `tsconfig.json` base).

### Negative / Trade-offs

- `tsconfig.json` strict mode pulls in `exactOptionalPropertyTypes` and
  `verbatimModuleSyntax`, which together require careful discipline around
  optional fields (conditional spreads instead of `field: undefined`) and
  type-only imports (`import type { ... }`).
- The low-level `Server` API from the MCP SDK is being deprecated in favour
  of `McpServer` — we knowingly stay on the older API for now (see ADR-0007).
- No access to the Python data-science ecosystem from inside the server. Not
  needed for what this tool does, but worth naming.

### Mitigations

- The strict-mode pain points are catalogued in `docs/HANDOFF.md` under
  "Known catalog deviations" so future agents know to write
  `...(maybeValue !== undefined && { field: maybeValue })` rather than
  `field: maybeValue ?? undefined`.
- The deprecated-API lock-in is itemised in ADR-0002 and ADR-0007; when
  `McpServer` reaches parity, migration is a single-file change.

## References

- `src/server.ts` — the low-level MCP server bootstrap.
- `package.json` — `@modelcontextprotocol/sdk`, `zod`, `pino`, `cheerio`.
- `tsconfig.json` — strict mode + `exactOptionalPropertyTypes`.
- `docs/HANDOFF.md` — strict-mode deviation patterns.
- ADR-0002, ADR-0003, ADR-0007.
