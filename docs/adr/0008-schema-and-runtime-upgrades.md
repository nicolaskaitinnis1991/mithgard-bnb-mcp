# Schema and runtime upgrades

The October 2026 readiness review found drift between handwritten MCP input
schemas and Zod validators, and reported critical advisories in the old test
dependency tree.

Use zod-to-json-schema 3.25.2 as an explicit runtime dependency to derive MCP
contracts from the same Zod schemas used for validation. Keeping the installed
Zod 3 interface avoids a simultaneous validator migration. Runtime outputs are
also validated; tool errors use MCP isError rather than pretending to be success.

Use Node 24 LTS for development, CI and containers, with Vitest and coverage-v8
5.0.3 pinned together. Update the lockfile and test the migrated suite. Do not
equate a clean dependency audit with proof that software is secure.

Alternatives considered were maintaining duplicate schemas and keeping the
vulnerable test runner. Neither provides a reliable integration contract.
