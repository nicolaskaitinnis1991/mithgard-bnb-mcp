# Verification report — 2026-10-01 to 2026-10-02

## Scope

Baseline commit: 3e3771894566226c334be344cb5b83406fcb69aa. This pass hardens an alpha portfolio implementation: two public-page readers, seven synthetic host workflows and a new local operations status tool. It does not establish authenticated host integration or human acceptance.

## Problems corrected

- A modern search fixture's €736 stay total was previously exposed as a nightly price. Explicit €147.17/night evidence is now preserved separately, and localized decimals are parsed correctly.
- Public cache keys now distinguish dates and currency. Missing numeric facts and price basis remain explicit rather than pretending unknown values are zero.
- Guest drafts no longer invent Wi-Fi passwords, access arrangements, fees or pet permissions. Recommendations and review drafts require approval; turnover outputs flag impossible time windows.
- Dates and input bounds are strict. Calendar/reference dates are injectable, blocked nights are not credited as recovered revenue, and pricing output is bounded to 30 dates.
- MCP publishes generated input/output contracts, validates structured results, flags failures, supports cancellation and redacts arbitrary strings/dynamic keys in debug summaries.
- HTTP deadlines, queue/body limits, finite retries, per-origin Retry-After and shutdown cleanup bound failures. The local agent isolates repeated observed upstream failures and allows a single recovery probe.
- Node/Vitest and the lockfile are updated. Current documentation, examples and source index replace stale readiness claims; older pitch/specification material is marked historical.

## Verification evidence

Environment: Node 24.19.0, Vitest 5.0.3, macOS arm64; Docker runtime arm64/nonroot. Verification began October 1 and completed October 2 (Europe/Berlin).

| Check | Result |
| --- | --- |
| Clean lockfile install | npm ci completed, 529 packages |
| Combined npm run verify | Passed: lint, strict typecheck, coverage, build, documentation, SDK smoke and synthetic load |
| Automated suite | 187 tests passed across 44 files; 2 live opt-in tests skipped by default |
| Coverage | 93.66% statements, 84.53% branches, 96.96% functions, 96.65% lines, under the declared coverage scope |
| Calendar invariants | 300 seeded horizon/scenario combinations checked within the suite |
| Native synthetic load | 2,000 calls, concurrency 20: 1,500 valid demo results and 500 correctly rejected invalid inputs |
| Container synthetic load | Same 2,000-call workload passed under 256 MB, read-only filesystem, dropped capabilities and no-new-privileges |
| Container SDK smoke | Initialization, ten advertised tools, demo result, operational status and invalid input passed |
| npm audit | Zero known advisories reported across all dependency levels at verification time |
| Documentation index | 57 Markdown documents and 110 source/test files indexed; current local links checked |
| Live public search | Passed one explicit opt-in call with real public results |
| Live public listing | Failed on a 15-second TransportFailed/Timeout; one bounded repeat failed likewise |
| Independent listing HEAD | Also received zero response bytes within 15 seconds |

Live target: public listing 1867179. The failure does not establish its cause or universal availability. The application returned a bounded explicit error; live listing availability is **not verified**. No Airbnb stress test was performed. Both live tests now actually opt in with E2E_LIVE=1 and perform a full MCP handshake.

The local arm64 container image ID at verification was sha256:e14498059953f8203ee2e30660d9970cb1a9c01b4b9ac21c0043036f9a999a03. Local amd64 runtime was not tested; the release workflow is configured to build both architectures. No remote release was published.

## Interpretation and remaining work

Synthetic host scenarios and parallel SDK calls are automated acceptance tests, not a human usability study. Fixture and loopback tests demonstrate code behavior, not constant availability of external Airbnb pages. Coverage excludes declared entrypoint/type/fixture modules and does not prove every line correct.

The internal agent uses local rules and observed calls. It does not guarantee uptime, restart its own process, send alerts to a configured recipient, inspect all code, or autonomously implement fixes.

Before real host deployment, provide authorized provider access, map and verify real contracts, test in the intended target system and collect actual user feedback. Base360 compatibility has not been tested. No employer application, outreach, stable release or production deployment was submitted by this verification pass.
