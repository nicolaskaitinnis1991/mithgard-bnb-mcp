# ADR 0003: Zod for runtime validation

- **Status:** Accepted
- **Date:** 2026-05-04
- **Deciders:** Nico Kaitinnis

## Context

Every MCP tool needs a strict input contract — the host (Claude Desktop,
Cursor, an agent loop) sends a JSON payload, and we must validate it before
running any business logic. Same on the output side: the tool response is
typed and must match what the schema advertised in the `tools/list`
discovery handshake.

The TypeScript type system is erased at compile time, so we need a runtime
validation layer. The options in late 2026:

- **Zod** — schema-first, infers TS types from schemas, large ecosystem.
- **valibot** — Zod-like API, smaller bundle, fewer features.
- **yup** — older, less idiomatic TS.
- **io-ts** — fp-ts-style codecs, steep learning curve for the team.
- **ajv** — JSON-Schema based, no TS inference without code generation.

## Decision

Use **Zod** as the single source of truth for every tool's input and output
schema.

## Reasons

- **Single source of truth.** A `z.object({ ... })` definition is both the
  runtime validator AND the TS type via `z.infer<typeof schema>`. We never
  write the same shape twice.
- **First-party MCP support.** The MCP SDK has Zod-native helpers — passing
  a Zod schema to `inputSchema` works directly, and the SDK can derive
  JSON-Schema for the tool-discovery handshake.
- **Tree-shakeable** — only the schema features we use ship to the runtime.
- **Mature.** Zod is widely adopted across the TS ecosystem in 2026; bugs are
  rare, examples and patterns are everywhere.
- **DX.** Error messages from `safeParse` are structured and human-readable —
  good enough to ship to MCP clients as part of the error envelope without
  reformatting.

## Consequences

### Positive

- Every tool ships a `schema.ts` next to its handler. Validation happens at
  the boundary, never inside business logic.
- Refactor-resistant: change the schema, the TS type follows automatically.
- Outputs can also be validated in tests — we use `outputSchema.parse(actual)`
  as a final assertion to prove the handler honours its contract.
- Error envelopes are easy to construct from Zod issues — we map
  `ZodIssue[]` to our `McpError` tagged union (see ADR-0004).

### Negative / Trade-offs

- **`verbatimModuleSyntax` interaction.** Zod's inferred types are erased,
  so any time we import the type-only form, it must be `import type { ... }`
  to satisfy strict TS. Forgetting this gives a build error.
- **Parse cost.** Zod runs at every tool call. For our 9 small tools this
  is negligible (<1 ms in benchmarks), but a different workload might care.
- **Schema-author discipline.** Zod is permissive by default — `.strict()`
  must be added to object schemas to reject unknown keys. We make that the
  team convention.

### Mitigations

- The `import type` rule is documented in `docs/HANDOFF.md` under "Known
  catalog deviations" — every `z.infer` import goes through a `import type`.
- Each tool's `schema.ts` enables `.strict()` on top-level objects. CI lint
  catches drift via a custom rule once T140 lands (deferred).
- For high-throughput tools (none yet) we can pre-compile schemas with
  `z.preprocess` and cache; not needed today.

## References

- `src/tools/*/schema.ts` — every tool ships its Zod schema alongside the
  handler.
- `src/lib/errors.ts` — `McpError` tagged union with `BadRequest` variant
  that carries Zod issues.
- `docs/HANDOFF.md` — `import type` discipline note.
- ADR-0001 (TS strict), ADR-0004 (Result type), ADR-0005 (mock fields like
  `_mock: true` are part of every mock output schema).
- Zod docs: <https://zod.dev>
