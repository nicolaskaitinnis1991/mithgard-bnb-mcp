# Run and verify

Use Node 24, npm ci and npm run build. The server runs over stdio using node dist/index.js. Point the MCP client's command at Node 24 and its arguments at the absolute built file path. Keep stdout reserved for protocol traffic.

Environment defaults and supported overrides are in [.env.example](../.env.example) and [src/config/env.ts](../src/config/env.ts). All caches and operational counters are in memory and reset when the process restarts. No LLM/API key is needed for synthetic demos. No OTEL exporter is implemented.

Run npm run verify before packaging. Build Docker with docker build -t mithgard-bnb-mcp:local . and use node scripts/smoke.mjs --docker mithgard-bnb-mcp:local for the initialized MCP container test. The runtime is distroless Node 24, non-root, with no HTTP port.

The release workflow builds amd64/arm64 images when a version tag is deliberately pushed. A local verification or draft PR does not publish a release. No deployment to a host-account system is configured.

SIGINT, SIGTERM and transport closure cancel in-flight HTTP work and clear local state. A production process manager, real provider permissions, external monitoring and human acceptance are additional deployment requirements. See [limitations](limitations.md) and [operations](operations.md).
