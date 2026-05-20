# Contributing to Mithgard BnB MCP

Thanks for thinking about contributing. This is a solo-maintained, open-source project — careful, well-scoped PRs are deeply appreciated. Pull requests, issues, and discussions are all welcome.

Please read the [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.

---

## Project overview

`mithgard-bnb-mcp` is a [Model Context Protocol](https://modelcontextprotocol.io) server that gives AI agents host-side access to Airbnb workflows. Two tools work today on public data; seven are fixture-backed demos waiting for Airbnb Partner API access (see the [README](./README.md) for the full picture).

The goal: be the reference implementation Airbnb (or any partner) can drop a real API behind without rewriting the surface.

---

## Development setup

**Prerequisites:**
- Node.js **20 or newer** (`node --version`)
- npm 10+ (ships with Node 20)
- Git

**Clone and install:**

```bash
git clone https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp.git
cd mithgard-bnb-mcp
npm ci
```

**Common scripts:**

```bash
npm run dev          # watch-mode server via tsx
npm run build        # compile TypeScript to dist/
npm test             # run vitest suite (105+ tests, ~5s)
npm run test:watch   # vitest in watch mode
npm run test:cov     # coverage report (must meet 80/50/80/80 gate)
npm run lint         # eslint flat config
npm run typecheck    # tsc --noEmit
npm run format       # prettier --write .
```

All four gates (`lint`, `typecheck`, `test`, `build`) must pass before a commit lands. The Husky pre-commit hook enforces this locally; CI re-runs them on every PR.

---

## Project structure

```
mithgard-bnb-mcp/
├── src/
│   ├── index.ts              # entry point + CLI flag parsing
│   ├── server/               # MCP server wiring
│   ├── tools/                # one folder per tool (see below)
│   ├── lib/                  # shared libraries (http, cache, result, logger, telemetry)
│   └── types/                # cross-cutting type definitions
├── tests/
│   ├── unit/                 # mirrors src/ structure
│   ├── integration/          # cross-module flows (rate-limit, cache, etc.)
│   └── e2e/                  # live network tests (gated on E2E_LIVE=1)
├── docs/
│   ├── tools/                # per-tool reference docs
│   ├── pitch/                # outreach material
│   ├── specs/                # design specs + ADRs
│   └── architecture.md       # arrives in a later dispatch
├── landing/                  # static site for bnb.mithgard.ai
└── Dockerfile                # multi-stage distroless build
```

---

## How to add a new tool

Every tool lives in its own folder under `src/tools/<name>/`. The shape is:

```
src/tools/my_new_tool/
├── schema.ts        # Zod input + output schemas
├── handler.ts       # pure-function business logic
├── tool.ts          # MCP tool registration (binds schema + handler)
├── fixtures/        # only for demo tools awaiting a real API
└── *.test.ts        # collocated unit tests
```

The pattern, in order:

1. **Schema first.** Define `inputSchema` and `outputSchema` in `schema.ts` with full Zod types. No `z.any()` without a comment explaining why.
2. **Handler.** Pure function returning `Result<Output, McpError>`. No thrown errors — use the `Result` tagged union from `src/lib/result.ts`.
3. **Tool registration.** Wire schema + handler in `tool.ts`, wrap with `withTelemetry` for the request envelope.
4. **Docs.** Add `docs/tools/<name>.md` matching the format of the existing files (purpose, inputs, outputs, errors, examples).
5. **Tests.** Unit tests for the handler, integration tests if it hits a network or cache, e2e (gated) if it touches live Airbnb.
6. **Register.** Add the tool to the registry in `src/tools/index.ts`.

Reference the existing tools as templates:

- **Live tool template:** `src/tools/airbnb_search/` — full HTTP + parsing + cache flow.
- **Demo tool template:** `src/tools/host_insights/` — fixture-backed, returns `_mock: true` + `_pitch` field.

---

## Mock tools — please don't try to "make them real"

Seven of the nine tools are intentionally fixture-backed demos:

- `host_insights`
- `guest_message_assistant`
- `booking_request_triage`
- `smart_pricing`
- `calendar_optimizer`
- `review_responder`
- `turnover_coordinator`

They return `_mock: true` and a `_pitch` field documenting the Airbnb Partner API endpoint they would consume. They are **not** placeholders for scrapers. Do not submit PRs that wire them to scraped private endpoints, headless-browser login flows, or cookie replay. Such PRs will be closed.

When Airbnb opens Partner API access (or another supported integration path appears), each demo tool gets a real adapter behind its existing schema. Until then, the schemas, fixtures, and handler shape are the contribution.

If you have an idea for a **new** demo tool, open an issue first so we can discuss whether it fits the host-workflow surface.

---

## Commit style

This repo uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/), enforced by `commitlint` via Husky.

**Allowed types:**

| Type | Use for |
|---|---|
| `feat` | new user-visible feature or tool |
| `fix` | bug fix |
| `docs` | documentation only |
| `refactor` | code change that neither fixes a bug nor adds a feature |
| `test` | adding or fixing tests |
| `chore` | tooling, deps, build config, repo housekeeping |
| `perf` | performance improvement |
| `style` | formatting only (rare — Prettier handles most cases) |
| `ci` | CI configuration changes |
| `build` | build system or external dependency changes |
| `revert` | reverting a previous commit |

**Format:**

```
<type>(<optional-scope>): <short imperative summary>
```

Examples:

```
feat(tools): add seasonal_demand_forecast tool
fix(http): retry 429 with exponential backoff up to 3 attempts
docs(readme): clarify mock vs live tool distinction
test(cache): cover ttl expiry edge case
```

Keep the subject under 72 characters. Use the body (separated by a blank line) for the "why" if it's not obvious.

---

## Pull request process

1. **Branch from `main`** with a descriptive name: `feat/seasonal-pricing`, `fix/parser-niobe-fallback`, `docs/api-reference`.
2. **Write tests with the code.** No mocks of internal modules — use real implementations. Mock only the network boundary (`msw`).
3. **All four gates green** (`lint`, `typecheck`, `test`, `build`) locally and in CI.
4. **Coverage must hold.** The CI gate is **80% lines / 50% branches / 80% functions / 80% statements**. PRs that drop coverage below the threshold are blocked.
5. **No `eslint-disable` without justification.** If you must disable a rule, include a comment explaining why, in the same commit.
6. **ADR for architectural decisions.** Adding a new dependency, changing a protocol, swapping a library, introducing a new pattern — write an ADR in `docs/adr/NNNN-short-name.md`. Reference it in the PR description.
7. **PR description.** What changed, why, how it was tested. Link to the issue if one exists.
8. **One logical change per PR.** Two unrelated improvements = two PRs.
9. **Be patient.** Reviews come when the maintainer has focus time.

---

## Coverage thresholds

CI enforces these globally:

| Metric | Threshold |
|---|---|
| Lines | 80% |
| Branches | 50% |
| Functions | 80% |
| Statements | 80% |

Some files are excluded from coverage (entry points, type-only files, generated code) — see `vitest.config.ts` for the canonical list. Don't add to the exclusion list without an ADR.

---

## When you need an ADR

Write an Architecture Decision Record in `docs/adr/` for:

- **Adding a new runtime dependency.** Why this one, what was considered, what's the upgrade story.
- **Changing the public tool surface.** Renaming a tool, removing a tool, changing a schema in a breaking way.
- **Introducing a new architectural pattern.** New error type, new middleware, new transport.
- **Choosing between two non-trivial approaches.** When the "why" of the choice matters for future readers.

ADR template:

```markdown
# NNNN. <Title>

Date: YYYY-MM-DD
Status: proposed | accepted | superseded

## Context
<why we're deciding this now>

## Decision
<what we decided>

## Consequences
<what becomes easier, what becomes harder, what's the migration path>
```

---

## Licensing and copyright

This project is [MIT licensed](./LICENSE). By contributing, you agree your contribution is provided under the MIT License.

There is **no CLA**. Contributors retain copyright to their contributions — each file's git history is the record. Add a copyright header only if you're contributing a substantial new file you want explicitly credited.

---

## Reporting bugs and requesting features

- **Bugs:** open a [bug issue](.github/ISSUE_TEMPLATE/bug.yml) with reproduction steps, expected vs actual behaviour, and your Node/OS versions.
- **Features:** open a [feature issue](.github/ISSUE_TEMPLATE/feature.yml) describing the host workflow you're trying to enable.
- **Security:** **do not** open a public issue. See [SECURITY.md](./SECURITY.md).
- **Questions:** check the [README](./README.md) and `docs/` first; otherwise open a GitHub Discussion.

---

## Contact

Project maintainer: **Nico Kaitinnis** — `nicolaskaitinnis1991@gmail.com` · [mithgard.ai](https://mithgard.ai)

Thanks for reading this far. Looking forward to your PR.
