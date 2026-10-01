# Current handoff

Start at [README](../README.md), [acceptance plan](acceptance-plan.md), [file index](INDEX.md) and [function/method index](FUNCTIONS.md). Current scope: eleven tools, Node24, generated MCP contracts, two public readers, seven supplied-data host engines with explicit demo mode, a bounded plan/execute/verify orchestrator and process-local operations.

Run `npm run acceptance` with Docker running. It produces command logs, real test names, source hashes and open external gates under ignored `reports/`. CI uploads this evidence; release verification runs it before publication. Do not hand-edit a pass result.

Data source choices are described in [data sources](data-sources.md). No private Airbnb data was inspected. Authenticated import, provider contracts, Base360 integration, real human acceptance and production supervision remain external gates. No release, account write, outreach or deployment follows implicitly from this work.

May documents and the October1 report are historical snapshots. Current-source claims must be checked against the fresh machine report and commit identity.
