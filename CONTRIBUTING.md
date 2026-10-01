# Contributing

Read [AGENTS.md](AGENTS.md), [README](README.md) and [the index](docs/INDEX.md). Use Node 24 and the committed lockfile.

```sh
npm ci
npm run dev
npm run docs:index
npm run verify
```

New tools use Zod input/output schemas, a Result-returning handler and createTool registration. See [search](src/tools/search) and [host insights](src/tools/host-insights). Tests belong in tests/unit, tests/integration or tests/e2e; bounded synthetic load tests have a separate configuration in tests/stress. Public network tests must be explicit opt-in, never retries that hide failures.

Keep public readers, synthetic demos and local status distinct. Guest drafts and business recommendations require review. New provider integration requires an authenticated adapter and real contract tests; public scraping is not a host-account API.

Add an ADR for a new dependency, changed protocol/contract or architectural pattern. Regenerate the inventory, run all verification gates and report measured results and limitations in the PR. Global coverage floors are 80% statements/lines/functions and 55% branches; exclusions are declared in vitest.config.ts. Coverage does not prove every line correct.

Use Conventional Commits. Pre-commit runs lint-staged and typecheck; CI runs the full verification suite and dependency audit. A passing local hook is not a substitute for CI. Keep each PR scoped to a coherent outcome.

See [the code of conduct](CODE_OF_CONDUCT.md), [security policy](SECURITY.md) and [MIT license](LICENSE).
