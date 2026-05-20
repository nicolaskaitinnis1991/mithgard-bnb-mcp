# Release Checklist

Run through this before tagging a release.

## Pre-flight (all must be ✅)

- [ ] `git status` clean on `main`
- [ ] `npm run lint` exit 0
- [ ] `npm run typecheck` exit 0
- [ ] `npm test` exit 0
- [ ] `npm run build` exit 0
- [ ] `bash scripts/smoke.sh` passes against local build
- [ ] `CHANGELOG.md` has an `[Unreleased]` section with actual changes (not empty)
- [ ] No `TODO|FIXME|XXX` markers in `src/` (run `git grep -nE "TODO|FIXME|XXX" src/`)
- [ ] No new `eslint-disable` without inline justification
- [ ] All open dependabot PRs reviewed (merge safe ones, defer breaking ones)

## Cut release

- [ ] Decide version: SemVer (`MAJOR.MINOR.PATCH[-prerelease]`)
- [ ] Run `npx changeset version` (rewrites CHANGELOG + bumps `package.json#version`)
- [ ] Verify `package.json#version` and `CHANGELOG.md` look right
- [ ] Commit: `chore(release): vX.Y.Z`
- [ ] Tag: `git tag -a vX.Y.Z -m "vX.Y.Z"` (sign with `-s` if GPG configured)
- [ ] Push: `git push origin main --follow-tags`

## Verify the release

- [ ] GitHub Actions `release.yml` workflow runs and succeeds (all 3 jobs green)
- [ ] Docker image visible at `ghcr.io/nicolaskaitinnis1991/mithgard-bnb-mcp:vX.Y.Z`
- [ ] `docker pull ghcr.io/.../mithgard-bnb-mcp:vX.Y.Z` works
- [ ] `bash scripts/smoke.sh ghcr.io/.../mithgard-bnb-mcp:vX.Y.Z` passes
- [ ] GitHub Release published (visible at `/releases/tag/vX.Y.Z`)
- [ ] Release notes are sensible (not empty, not gibberish)

## Post-release

- [ ] If pre-release (alpha/beta/rc): no further action; users opt in by tag
- [ ] If stable: announce per `docs/pitch/recipient-research.md` cadence
- [ ] Open `[Unreleased]` section in CHANGELOG for the next development cycle
