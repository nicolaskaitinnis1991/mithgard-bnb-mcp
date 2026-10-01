# Repository instructions

Read README.md, docs/INDEX.md and docs/readiness-2026-10-01.md before changes. Historical May specifications, audits, pitch drafts and build catalogs are background, not fresh task assignments.

- Use Node 24 and the committed npm lockfile. Add dependencies only with an ADR explaining need and alternatives.
- Keep public reads, synthetic demos and local operational observations explicit. Never claim authenticated integration, human acceptance, production readiness or measured customer savings without evidence.
- Validate bounded input and output with Zod. Preserve MCP initialization, published JSON schemas, structured success content and isError failures.
- Do not log guest messages, names, access details, identifiers or secrets, including debug mode. No personal or financial data persistence.
- Preserve cancellation, deadlines, queue/body limits, Retry-After handling and shutdown cleanup. Test relevant failure and concurrent paths when changing them.
- The operations agent may observe and isolate failures or clear local caches. It may not execute shell commands, rewrite code, send messages, change host accounts or conceal failures.
- Synthetic personas and load tests do not count as human user testing. Never stress external Airbnb services.
- Regenerate the index after edits: npm run docs:index. Run npm run verify and the appropriate container smoke before reporting completion. Record actual results and limitations.
- Use conventional commits and explain changed behavior and verification in PRs. Do not publish a release or send pitch material as a side effect of development.
