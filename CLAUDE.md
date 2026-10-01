# Current engineering context

Follow [AGENTS.md](AGENTS.md). This repository runs on Node 24 with stdio MCP. There are two public-page readers, seven synthetic host workflow demos, and one local operations status tool.

The current contract is implemented by Zod schemas and published through src/tools/registry.ts. The old May spec and 180-task catalog describe the original scaffold and are retained as historical references. They do not establish current production readiness.

Use npm ci, npm run docs:index and npm run verify. Keep demo markers and approval requirements. A Partner API, live business actions, remote authentication, human acceptance and measured business impact remain outside the implemented scope.
