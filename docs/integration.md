# Integration guide

Connect the built server using standard MCP initialization over stdio, then discover tools and use the published input/output schemas. [scripts/smoke.mjs](../scripts/smoke.mjs) is a working official-SDK client example. A plain tools/list line without initialization is not a complete protocol test.

Public tools read listing pages. They are not a reservations API and do not authenticate a host. The seven demo workflows use synthetic fixtures, including illustrative IDs and metrics. Their current payloads are not a verified partner contract.

To connect a real host provider, implement a separate injected adapter and verify:

1. Provider authorization, scoped access, listing/account ownership and revocation.
2. Identifier mapping, currency, time zones, freshness, nullable fields and provider errors.
3. Cancellation, deadlines, quotas, Retry-After and bounded pagination/body size.
4. Recorded or sandbox contract tests for actual provider responses.
5. Explicit approval, idempotency and audit records before adding any business write.
6. End-to-end tests in the target system and real user acceptance.

Keep demo markers until an authenticated path has been verified. The current project does not send messages, accept or decline bookings, update prices or assign cleaners. Remote HTTP MCP hosting, authentication and durable monitoring would be additional work.

No access to Base360 internal interfaces was provided; employer-specific compatibility has not been checked. Reuse of individual modules is possible only after checking target contracts, dependencies and operational requirements.
