# Rollback Procedure

If a release is bad, here's how to un-ship it.

## Severity levels

- **Critical** (security issue, data leak, broken for everyone): Immediate rollback.
- **Major** (large fraction of users affected): Rollback within hours.
- **Minor** (edge case): Hotfix in the next patch release.

## Docker rollback (GHCR)

We don't `delete` published image tags (that breaks referential integrity for anyone
who pinned the tag). Instead:

1. **Repoint `latest`** to the previous good version:
   ```bash
   docker pull ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:vX.Y.Z   # the good one
   docker tag  ghcr.io/.../mithgard-bnb-mcp:vX.Y.Z ghcr.io/.../mithgard-bnb-mcp:latest
   docker push ghcr.io/.../mithgard-bnb-mcp:latest
   ```

2. **Publish a `revert` GitHub Release** at the new version explaining the rollback,
   so users see why `latest` moved backward.

## NPM rollback (if/when published)

Until v0.1.0 stable, the package is `private: true` and is not on npm. After it goes
public, the rollback procedure is:

1. `npm deprecate @mithgard/bnb-mcp@X.Y.Z "Critical issue — use X.Y.{Z-1} instead. See SECURITY.md"`
   (Unpublish is harder — npm forbids removing versions older than 72h. `deprecate` is
   the supported pattern.)

## Git rollback (the broken commit)

If a tag points at broken code on `main`:

1. **Do not force-push `main`** — it rewrites history for clones.
2. **Revert the bad commit** on a new commit and re-tag:
   ```bash
   git revert <bad-sha>
   git commit --amend -m "revert: <bad-sha> — <reason>"
   git push origin main
   ```
3. If the tag itself is wrong, delete and re-tag:
   ```bash
   git tag -d vX.Y.Z
   git push origin --delete vX.Y.Z
   git tag -a vX.Y.Z <good-sha>
   git push origin vX.Y.Z
   ```

## Communication

- Update the GitHub Release notes with a `**ROLLED BACK**` notice
- Update `CHANGELOG.md` with a `[Yanked]` marker per Keep-a-Changelog convention
- If the issue was security-sensitive, file a GHSA advisory at
  `/security/advisories/new` describing what, when, severity, affected versions,
  fixed version

## Post-rollback

- Open `docs/post-mortems/YYYY-MM-DD-<topic>.md` documenting:
  - What broke
  - How we caught it (or how a user did)
  - Root cause
  - Fix
  - Prevention (tests added? new gate?)
