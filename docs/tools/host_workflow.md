# host_workflow

Bounded read-only tool orchestration inside the MCP application. An agent/client proposes explicit steps; the engine validates, executes and verifies them. There is no built-in LLM planner, self-modifying code, host write or automatic result-to-argument substitution.

Authoritative contracts: [schema](../../src/workflows/schema.ts), [engine](../../src/workflows/engine.ts), [tool](../../src/workflows/tool.ts). [Executable synthetic example](../../examples/host-workflow.json).

## Input

`mode` defaults to `plan`. `steps` contains1–8 unique IDs, known tool names, arguments and optional dependencies on earlier steps. Recursion is excluded. `shared_arguments` projects only schema-declared fields into each step; explicit arguments override them. Unused shared fields fail validation. Each tool's full strict schema is checked before any execution, including all provided data. The input has a256KiB serialized UTF8 limit.

`stop_on_error` defaults true. False permits independent steps to continue while failed dependencies remain skipped. `timeout_ms` is100–60000, default30000. Four simultaneous executions are allowed; a timed-out handler retains its slot until its underlying promise settles, so an uncooperative handler cannot create unbounded later work; plan mode performs no tool calls. Calling `close()` cancels active work and rejects further workflows.

## Output and verification

`plan` contains IDs, tools, dependencies and declared argument-field names, without retaining raw input values. `results` contains completed/failed/skipped/cancelled steps, source, duration and validated outputs. Nested results have a96KiB accumulation budget; the entire MCP envelope also has the registry's256KiB limit.

Verification requires a non-error tool result, valid advertised runtime output contract and matching JSON text. A schema-valid result establishes technical verification; it does not establish business correctness, authenticated source ownership or permission to send/publish. Approval flags propagate to `approval_pending`.

`execution_status`: planned / verified / partial / failed / cancelled. `acceptance_status`: not_executed / technical_verified / approval_pending / not_verified. A partial, failed or internally timed-out execution sets `isError:true` while retaining schema-valid structured progress. Invalid plans and caller-cancelled MCP requests use generic errors without structured progress. Monotonic expiry is checked as well as the timer, so event-loop-blocking late results are rejected. Synchronous JavaScript cannot be preempted; the deadline bounds awaited execution and result acceptance. Deadline cancellation cannot start a later step; a late handler cannot turn it into success.

Sources remain public/provided/demo/local/unknown. Dependencies express execution order only. An insight step does not automatically prove a later booking recommendation.
