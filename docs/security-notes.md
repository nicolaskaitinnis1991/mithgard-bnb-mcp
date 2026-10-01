# Security notes

Inputs are strictly validated and bounded. Public requests have queue, body, retry and deadline limits. MCP successes are output-validated; failures do not contain raw thrown exceptions or success-shaped structured content.

Logs use stderr. Normal telemetry stores fixed metadata; debug mode additionally emits redacted structural summaries. Arbitrary guest strings, free-form messages, access information and dynamic keys are not intentionally logged. The operations agent stores counters and fixed error kinds. Cache data is in-memory public listing data; no guest database is implemented.

All tools are annotated read-only. Host demos never send messages or change reservations, prices or schedules. Public-page fetching uses a self-identifying user agent and bounded quotas. Synthetic stress tests run locally and do not bombard Airbnb.

The container runs non-root and can be started read-only with dropped capabilities. These controls do not prove that every dependency or deployment is secure. npm audit results are dated evidence; rerun them after dependency changes. Refer to [the verification report](readiness-2026-10-01.md).

Report reproducible security issues through the repository's documented [security policy](../SECURITY.md). Do not include personal data or secrets in public issues.
