# Limitations and maturity

This is an alpha portfolio project. Two tools read public Airbnb pages, seven host workflow tools use deterministic synthetic fixtures, and a local agent reports process observations. No authenticated Partner API, real booking data or host write is implemented.

Public HTML can change, return a challenge, be blocked or omit requested facts. Parser fixture success does not establish current live availability. Missing facts remain null; unsupported shapes return a tool error. Cached observations may be stale within the configured TTL.

Demo prices, occupancy, revenue and triage scores are illustrative, not calibrated financial recommendations or measured customer results. Guest and review outputs are drafts. Missing context must be checked. Turnover planning checks basic time windows, not staffing availability or travel time.

The operations agent can contain repeated observed failures, clear local caches and permit a recovery probe. It cannot guarantee availability, restart a crashed process, diagnose every cause, deploy fixes or replace an external supervisor. Its healthy status applies only to calls observed during this process lifetime.

Automated personas and 2,000-call synthetic tests cover software scenarios and bounded concurrency. They are not human acceptance, an internet-scale benchmark or Airbnb load testing. Authentication, a real provider adapter, target integration tests and actual user feedback remain required for real host deployment.

See [the dated verification report](readiness-2026-10-01.md) for checked evidence. Older specifications, audits, pitch material and build plans are historical references.
