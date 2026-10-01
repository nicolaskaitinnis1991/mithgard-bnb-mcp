# Local operations agent

The built-in mithgard-operations agent is a rule-based component inside the MCP application. It needs no LLM key, cloud service or separate Codex chat. It observes workflow calls and exposes its state through operations_status.

It tracks counts, active calls, latency, fixed error kinds and the last successful observation. The initial status is unverified. Demo success cannot prove public availability. Healthy means both public tools have succeeded in this process and neither has recorded an unresolved upstream failure; it is not continuous external monitoring.

After three consecutive upstream failures, it clears local caches and pauses the affected public tool for at least 30 seconds. A later call may run one recovery probe; concurrent calls fail fast while that probe runs. Caller validation failures, local queue limits and cancellation do not trip the circuit. A default limit of 64 active supervised calls bounds work.

Recovery is limited to local cache clearing, circuit isolation and a later observed probe. No automatic Airbnb traffic is generated. SIGINT, SIGTERM and transport closure trigger cancellation and HTTP/cache cleanup. An external service manager is required to restart a crashed process.

The agent does not execute commands, edit code, send guest messages, alter bookings or prices, contact staff or make business decisions. There is no configured alert recipient or LLM diagnostic planner. Such features need their own scoped implementation and tests.

Use the documented error kind to distinguish invalid input, upstream HTTP changes, parser failures, Retry-After and local overload. A cooldown is protection, not evidence that a failure was repaired. See [limitations](limitations.md).
