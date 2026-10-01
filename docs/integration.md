# Integration guide

Initialize the stdio MCP connection, discover tools, then use the advertised schemas. Discovery enables official-SDK output validation. [Smoke client](../scripts/smoke.mjs) and [mixed load client](../tests/stress/virtual-users.test.ts) demonstrate the complete handshake.

Seven host engines accept explicit, tool-specific supplied data. Start with [the synthetic example](../examples/host-workflow.json): `host_workflow` in plan mode validates the entire request without running tools; execute mode returns verified outputs, provenance and pending approvals. Dependencies order steps but do not inject previous results. An external agent may prepare another explicit call using the reviewed outputs.

Host tools still support labelled demos. Supplying data without `mode:"provided"`, or choosing provided mode without data, fails rather than falling back. `complete` and source timestamps are caller assertions; this path does not authenticate an Airbnb account. Public readers consume pages and cannot establish reservations, messaging or listing ownership.

A real provider adapter must verify authorization/revocation, ownership, field mapping, currency/timezone/freshness, nullability, bounded pagination/body sizes, quotas, cancellation, provider error contracts and recorded/sandbox responses. Business writes require separate permissions, approvals, idempotency and audit records. See [data sources](data-sources.md).

Base360 internals have not been provided or tested. Reuse requires checking target contracts and deployment conditions. Remote HTTP MCP hosting, authentication, durable state and external monitoring are additional components. The local agent does not restart the process; it limits observed failures and exposes their state.
