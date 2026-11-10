# ADR 0008: Node.js 22.12 minimum runtime

- **Status:** Accepted
- **Date:** 2026-11-10
- **Deciders:** Nico Kaitinnis

## Context

The server was introduced on Node.js 20. That line reached end of life on
2026-04-30. Two tools already installed by this repo now declare a higher
floor: `@commitlint/cli` 21 requires `node >=22.12.0`, and Vitest 5.1.0
declares `node: ^22.12.0 || ^24.0.0 || >=26.0.0`.

`npm ci` on Node 20 does not abort on those engine ranges (it prints
`EBADENGINE`). The test suite also still executed under Node 20.20.2. That
is an unsupported combination, not a supported runtime: the next Vitest or
commitlint patch can start using syntax Node 20 cannot parse, and CI would
only notice after the fact.

## Decision

Set `engines.node` to `>=22.12.0`. Run CI and the release verify job on
Node 22. Build the image from `node:22-bookworm-slim` and
`gcr.io/distroless/nodejs22-debian12`.

`@types/node` is `^22.12.0` so it satisfies the same floor (Vite 8, pulled
in as Vitest's required peer, accepts `@types/node` `^20.19.0` or
`>=22.12.0`).

## Consequences

Contributors and the production image need Node.js 22.12 or newer. Node.js
24 remains inside the `>=22.12.0` range. Node.js 20 is no longer a supported
place to install dependencies or run the server.
