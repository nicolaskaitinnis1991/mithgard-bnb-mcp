# Local operations agent

`mithgard-operations` is a rule-based component inside the MCP application. It observes supervised tools and exposes `operations_status`; no LLM key or separate chat is required. `host_workflow` has its own execution budget and routes its substeps through this supervisor.

The initial status is unverified. Healthy requires successful public observations within five minutes for both public tools, with no unresolved failure. Local/provided/demo success never verifies Airbnb. This is observed freshness, not continuous probing or a global uptime guarantee.

Three consecutive upstream failures clear local caches and open the affected public tool's circuit for at least30 seconds. One later caller may probe recovery; concurrent calls fail fast. Circuit epochs stop old successes/failures reopening or closing a newer recovery. RateLimited distinguishes local quota from upstream429; local quota, QueueTimeout, QueueFull, validation and cancellation do not trip the circuit. Busy/circuit/closed/cancelled rejection counts remain visible separately from executed-call counts.

Limits:64 active supervised calls; HTTP total deadline15 seconds, queue64, response2MB, finite retries and per-origin backoff by default. Workflow separately limits four concurrent executions and eight steps, with at most60 seconds. Caches default16MiB each in serialized UTF8 payload/key budget, maximum64MiB; entry count and TTL also have finite caps. `resources` exposes HTTP state/counters/limits and both cache entries/bytes/limits/rejected counts. Serialized-byte budgets are not exact heap/RSS measurements.

EOF, stdin closure, SIGINT, SIGTERM and server closure share idempotent cleanup. Active workflows/HTTP are cancelled, caches cleared, and the complete shutdown has a five-second deadline. The raw-stdio test verifies natural exit after EOF with active local HTTP, without relying on a fallback signal.

The agent retains counters and fixed error kinds, not guest text. It cannot execute commands, edit code, send messages, change accounts, assign staff, restart itself or deliver alerts. An external supervisor/destination must implement those separately. A cooldown indicates containment; actual recovery requires a later successful observation.
