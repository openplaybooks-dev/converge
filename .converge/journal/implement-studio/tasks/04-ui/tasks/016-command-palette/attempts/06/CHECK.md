# Checks: 04-ui/016-command-palette

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## palette-component-exists
**Description**: CommandPalette component exists
**Command**: `test -f packages/converge-studio/src/components/command-palette.tsx`

## search-api-exists
**Description**: /api/search returns combined results
**Command**: `test -f packages/converge-studio/src/app/api/search/route.ts`

## palette-mounted-in-layout
**Description**: CommandPalette is mounted in layout.tsx (so Cmd-K works on every page)
**Command**: `grep -q CommandPalette packages/converge-studio/src/app/layout.tsx`

## typecheck-passes
**Description**: typecheck-passes
**Command**: `pnpm --filter @converge/studio typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq`