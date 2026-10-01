# operations_status

Read-only process-local diagnostic tool. Input is an empty object; extra fields are rejected.

```json
{}
```

The output contains agent, strategy, status, health_scope, uptime_ms, active_calls, recovery_count, limits, tools and recommendations. Per-tool counters include mode, calls, successes, errors, active, consecutive_failures, last_duration_ms, max_duration_ms, last_error_kind, last_success_at and cooldown_until.

The authoritative output schema is [src/operations/tool.ts](../../src/operations/tool.ts). No guest content is returned or retained. A fresh server reports unverified; synthetic demo calls do not establish live health. See [operations](../operations.md).
