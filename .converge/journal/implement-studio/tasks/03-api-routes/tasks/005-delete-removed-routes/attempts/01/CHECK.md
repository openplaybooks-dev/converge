# Checks: 03-api-routes/005-delete-removed-routes

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## agents-removed
**Description**: /api/agents routes removed
**Command**: `! test -d packages/converge-studio/src/app/api/agents`

## auth-removed
**Description**: /api/auth routes removed (no NextAuth in MVP)
**Command**: `! test -d packages/converge-studio/src/app/api/auth`

## framework-adapters-removed
**Description**: Framework adapter API routes removed
**Command**: `test -z "$(find packages/converge-studio/src/app/api -type d \( -iname 'openclaw' -o -iname 'crewai' -o -iname 'langgraph' -o -iname 'autogen' \) 2>/dev/null)"`

## build-still-passes
**Description**: Studio still builds after deletions
**Command**: `pnpm --filter @converge/studio build 2>&1 | tail -10 | grep -qE 'Compiled|build successful|Generating' || pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`