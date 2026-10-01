# Release checklist

A release is separate from a draft PR and requires a deliberate version/tag publication.

- Use Node 24 and a clean checkout of the intended commit.
- Run npm run acceptance, inspect exact command/test/source evidence, and retain reports.
- Verify authenticated external gates separately before claiming a live host release.
- Record which platforms were actually tested; multi-architecture CI configuration is not local runtime evidence.
- Review CHANGELOG, contract changes, demo labels and the dated verification report.
- Select an alpha version while provider integration and human acceptance remain unfinished.
- After an authorized version tag, verify the release workflow, published image digest and initialized MCP smoke.
- Never send historical pitch drafts or publish a stable-readiness claim as an automatic release step.

See [deployment](deploy.md) and [rollback](rollback.md).
