# Checks: 01-vendor/001-clone-prune

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## studio-dir-exists
**Description**: Studio package directory exists with Next.js app/ tree
**Command**: `test -d packages/converge-studio/src/app && test -f packages/converge-studio/next.config.mjs -o -f packages/converge-studio/next.config.js`

## prisma-removed
**Description**: No Prisma directory or @prisma deps
**Command**: `! test -d packages/converge-studio/prisma && test -z "$(grep -l '@prisma' packages/converge-studio/package.json 2>/dev/null)"`

## adapters-removed
**Description**: Framework-specific adapter dirs removed (openclaw/crewai/langgraph/autogen)
**Command**: `test -z "$(find packages/converge-studio/src -type d \( -iname 'openclaw' -o -iname 'crewai' -o -iname 'langgraph' -o -iname 'autogen' \) 2>/dev/null)"`

## upstream-sha-pinned
**Description**: UPSTREAM_SHA file records the upstream commit
**Command**: `test -s packages/converge-studio/UPSTREAM_SHA && grep -qE '^[0-9a-f]{7,40}' packages/converge-studio/UPSTREAM_SHA`