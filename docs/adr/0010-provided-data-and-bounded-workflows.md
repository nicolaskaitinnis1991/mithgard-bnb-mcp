# ADR0010: Supplied host data and bounded workflow verification

Status: accepted for the local alpha scope,2026-10-02.

The seven host demos did not implement actual host calculations. Adding an authenticated adapter without an identified provider would invent connectivity. Tools now accept explicit, bounded, tool-specific host_data in provided mode. Shared metadata records caller-asserted timestamp, timezone, currency and completeness; missing facts remain visible. Demo is an explicit synthetic path and never substitutes for invalid provided data.

A deterministic host_workflow tool validates the complete proposed plan before any step, executes at most eight ordered steps with four slots, and validates every sub-result. Dependencies express order, not automatic data transfer. Approval requirements and provenance propagate. Deadline checks use monotonic expiry as well as cancellation timers; timed-out uncooperative work retains its slot until settled. Partial results fit the advertised output schema and set isError. No LLM, dependency, host write or self-modifying maintenance capability was added.

Operations distinguishes local queue/quota overload from upstream failures, retains circuit epochs and observes recent public health separately from local results. Serialized cache and output byte budgets make resource limits inspectable. EOF is tested against actual stdio with active local HTTP.

The acceptance runner invalidates prior results before starting, requires current complete JSON test reports, rejects required skips and source changes, and tests the same immutable container image ID. File/content hashes, syntax-tree function inventory and test-name mappings establish traceability; they do not prove every line correct. Synthetic tests cannot satisfy authenticated-provider, human-host or Base360 integration gates.

Alternatives rejected for this scope: unlabelled fixture fallback; invented partner integration; an unbounded recursive LLM agent; automatic business writes; and a hand-authored green acceptance report. An adapter and optional planner can be added with separate authorization, contracts and evaluations.
