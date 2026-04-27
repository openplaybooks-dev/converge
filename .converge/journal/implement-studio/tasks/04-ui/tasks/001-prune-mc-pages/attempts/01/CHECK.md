# Checks: 04-ui/001-prune-mc-pages

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## agent-pages-removed
**Description**: Agent registry pages removed
**Command**: `test -z "$(find packages/converge-studio/src/app -type d \( -iname 'agents' -o -iname 'agent-registry' \) 2>/dev/null)"`

## settings-pruned
**Description**: RBAC/multi-tenant settings pages removed
**Command**: `test -z "$(find packages/converge-studio/src/app -type d \( -iname 'orgs' -o -iname 'users' -o -iname 'rbac' \) 2>/dev/null)"`

## build-or-typecheck-passes
**Description**: Studio still typechecks after deletions
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`