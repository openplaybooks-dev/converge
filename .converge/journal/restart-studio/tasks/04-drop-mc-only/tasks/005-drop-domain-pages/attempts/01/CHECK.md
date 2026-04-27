# Checks: 04-drop-mc-only/005-drop-domain-pages

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## catchall-gone
**Description**: The [[...panel]] catch-all is gone
**Command**: `test ! -d 'packages/studio/src/app/[[...panel]]'`

## agent-pages-gone
**Description**: No agent/orgs/users pages
**Command**: `test ! -d packages/studio/src/app/agents && test ! -d packages/studio/src/app/orgs && test ! -d packages/studio/src/app/users`

## marker-written
**Description**: A marker file recording the drop is written
**Command**: `test -f .converge/studio-state/dropped-domain-pages.txt`