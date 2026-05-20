# ADR 0004: Result<T, E> over thrown errors at module boundaries

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

TypeScript inherits JavaScript's exception model — any function can throw
anything. The type signature `() => T` actually means "returns T, or throws,
or never returns". There is no compile-time signal about which functions can
fail or how.

For a tool server that maps user input to MCP responses, error handling is
half the job. A search can be rate-limited; a parse can hit a rotated
Airbnb schema; a fetch can time out. We need a discipline for representing
those outcomes.

The two canonical options:

- **Throw exceptions** — idiomatic JavaScript, plays well with `async`/`await`,
  but the error path is invisible in the type system.
- **Return-error-as-value** — borrowed from Rust (`Result<T, E>`), Go (tuple
  returns), and the FP-TS lineage. Errors are part of the type signature, so
  callers cannot ignore them.

## Decision

Use a **`Result<T, E>` tagged union** as the boundary type between modules.
Concretely: `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`.

Errors are typed as `McpError`, a tagged union with variants like
`BadRequest`, `RateLimited`, `ParseFailed`, `NetworkError`, `Internal`.

Throwing is allowed inside a function but **never escapes a module boundary**.
The module wraps any throws into `Result.err(...)` at the edge.

## Reasons

- **Errors are part of the type signature** — caller cannot accidentally
  ignore the failure path; the compiler enforces handling.
- **Easier to reason about partial failure.** When several modules chain
  together, propagating errors as values keeps the control flow linear —
  `if (!r.ok) return r;` instead of try-catch pyramids.
- **Exhaustive matching.** The tagged-union `McpError` lets us pattern-match
  on `error.kind` and have TypeScript flag forgotten cases at compile time.
- **Plays well with FP idioms** in the rest of the codebase — parsers
  compose with combinators, async fetches return `Result<...>` from the
  HTTP layer onwards, etc.
- **Maps cleanly to MCP error envelopes.** The MCP protocol uses JSON-RPC
  error objects; we map `McpError` variants to JSON-RPC codes in one place
  (`src/lib/errors.ts → toJsonRpcError`).

## Consequences

### Positive

- Linear error handling. Reading a tool handler top-to-bottom shows every
  failure point as an explicit `if (!r.ok) return r;`.
- Refactor-safe — adding a new `McpError` variant causes type errors at
  every site that switches over `error.kind` without that case.
- Tests can assert on `result.ok === false` and `result.error.kind === '...'`
  with no `expect().toThrow()` choreography.
- The handler-to-protocol mapping is a single function — every `McpError`
  variant has exactly one JSON-RPC translation.

### Negative / Trade-offs

- **Verbosity at call sites.** Every async chain reads
  ```ts
  const r = await fetchHtml(url);
  if (!r.ok) return r;
  const parsed = parseListings(r.value);
  if (!parsed.ok) return parsed;
  ```
  versus a single `try/await/catch`.
- **Async-await sugar lost.** We don't get the natural exception-propagation
  that `await` gives us — we have to manually short-circuit.
- **Mixed paradigms inside the codebase.** Some libraries throw; we wrap
  them at the seam, which adds a `try { ... } catch { return err(...); }`
  layer.

### Mitigations

- A small helper `tryAsync<T>(fn): Promise<Result<T, McpError>>` wraps any
  throwing async function once. We use it everywhere we touch
  third-party code (cheerio, fetch).
- The verbosity is real but uniform — every handler reads the same way,
  which lowers the cognitive overhead of context-switching between tools.
- We considered FP-TS's `TaskEither` for the same job but rejected it as
  too heavy for a one-developer codebase.

## References

- `src/lib/result.ts` — `Result<T, E>` definition + `ok`, `err`, `tryAsync`
  helpers.
- `src/lib/errors.ts` — `McpError` tagged union + `toJsonRpcError`.
- `src/tools/*/handler.ts` — every handler returns `Result<Output, McpError>`.
- ADR-0003 (Zod issues feed into `BadRequest`).
