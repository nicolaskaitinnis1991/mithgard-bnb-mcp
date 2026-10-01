# Rollback

Record the affected commit/version, symptoms and the previously verified version. Keep published version tags immutable; prefer a new revert/hotfix commit and version. Do not rewrite main history or silently replace a versioned image.

For a local client, point the configuration back to a verified build or pinned container digest, then run the initialized MCP smoke. Reverting code does not restore any real provider data; this project currently has no host-write integration.

Published image aliases, releases and external announcements require a deliberate release operation. Explain a withdrawn version in CHANGELOG/release notes. Document the failure, reproduction, fix and regression test before publishing a replacement.
