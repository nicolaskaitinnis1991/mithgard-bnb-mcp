# 0009. Bounded local supervision and explicit MCP contracts

Date: 2026-10-01
Status: accepted

## Context

The original server exposed shallow JSON schemas, did not flag all tool failures correctly, and had unbounded HTTP waits. Public HTML, synthetic host workflows and genuine account integration were easy to confuse. The application also needed a responsible component for operational observations.

## Decision

Generate advertised schemas from the same Zod definitions used at runtime, validate successful output, return structured success content and explicit isError text failures, and forward MCP cancellation. Harden public transport with finite queue/body/retry/deadline budgets and per-origin Retry-After handling.

Add a deterministic in-process operations supervisor. It retains fixed counters and error kinds, limits concurrency, clears local caches after repeated observed upstream failures, isolates the failing public tool and admits a single later recovery probe. A status tool exposes those observations. No LLM dependency, shell access, autonomous code editing or host write is introduced.

Virtual personas are executable adversarial scenarios and bounded SDK call workloads. MiroFish's broader scenario simulation would add services and data handling without replacing the necessary MCP contract and transport tests; it is not added to the runtime.

## Consequences

There are now ten tools. Public missing values can be null, prices distinguish total/night/unknown, and demo decisions require review. Those are alpha contract changes. Node 24 is required. Integration still needs a verified provider adapter; continuous uptime still needs an external supervisor; synthetic testing still needs later human acceptance.
