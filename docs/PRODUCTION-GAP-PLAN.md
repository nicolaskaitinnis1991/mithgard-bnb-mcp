# Production Gap Plan — 2026-05-08

> Author: planner-subagent (Claude Opus 4.7 1M)
> Repo: `MITHGARD-BNB-MCP` @ `main` / tag `v0.1.0-alpha`
> Goal: move from "v0.1.0-alpha pitch-ready" to "genuinely open-source production-grade,
> Airbnb-engineer-reviewable, npm + GHCR publishable".
> Method: read-only survey + verification commands. No source touched.

---

## Current state (verified 2026-05-08)

### Gates (all green)
- `npm run lint` — exit 0
- `npm run typecheck` — exit 0
- `npm test` — **34 test files, 81 passed, 2 skipped** (E2E live tests gated on `E2E_LIVE=1`)
- `npm run build` — exit 0, dist emitted
- `npm run test:cov` — **All files: 94.8% statements, 56.7% branches, 96.82% functions, 94.8% lines**
  (well above thresholds 80/50/80/80)

### Repo facts
- 118 commits on `main`, 8 tags, latest `v0.1.0-alpha` on commit `7a0a08b`
- Tree clean except untracked `audit.md` (watcher artifact — gitignore intentionally
  reverted in `b89c25c`; not our file)
- GitHub remote: `nicolaskaitinnis1991/mithgard-bnb-mcp`, **still private**
- `gh run list` — could not verify on this run (API rate-limit 403 at the time of survey).
  CI status per `audit.md` from 2026-05-08T21:14Z notes CodeQL run on `584f543` was rot;
  the auto-skip `if: github.event.repository.private == false || visibility == 'public'`
  was the fix and lands on subsequent commits — must re-verify before dispatch 0.

### Code surface
- 9 MCP tools registered, 2 live (search, listing-details), 7 demo (host_insights,
  guest_message_assistant, booking_request_triage, smart_pricing, calendar_optimizer,
  review_responder, turnover_coordinator) — all return `_mock: true` + `_pitch` field
- Live parser is multi-strategy (modern `niobeClientData` + legacy `niobeMinimalClientData`)
  with documented base64 `DemandStayListing:<num>` ID decoding
- Logger: `pino`, writes to **fd 2 (stderr)** — correct, stdout reserved for MCP JSON-RPC.
  Default PII-redact paths set (`*.email`, `*.phone`, `*.guest_name`, `*.message_text`).
- HTTP client: `undici` + `p-queue` (1 req/sec, 60/hr, jitter), 429 retry-with-backoff up
  to 3 attempts, `Result<T, McpError>` envelope.
- Error model: tagged union `RateLimited | UpstreamHTTP | ParseFailed | ValidationFailed |
  NotImplemented` with constructor helpers handling `exactOptionalPropertyTypes: true`.

### What's NOT yet there (the gap surface this plan closes)
- `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md` — all missing
- `docs/adr/` — directory exists but **empty** (0 ADRs)
- `docs/architecture.md`, `docs/deploy.md`, `docs/limitations.md` — missing
- `examples/usage.md`, `examples/agent-conversation.md` — missing
- `.github/ISSUE_TEMPLATE/` — directory exists but **empty**
- `.github/PULL_REQUEST_TEMPLATE.md` — missing
- `.github/workflows/release.yml` — missing
- `.github/FUNDING.yml` — missing (optional)
- `package.json` lacks `keywords`, `repository`, `bugs`, `homepage`, `author` fields
- `package.json` `version` is still `"0.0.0"` though the tag is `v0.1.0-alpha`
- `src/server.ts` hardcodes `version: '0.0.0'`
- `src/lib/telemetry.ts` (T121 catalog) — **never built**; `request_id` defined but unused;
  no `duration_ms`, no `cache_hit` log field, no `--debug` flag
- No `--version` CLI flag, no `--help` CLI flag
- User-Agent is a spoofed Chrome string, not the catalog-spec'd
  `mithgard-bnb-mcp/<version> (+github.com/mithgard/bnb-mcp)` (Airbnb-courtesy identity)
- No `scripts/smoke.sh` pre-release verification
- No npm `.npmrc` for publish-access setting
- No changesets / semantic-release config
- No Docker multi-arch build / `release.yml` triggering GHCR publish
- Pitch material has hard placeholders: `[Recipient name]`, `[link to repo]`, tracker
  rows all in `RESEARCH` status, LinkedIn URL in cold-email signature is intentionally
  flagged as placeholder
- Listing-details `price_per_night = 0` is documented at `src/parsers/airbnb-public.ts:243`
  as deliberate (PDP doesn't embed per-night price up-front) — needs an ADR explaining
  the design choice publicly, or a workaround proposal
- Husky v9 prints deprecation warnings — will break on v10
- `npm audit --production` reports 4 vulnerabilities (3 moderate, 1 high) — all in
  **transitive deps** (`hono`, `ip-address`, `express-rate-limit`); none of these are
  in the runtime path of this MCP — they're hoisted from some other dev tool. Needs
  `npm ls` traceback in the plan to confirm before deciding to ignore vs fix.
- One `eslint-disable` on `src/server.ts:7` for `@typescript-eslint/no-deprecated`
  (MCP SDK low-level `Server` API) is justified inline — acceptable as-is, but worth
  an ADR plus a note about migrating to `McpServer` wrapper if/when its API stabilises.
- Two `eslint-disable` on `src/parsers/airbnb-public.ts:413,417` for the JSON walker
  helper — justified (walking truly-`unknown` JSON), but should be isolated to one
  micro-module so the rest of the parser stays strict.

### Findings not in the briefing
- **Committed HTML fixtures contain Airbnb's own Bugsnag apiKey**
  (`e393bc25e52fe915ffb56c14ddf2ff1b` in `tests/integration/fixtures/live-2026-05-04/*.html`).
  This is **Airbnb's** public client-side key, not ours, embedded in their JS bundle —
  it's already on every airbnb.com page load. Strictly speaking it's not a leak. But an
  Airbnb engineer skimming our repo will see "fixtures containing their telemetry token"
  and pattern-match to scraper-misuse. **Recommend a 5-min cleanup pass** that nulls the
  inline `<script>` blocks the parser doesn't need (keeps fixtures < 200 KB, leaves only
  the `#data-deferred-state-0` block the parser actually reads) — closes this perception
  attack surface and shrinks the repo by ~1.3 MB.
- **Two e2e live tests are `describe.skip`'d** and gate on `E2E_LIVE=1`, but the
  `if (process.env.E2E_LIVE !== '1') return` inside the `it()` body is unreachable
  (the outer `describe.skip` already short-circuits). Cosmetic — fix in observability
  pass.
- **`audit.md` (watcher artifact) is checked into the repo's working tree**, gitignored
  in `5db1438` then **reverted** in `b89c25c` with rationale "file belongs to watcher
  repo, not here". This is correct, but the file actually exists in `pwd` right now and
  `git status` flags it. It should remain untracked + gitignored, not present in the
  working tree at all. Plan: add to `.gitignore` AND `rm` it during dispatch 0 hygiene.
- **`scripts/build.sh` / `scripts/dev.sh`** are 1-liner thin wrappers around
  `npm run typecheck && lint && test:cov && build`. Either delete or absorb into npm
  scripts (`npm run verify`). They add zero value as separate files.
- **`examples/claude-desktop-config.json`** has placeholder
  `"/ABSOLUTE/PATH/TO/16_MITHGARD-BNB-MCP/dist/index.js"` — uses the *old* repo prefix
  `16_MITHGARD-BNB-MCP`. The directory actually lives at `MITHGARD-BNB-MCP` (no `16_`).
  Stale. **Bug to fix in the docs dispatch.**
- **`docs/HANDOFF.md` references `~/Desktop/16_MITHGARD-BNB-MCP`** as the repo path —
  also stale. The repo lives at `~/Desktop/MITHGARD/Tools und MCP/MITHGARD-BNB-MCP/`.
- **`.github/dependabot.yml` exists** but ISSUE_TEMPLATE and workflows are partly
  scaffolded — no ISSUE_TEMPLATE files, no PR template.

---

## Gap categories

### A. Code quality finishing touches
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| `withTelemetry` wrapper (T121) — `request_id`, `duration_ms`, `status`, `cache_hit` per call | Without this, "structured logging" is just `tool.call` info-level fire-and-forget. Pitch claims observability; reality is one log line | M | high (pitch + OSS) |
| `--version` flag returning `package.json` version | Standard CLI hygiene; required for any release workflow that runs `node dist/index.js --version` as a smoke test | S | medium (OSS) |
| `--help` flag printing usage + tool list | Same hygiene; an Airbnb engineer's first instinct after `node dist/index.js` hangs (waiting for stdio JSON-RPC) will be Ctrl-C then `--help` | S | medium (pitch) |
| Bump `version: "0.1.0-alpha"` in `package.json` AND `src/server.ts` MCP-name block | Tag and version disagree right now (`v0.1.0-alpha` tag → `0.0.0` code). Embarrassing in `tools/list` response and `npm pack --dry-run` output | S | high (pitch) |
| User-Agent → `mithgard-bnb-mcp/0.1.0-alpha (+https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp)` | Airbnb-courtesy identification; spoofed Chrome UA is exactly the kind of thing legal/security review flags | S | high (pitch, legal review) |
| `--debug` flag dumping sanitized request/response envelopes | T127 in catalog; observability for self-hosters | S | low |
| Stale `examples/claude-desktop-config.json` path | First-impression breakage; copy-paste it and Claude Desktop fails | S | medium (OSS) |
| Stale `docs/HANDOFF.md` repo path references | Internal — no external impact, but signals "abandoned" | S | low |
| Strip `<script>` noise from live HTML fixtures (down to the `#data-deferred-state-0` block) | Shrinks repo from ~1.4 MB live-fixture to ~150 KB; removes Bugsnag-key-perception issue | M | medium (pitch perception) |
| Decide: keep `scripts/build.sh` + `dev.sh` or fold into `npm run verify` + `npm run dev` | Repo hygiene; two ways to do the same thing | S | low |

### B. Open-source community files (the "GitHub special files")
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| `CHANGELOG.md` (keep-a-changelog format) with `v0.1.0-alpha` entry | Every reviewer checks this. Absence = "amateur" | S | high (OSS) |
| `CONTRIBUTING.md` (dev setup, commit style, ADR-for-deps rule, test requirements) | Tells contributors how to land a PR. Absence = no PRs | S | high (OSS) |
| `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1) | Standard. GitHub UI nags otherwise | S | medium (OSS) |
| `SECURITY.md` (disclosure email, SLA, scope) | **High signal** to security-conscious reviewers (read: Airbnb). Should explicitly say "no PII handled by this server" | S | high (pitch, OSS) |
| `SUPPORT.md` (where to ask questions — GitHub Discussions vs Issues) | Optional but recommended; sets expectations | S | low |
| `.github/ISSUE_TEMPLATE/bug.yml` (structured form) | Filters noise; signals "we run a real project" | S | medium (OSS) |
| `.github/ISSUE_TEMPLATE/feature.yml` | Same | S | medium (OSS) |
| `.github/ISSUE_TEMPLATE/config.yml` (`blank_issues_enabled: false`, point to discussions for support) | Required to actually enforce the templates | S | medium (OSS) |
| `.github/PULL_REQUEST_TEMPLATE.md` (checklist: tests, docs, changeset, ADR if dep) | Same | S | medium (OSS) |
| `.github/FUNDING.yml` | Optional; only if Nico wants GitHub Sponsors | S | low |

### C. Observability (Block 5 — entirely missing)
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| `src/lib/telemetry.ts` — `withTelemetry(log, name, fn)` wrapper | T121. Single function. Threads `request_id` + duration + status through every tool call | S | high (pitch claim) |
| Wire telemetry into all 9 tool builders (`src/tools/<name>/tool.ts`) | T123 | M | high |
| Emit `cache_hit: boolean` on search + listing-details handlers | T124. Today only `listing-details` does, search doesn't | S | medium |
| `src/lib/otel.ts` — optional OTLP traces gated on `OTEL_EXPORTER_OTLP_ENDPOINT` env var | T125. Env var already parsed but never used | M | medium (OSS adoption) |
| `--debug` flag in `src/index.ts` to dump sanitized I/O envelopes | T127 | S | low |
| `src/lib/redaction.ts` — extra-paranoid PII strip beyond pino's redact paths | T129. Doc claims "no PII storage" → put teeth on it | S | medium (pitch) |
| `docs/architecture.md` Observability section — documents log shape | T130. Reviewers need this to deploy | S | medium |

### D. Documentation depth
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| `docs/adr/0001-typescript.md` (vs Python — already explained in spec §5.3, formalise it) | ADRs are how engineers signal "we made considered choices". Empty `docs/adr/` is a tell | S | high (pitch) |
| `docs/adr/0002-mcp-sdk.md` (official SDK vs custom) | Same | S | medium |
| `docs/adr/0003-zod-validation.md` (zod as single source for input + output) | Same | S | medium |
| `docs/adr/0004-result-type.md` (Result vs throw) | Same | S | medium |
| `docs/adr/0005-mock-vs-live.md` (mocks ehrlich labeled with `_mock: true` + `_pitch`) | The honesty-of-mocks story IS the pitch. Document it formally | S | high (pitch) |
| `docs/adr/0006-multi-strategy-parser.md` (modern + legacy fallback rationale; how to rotate when Airbnb changes JSON shape again) | Future maintainer's lifeline; reviewer signal of seriousness | S | medium |
| `docs/adr/0007-stderr-for-logs.md` (stdout reserved for MCP JSON-RPC; one-line gotcha but bites every MCP server author) | High-leverage knowledge transfer | S | medium |
| `docs/adr/0008-listing-pdp-price-zero.md` (per-night price isn't on the PDP HTML; consumers should call `airbnb_search` for live pricing) | Pre-empts the obvious bug report from a careful reviewer who'll open the parser and ask "why is `price_per_night = 0` hardcoded line 243?" | S | high (pitch, OSS) |
| `docs/architecture.md` — long-form readable arch doc (not spec) | Spec is the contract; arch.md is the welcome mat | M | medium |
| `docs/deploy.md` — self-hosting (Docker, Claude Desktop, Cursor, Continue.dev) | Three install paths means three pasta-friendly snippets | M | medium |
| `docs/limitations.md` — what we cannot do (ToS, public-only, no PII, no writes) | T150. Pitch needs this to survive legal review. README has a "Honesty section" — pull it out into its own doc + link | S | high (pitch, legal) |
| `examples/usage.md` — end-to-end real conversation transcript with Claude | T144. Without this, "use it like email" is hand-waving | M | high (pitch) |
| `examples/agent-conversation.md` — 3 realistic agent scenarios | T145. Concrete prompts an Airbnb PM can dry-run mentally | M | medium |
| `docs/tools/*.md` audit — 9 docs already exist (avg ~600 bytes each, very thin). Lift each to ~1.5 KB with input/output example + edge cases | Per-tool docs are reviewer-friction-removers | M | medium (OSS) |

### E. Release pipeline (Block 8 — entirely missing)
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| Flip `package.json#version` to `0.1.0-alpha` | Tag/code consistency | S | high |
| Add `keywords`, `repository`, `bugs`, `homepage`, `author` to `package.json` | npm metadata; gives the package a real face | S | medium |
| `.npmrc` (`access=restricted` for private alpha; flip to `public` at v0.1.0) | npm publishing prep | S | low |
| Decide changesets vs semantic-release; install + configure one | Real release workflow needs a strategy | M | medium |
| `.github/workflows/release.yml` — trigger on `v*` tag → build + publish Docker to GHCR | Catalog T169 | M | medium |
| Docker multi-arch build via `docker buildx` (amd64 + arm64) | Distroless already; just multi-arch missing | M | low |
| `scripts/smoke.sh` — pull image, send `tools/list` over stdio, expect 9 tools, exit 0 | Pre-tag smoke test catches the "I shipped a binary that doesn't start" mistake | S | medium |
| `docs/release-checklist.md` (15-item checklist for tagging a release) | T173 | S | low |
| `docs/rollback.md` (revert Docker tag, npm deprecate, git tag-rollback) | T174 | S | low |
| `User-Agent` string version-bound to `package.json` | T171. Don't hardcode | S | medium |
| `--version` flag — read from `package.json` import (with TS `--resolveJsonModule`) | T172. Already enabled in tsconfig | S | medium |

### F. Repository hygiene
| What's missing / wrong | Why it matters | Effort | Risk |
|---|---|---|---|
| `audit.md` watcher artifact in working tree | Should not exist locally. Re-gitignore + `rm` (or move watcher to operate outside this checkout) | S | low |
| `.gitignore` — add `audit.md`, `.claude/launch.json` already there | Catch the watcher artifact properly this time | S | low |
| Husky v9 deprecation warnings → v10 migration | Will break first time someone runs `npm install` after Husky v10 lands. Migration is `.husky/*` files lose their shebang + sourcing line | M | medium |
| `actions/checkout@v4`, `actions/setup-node@v4`, `codecov/codecov-action@v4` — all current; just confirm with Dependabot | Already covered by `.github/dependabot.yml` | n/a | low |
| `package.json#private: true` — decide: stay true until v0.1.0, or flip false now since we're not on npm anyway | Flip rule: stay `true` until `release.yml` proves it can publish without leaking | S | low |
| `npm audit --production` 4 vulnerabilities — confirm none are in OUR runtime path (`hono`, `ip-address`, `express-rate-limit` are not in our deps) | All are likely hoisted from another devDependency. `npm ls hono` will resolve in 5 seconds | S | medium (pitch perception — `npm audit` output is the first thing some reviewers run) |
| `eslint-disable` on `src/parsers/airbnb-public.ts:413-417` — isolate the unsafe-JSON-walker into a tiny `src/lib/json-walker.ts` so the rest of the parser stays strict | Cosmetic cleanliness; makes the parser file 100% strict-clean | S | low |

### G. Pitch-readiness specifics
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| `docs/pitch/airbnb-cold-email.md` — final LinkedIn URL, real repo URL (drop `[link to repo]`) | Cannot send with placeholders. Already flagged in HANDOFF.md | S | high |
| `docs/pitch/recipient-research.md` — at least 3 candidate rows filled (`RESEARCH` → `READY`) | Pre-condition for sending. Pure human task | S (research M) | high |
| `docs/pitch/competitive-landscape.md` (T155) — vs openbnb/mcp-server-airbnb, Hostaway, Smoobu | Reviewer will ask "why didn't you fork openbnb?". Pre-empt | M | medium |
| `docs/pitch/security-faq.md` (T156) — no login, no PII, rate limits, polite UA | Defensive material for the inbound from Airbnb T&S | M | high (legal) |
| `docs/pitch/legal-faq.md` (T157) — ToS posture, MIT licence, trademark, no commercial pricing today | Same | M | high (legal) |
| README badges — confirm all green (CI badge needs CI URL after public flip) | First-page perception. Right now badges show "pre-alpha" but tag is `v0.1.0-alpha` | S | medium |
| README Status section is stale: claims "v0.0.0 — pre-alpha", "75 passing tests", "Tags: pitch-ready" but reality is `v0.1.0-alpha` + 81 tests + 8 tags | First thing a careful reader notices. Already a tell of "stale draft" | S | high (pitch) |
| `landing/` — sanity-check copy still matches the README + pitch (no contradictions) | Two surfaces telling different stories is a credibility crater | S | medium |
| Demo video (T162-T163) — script written + Loom captured | Cold email mentions "demo video at <link>" → either deliver one or strip the line | M (script) + L (record) | medium (pitch) |

### H. Test-suite hardening
| What's missing | Why it matters | Effort | Risk |
|---|---|---|---|
| Rate-limit test runs 4.08s wall-clock — fragile on CI throttling | Add tolerance band (±200ms), document why test is slow | S | low |
| E2E server stdio test runs 4.33s — could flake on cold CI runner | Add retry-on-first-failure via vitest `retry: 1` for `tests/e2e/*` | S | low |
| Live-fixture refresh procedure — when does it need re-recording? | `docs/architecture.md` should document a "rotate fixture" runbook (download fresh HTML, drop in, re-run integration tests) | S | medium |
| Coverage gates are passed comfortably (94.8/56.7/96.82/94.8 vs 80/50/80/80). Branches has 6.7 ppt slack. Consider raising to 55% to keep tension | Prevents future drift | S | low |
| `noUncheckedIndexedAccess: true` is on (good) → verify no remaining `arr[0]!` non-null assertions in `src/` | Type discipline | S | low |

---

## Recommended execution order

12 dispatches, each 30–90 min of subagent work. Each dispatch ends with `npm run lint &&
npm run typecheck && npm test && npm run build` green and one commit per logical change
(or one squash-commit per dispatch, dispatcher's call).

### Dispatch 1 — Repo hygiene + version bump + observability core (60 min)
**Scope:**
- Add `audit.md` to `.gitignore`; `rm audit.md` (watcher artifact).
- Bump `package.json#version` → `"0.1.0-alpha"`; `src/server.ts` server name block →
  read from `package.json` (import with `assert { type: 'json' }` or `--resolveJsonModule`).
- Add `package.json` metadata: `keywords`, `repository`, `bugs`, `homepage`, `author`.
- Fix stale path in `examples/claude-desktop-config.json` (`16_MITHGARD-BNB-MCP` →
  `mithgard-bnb-mcp`); also fix in `docs/HANDOFF.md`.
- Build `src/lib/telemetry.ts` per catalog T121 — `withTelemetry(log, toolName, fn)`
  wrapper threading `request_id`, `duration_ms`, `status`, `error_kind`.
- Wire telemetry into all 9 `src/tools/<name>/tool.ts` builders (touch each `wrapHandler`
  call site). Emit `cache_hit: boolean` from search + listing handlers.
- Add `tests/unit/telemetry.test.ts` covering `request_id` shape, duration ≥ 0,
  status='ok' on success, status='error' on throw, cache_hit truthy on second call.

**Acceptance:**
- `git status` clean (no untracked `audit.md`).
- `node dist/index.js` starts; `tools/list` response carries `version: "0.1.0-alpha"`.
- Vitest shows ≥ 84 tests passed (3+ new).
- Every tool call writes a single JSON line to stderr with all 5 fields present.

**Dispatch prompt outline:**
> Subject: Dispatch 1/12 — version bump, telemetry, hygiene.
> Read `docs/PRODUCTION-GAP-PLAN.md` Dispatch 1 scope. Implement exactly that scope. Run
> all 4 gates before each commit. Conventional commits. One commit per logical chunk
> (telemetry-lib, telemetry-wire, version-bump, hygiene). Do not touch anything outside
> the scope. Report back with: commit SHAs, new test count, sample log line from
> `node dist/index.js` < /dev/null.

---

### Dispatch 2 — CLI flags + UA + debug logging (45 min)
**Scope:**
- `--version` flag in `src/index.ts` — print `pkg.version` and exit 0 before MCP bootstrap.
- `--help` flag — print short usage (description, install pointer, license) and exit 0.
- `--debug` flag — set log level to `debug`, dump sanitized I/O envelopes per tool call.
- Replace User-Agent default in `src/config/env.ts` with
  `mithgard-bnb-mcp/${pkg.version} (+https://github.com/nicolaskaitinnis1991/mithgard-bnb-mcp)`.
- `src/lib/redaction.ts` — extra-paranoid PII strip (catalog T129), used by `--debug`
  envelope dump. Beyond pino's `redact` paths, also strip any `review_text`, `last_message`,
  `host_name`, `guest_name`, `email`, `phone` from output destined for stderr.
- Add `tests/unit/redaction.test.ts` and `tests/e2e/cli-flags.test.ts` (spawn with
  `--version`, expect `0.1.0-alpha\n` on stdout).

**Acceptance:**
- `node dist/index.js --version` → `0.1.0-alpha`, exit 0.
- `node dist/index.js --help` → usage text on stdout, exit 0.
- `--debug` flag observable in stderr-debug logs but not in stdout MCP traffic.
- Any HTTP request from this server identifies as `mithgard-bnb-mcp/0.1.0-alpha (+url)`.

---

### Dispatch 3 — Community files (CONTRIBUTING, COC, SECURITY, SUPPORT, CHANGELOG) (45 min)
**Scope:**
- `CONTRIBUTING.md` (dev setup, conventional commits, ADR-for-deps rule, test-without-
  mocks philosophy, how to run live e2e with `E2E_LIVE=1`).
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1, verbatim).
- `SECURITY.md` (disclosure email `nicolaskaitinnis1991@gmail.com`, 7-day initial
  response SLA, scope = the MCP server binary + parsers; out of scope = third-party
  Airbnb infra; no PII handled).
- `SUPPORT.md` (optional but recommended; GitHub Discussions = questions, Issues = bugs).
- `CHANGELOG.md` (keep-a-changelog format with `[Unreleased]` and `[0.1.0-alpha] -
  2026-05-04` entries; the alpha entry covers all 9 tools, live parser, landing page,
  test count, CI gates).

**Acceptance:**
- All 5 files exist at repo root.
- Markdown lints (prettier-only — we don't use markdownlint).
- README's "Status" section updates to match the CHANGELOG.

---

### Dispatch 4 — GitHub special files + dependabot polish (30 min)
**Scope:**
- `.github/ISSUE_TEMPLATE/bug.yml` (form: description, repro, expected, actual,
  environment, tool affected).
- `.github/ISSUE_TEMPLATE/feature.yml` (form: motivation, proposal, alternatives).
- `.github/ISSUE_TEMPLATE/config.yml` (`blank_issues_enabled: false`,
  `contact_links: [GitHub Discussions]`).
- `.github/PULL_REQUEST_TEMPLATE.md` (checklist: lint/typecheck/test green,
  added/updated docs, added/updated changeset, ADR for new dep, no secrets).
- Confirm `.github/dependabot.yml` already covers npm + actions (it does).

**Acceptance:**
- Open a fake PR in the dispatcher's mind and confirm the checklist surfaces.
- Open a fake issue → template kicks in.

---

### Dispatch 5 — ADRs (8 files) (60 min)
**Scope:** create one short ADR per architectural decision. Format: Context →
Decision → Consequences → Alternatives considered. Each 600–1000 words.
- `docs/adr/0001-typescript-not-python.md`
- `docs/adr/0002-modelcontextprotocol-sdk.md`
- `docs/adr/0003-zod-validation.md`
- `docs/adr/0004-result-type-not-throw.md`
- `docs/adr/0005-mock-vs-live-honesty.md`
- `docs/adr/0006-multi-strategy-parser.md`
- `docs/adr/0007-stderr-for-logs.md`
- `docs/adr/0008-listing-pdp-price-zero.md`

**Acceptance:**
- All 8 ADR files exist; cross-linked from `README.md` "Architecture" section.
- Each ADR title in the file matches its filename.

---

### Dispatch 6 — Architecture + deploy + limitations docs (60 min)
**Scope:**
- `docs/architecture.md` — readable system tour, diagrams (ASCII), module boundaries,
  data flow, observability log shape, fixture-rotation runbook.
- `docs/deploy.md` — self-hosting via (a) Docker pull from GHCR, (b) `npm i -g`
  (post-publish, document the "will land at v0.1.0" caveat), (c) source checkout +
  `claude-desktop-config.json`, (d) Cursor and Continue.dev install snippets.
- `docs/limitations.md` — lift the README "Honesty section" into its own doc, expand
  with examples ("we will never see your inbox", "the demo tools return a `_mock: true`
  flag — never plumb their output into a real action").

**Acceptance:**
- README links to all three.
- `docs/architecture.md` is between 800 and 2000 words (long enough to be useful, short
  enough to read in 5 min).

---

### Dispatch 7 — Tools docs lift + examples (60 min)
**Scope:**
- Lift each of the 9 `docs/tools/*.md` files to ~1.5 KB with: (a) one-line purpose,
  (b) input schema (zod → JSON pseudo), (c) output schema, (d) one realistic example
  call, (e) edge cases ("rate-limited", "no results", "_mock: true caveat").
- `examples/usage.md` — full transcript: a Claude Desktop session searching Berlin →
  drilling into one listing → asking the demo `host_insights` what occupancy looks like.
- `examples/agent-conversation.md` — 3 self-contained scenarios:
  (1) host triages a borderline booking request,
  (2) host asks for smart-pricing for a 7-night gap,
  (3) host drafts a guest reply to a check-in question.

**Acceptance:**
- Each tools/*.md has all 5 sections.
- Examples files render cleanly on GitHub.

---

### Dispatch 8 — Fixture cleanup + parser micro-refactor (45 min)
**Scope:**
- For each file in `tests/integration/fixtures/live-2026-05-04/*.html`: keep ONLY the
  `<script id="data-deferred-state-0">` block + the surrounding minimal HTML skeleton
  the parser needs to find it. Drop all Bugsnag, analytics, ad-pixel inline scripts.
  Expected reduction: ~1.3 MB → ~150 KB.
- Re-run integration tests after each fixture is trimmed; if a test breaks, restore the
  minimum-necessary surrounding markup.
- Isolate the JSON-walker `pluck` helper into `src/lib/json-walker.ts` with its two
  `eslint-disable` directives scoped to that file only. `src/parsers/airbnb-public.ts`
  becomes fully strict-clean.
- Add `tests/unit/json-walker.test.ts` (3-5 unit tests covering `pluck` on missing
  paths, arrays, nulls).

**Acceptance:**
- `du -sh tests/integration/fixtures/live-2026-05-04` < 200 KB.
- `grep -rn "eslint-disable" src/` returns only `src/server.ts` (MCP-SDK deprecation
  justification) and `src/lib/json-walker.ts` (walker-internal).
- All integration tests still green.

---

### Dispatch 9 — Release pipeline scaffolding (75 min)
**Scope:**
- Install + configure `changesets` (`npx changeset init`). Add one changeset for
  `0.1.0-alpha` covering all 9 tools.
- `.npmrc` with `access=restricted` (since `@mithgard/bnb-mcp` is a scoped public
  package, this gates publish until we flip explicitly).
- `.github/workflows/release.yml` — triggered on `v*` tag push:
  - checkout, setup-node 20, npm ci
  - run all 4 gates
  - `docker buildx build --platform linux/amd64,linux/arm64 -t
    ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:${{ github.ref_name }} --push .`
  - (placeholder for npm publish — gated behind a second workflow_dispatch step until
    the package goes truly public).
- `scripts/smoke.sh` — bash, takes optional image tag arg, defaults to `:latest`,
  pulls the image, sends `tools/list` over stdio, expects 9 entries, exit 0.
- `docs/release-checklist.md` — 15-item checklist for cutting a release.
- `docs/rollback.md` — short procedural doc for un-shipping a bad release.

**Acceptance:**
- `npm run build && bash scripts/smoke.sh` works against the local Docker image.
- `release.yml` lints clean via `actionlint` (or visual inspection vs other releases).
- `.changeset/` directory has one `*.md` entry covering 0.1.0-alpha.

---

### Dispatch 10 — Pitch material finalization (60 min)
**Scope:**
- `docs/pitch/competitive-landscape.md` — table: openbnb/mcp-server-airbnb, Hostaway,
  Smoobu, Hospitable. Rows: scope (read-only vs full PMS), Partner-API access (yes/no),
  host-side workflows covered (count), MCP-native (yes/no), licence. Then a paragraph:
  "why we're different".
- `docs/pitch/security-faq.md` — 8 Q&A pairs covering: scraping posture, PII, rate
  limits, captcha, ToS, login, third-party data sharing, supply-chain.
- `docs/pitch/legal-faq.md` — 6 Q&A pairs: MIT licence reasoning, trademark posture
  (no use of Airbnb trademark beyond nominative-fair-use README mention), copyright
  on fixtures (Airbnb HTML reproduced for testing under fair-use), commercial use,
  open-source obligations, contributor licence agreement (decision: none required).
- README Status section refresh: `v0.1.0-alpha`, 81+ tests, current tag list.
- README badges audit: ensure all link to working URLs (CI badge will only work post-
  public-flip; document the placeholder).

**Acceptance:**
- All three new pitch docs exist.
- README "Status" reflects today's reality.

---

### Dispatch 11 — Final hardening + audit fix-or-document (45 min)
**Scope:**
- Run `npm ls hono ip-address express-rate-limit` to traceback the 4 npm-audit
  vulnerabilities. If they're transitive devDeps NOT in runtime path: document the
  finding in `docs/security-notes.md`. If they ARE in runtime path: run
  `npm audit fix --force` and capture the diff in a commit.
- Raise vitest branch threshold from 50 → 55 (we're at 56.7, gives 1.7 ppt slack).
- Add `retry: 1` to `tests/e2e/*` via vitest config `test.retry`.
- Update `tests/integration/ratelimit.test.ts` to assert a tolerance band
  (3800ms < duration < 5500ms) instead of a single timing assertion.
- Husky v10 migration plan: write `docs/dev-husky-v10.md` outlining the
  shebang-removal + sourcing-line-removal that v10 will require. Don't actually
  migrate yet (v10 not GA).
- Decide on `scripts/build.sh` + `dev.sh`: either delete (replaced by `npm run verify`
  alias) or keep with comment. Recommend delete + add `"verify": "npm run lint && npm
  run typecheck && npm test && npm run build"` to package.json.

**Acceptance:**
- `npm audit --production` either clean or fully-documented.
- Coverage threshold tightened.
- All 4 gates still green.

---

### Dispatch 12 — Cut v0.1.0-alpha.1 + verify end-to-end (45 min)
**Scope:**
- `npx changeset version` → bumps to `0.1.0-alpha.1`, updates CHANGELOG.
- Commit with `chore(release): v0.1.0-alpha.1`.
- `git tag -a v0.1.0-alpha.1 -m "..."` (GPG sign if Nico's key is configured;
  otherwise unsigned with a TODO note).
- Push tag → release.yml fires → Docker image built + pushed to GHCR.
- `bash scripts/smoke.sh ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:v0.1.0-alpha.1`
  → expects 9 tools, exit 0.
- Update GitHub Release notes via `gh release create v0.1.0-alpha.1 --notes-file ...`.

**Acceptance:**
- Tag exists, image is pulled and runs, release notes are live.
- A clean checkout + Docker pull + smoke test passes on a different machine (Nico to
  verify on his laptop).
- Repo can be flipped public at this point.

---

## Out of scope for this push (explicit defer list)

| Item | Why deferred |
|---|---|
| Demo Loom video (catalog T162-T163) | Requires Nico to record himself + Claude Desktop. Plan calls for a script in dispatch 10's pitch material; Loom recording is a separate human task |
| Tweet thread + post-send follow-up email (catalog T164-T165) | Marketing surface, not engineering. After-pitch-response activity |
| `mithgard.ai` domain wiring for landing page (`bnb.mithgard.ai` already deployed per HANDOFF) | Already live; no action needed |
| Husky v10 actual migration | Husky v10 not yet GA. Migration *plan* doc lands in dispatch 11 |
| Live `airbnb_listing_details` price fix (PDP doesn't embed per-night price) | Documented honestly via ADR-0008; a "real" fix would require an extra API call to the search endpoint — defer until a user complains |
| OTEL traces full integration (T125-T126) | Scaffolding lands in dispatch 1 (env var parsed; noop init). Full auto-instrument-undici can be a follow-up because no current OSS user has asked for it |
| Migration off the low-level MCP `Server` API to `McpServer` wrapper | MCP-SDK still rolling; revisit at SDK 2.0 |
| `gh secret list` / git history secret scan with `truffleHog` / `gitleaks` | Manual visual scan + a `git log -p \| grep` already done in survey; result clean. Tool-based scan is overkill for an 8-tag repo |
| GPG signing setup beyond a note in release-checklist.md | Per-machine config; depends on Nico's keychain. Defer to him |
| Translation of fixture HTML to a more compact JSON snapshot | Dispatch 8 strips them to ~150 KB which is good enough. Going further is diminishing return |

---

## Pre-flight gates before each dispatch

The dispatcher (or each subagent at the start of its work) MUST verify:

1. `git status` — clean working tree (or only the agent's intended files dirty).
2. `git log -1 --oneline` — confirm previous dispatch landed and is the parent commit.
3. `npm run lint` exit 0
4. `npm run typecheck` exit 0
5. `npm test` exit 0 (note: passes with skipped E2E live tests; that's expected)
6. `npm run build` exit 0
7. Read this plan's relevant Dispatch N section IN FULL before touching files.
8. If anything in steps 1–6 is rot, STOP and surface to the human — do not "fix and
   continue" without explicit instruction. The last dispatch may have left something
   half-done.

After each dispatch, the human reviews the commits before authorising the next.

---

## Final acceptance criteria (the "we're done" checklist)

A reasonable person (Airbnb engineer, OSS contributor, security auditor) can verify
each item in under 60 seconds.

### Code & gates
- [ ] `npm run lint`, `typecheck`, `test`, `build` all exit 0 on a clean clone.
- [ ] Coverage: ≥ 80/55/80/80 (lines/branches/functions/statements).
- [ ] `node dist/index.js --version` → prints package version, exits 0.
- [ ] `node dist/index.js --help` → prints usage, exits 0.
- [ ] User-Agent on any outbound HTTP is `mithgard-bnb-mcp/<ver> (+repo URL)`.
- [ ] No `eslint-disable` in `src/` except `src/server.ts` (MCP-SDK deprecation) and
  `src/lib/json-walker.ts` (walker-internal).
- [ ] `git grep -nE "TODO|FIXME|XXX" -- src/` returns 0 lines.
- [ ] `npm audit --production` either clean or fully documented in `docs/security-notes.md`.

### Community files
- [ ] `LICENSE`, `README.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, `SUPPORT.md` all exist at repo root.
- [ ] `.github/ISSUE_TEMPLATE/{bug,feature,config}.yml`, `PULL_REQUEST_TEMPLATE.md` all
  exist.
- [ ] `.github/workflows/{ci,codeql,release}.yml` all exist and lint clean.

### Docs
- [ ] 8 ADRs under `docs/adr/`.
- [ ] `docs/architecture.md`, `deploy.md`, `limitations.md` exist.
- [ ] `docs/tools/*.md` (9 files) each include input/output/example/edge-cases.
- [ ] `examples/usage.md`, `examples/agent-conversation.md` exist with real transcripts.
- [ ] All 5 pitch docs (`airbnb-cold-email`, `linkedin-dm`, `one-pager`,
  `value-prop-matrix`, `recipient-research`) plus 3 new ones
  (`competitive-landscape`, `security-faq`, `legal-faq`) exist.
- [ ] No stale repo-path references (`16_MITHGARD-BNB-MCP` → `MITHGARD-BNB-MCP`
  everywhere).

### Release
- [ ] `package.json#version` matches latest git tag.
- [ ] `src/server.ts` reports same version in `tools/list`.
- [ ] `scripts/smoke.sh` succeeds against the published GHCR image.
- [ ] `release.yml` ran successfully on the latest tag.
- [ ] GitHub Release notes posted for `v0.1.0-alpha.1`.

### Pitch readiness
- [ ] Cold-email `[Recipient name]` and `[link to repo]` resolved.
- [ ] `recipient-research.md` has ≥ 3 candidate rows in `READY` status.
- [ ] LinkedIn URL in cold-email signature finalised.
- [ ] README Status section reflects current reality (no contradictions vs CHANGELOG).
- [ ] Repo is publicly flippable at the dispatcher's word — no embarrassing line of
  code, no secret-shaped string in history, no placeholder TODOs.

---

## Estimates

- **Total dispatches:** 12
- **Total subagent time:** ~10–11 hours (avg 50 min/dispatch)
- **Human-only follow-up:** ~2 hours (recipient research, LinkedIn URL, Loom record,
  flip repo public)
- **Calendar time for the engineering portion:** 2 focused days with review pauses
  between dispatches, or 4 half-days at a relaxed pace.

---

*End of plan.*
