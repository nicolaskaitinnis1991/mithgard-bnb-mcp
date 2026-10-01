# operations_status

Read-only process-local diagnostics. Input `{}`; extra fields rejected. Authoritative contract: [operations/tool.ts](../../src/operations/tool.ts).

Output includes agent, strategy, status, health_scope, uptime_ms, active_calls, recovery_count, limits, resources, tools and recommendations. Tool observations include mode, executed counts, latency, fixed error kind, last-success timestamps, recent-public timestamp, cooldown, observed source counts and early-rejection counters. Resource snapshots expose queue/timeouts/quotas and cache entry/serialized-byte budgets.

No guest content is returned or retained. Fresh state is unverified; local/provided/demo success cannot establish public health. A healthy observation becomes unverified after its freshness window. See [operations](../operations.md).
