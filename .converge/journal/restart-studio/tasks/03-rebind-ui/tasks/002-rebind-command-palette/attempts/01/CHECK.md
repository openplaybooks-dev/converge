# Checks: 03-rebind-ui/002-rebind-command-palette

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## palette-uses-search-api
**Description**: Palette fetches /api/search
**Command**: `test -f packages/studio/src/components/command-palette.tsx && grep -q '/api/search' packages/studio/src/components/command-palette.tsx`