# Husky v10 Migration Plan

## Status

Husky v10 is **not yet GA** (as of 2026-05-04). Husky v9 prints a deprecation
warning on every hook run reminding us that the legacy shebang + sourcing lines
will fail in v10:

```
husky - DEPRECATED
Please remove the following two lines from .husky/pre-commit:
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
They WILL FAIL in v10.0.0
```

When v10 ships, this repo needs the two small changes below.

## What changes

The legacy two-line preamble must be removed from each hook file:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

(These were required by Husky v8 + v9; v10 invokes hooks directly without a
sourced helper.)

## Files to update

- `.husky/pre-commit` (currently runs `npx lint-staged` + `npm run typecheck`)
- `.husky/commit-msg` (currently runs `npx --no -- commitlint --edit "$1"`)

## When to migrate

When `npm install` resolves Husky to v10 in `package-lock.json` (likely via a
Dependabot PR). At that point:

1. Edit both `.husky/*` files: delete the first two lines (shebang + sourcing).
   The remaining command lines stay unchanged.
2. Verify hooks still work: stage a small change and run `git commit -m "test: smoke"`.
   Expect `lint-staged` + `typecheck` + `commitlint` to fire as before.
3. If hooks fail with "command not found" or similar, the new format may differ.
   Consult the Husky v10 release notes — the migration may require
   `husky init` to regenerate the hooks in the new format.
4. Re-run `npm test` to confirm nothing else regressed.

## Why we don't pre-migrate

Removing those two lines on Husky v9 **may break the hooks** — the sourcing line
is still required on v9 to wire up the helper. The shape of v10's API is also
not final. Better to migrate when v10 is GA and the migration is reversible
under a single dependabot bump commit.

## Verify after migration

```bash
.husky/pre-commit                  # should run lint-staged + typecheck and exit 0
git commit -m "test: smoke"        # commit-msg hook should validate conventional format
git commit -m "totally invalid"    # commit-msg hook should REJECT (exit non-zero)
```

If all three behave correctly, migration is complete.

## Cleanup

After the migration commits, delete this file (`docs/dev-husky-v10.md`) — its job
is done. Reference the migration commit in `CHANGELOG.md` under the
`### Changed` heading.
