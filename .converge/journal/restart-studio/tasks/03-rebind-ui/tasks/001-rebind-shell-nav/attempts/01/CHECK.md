# Checks: 03-rebind-ui/001-rebind-shell-nav

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## nav-has-converge-routes
**Description**: nav-rail has /playbooks /runs /settings links
**Command**: `grep -q '/playbooks' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/runs' packages/studio/src/components/layout/nav-rail.tsx && grep -q '/settings' packages/studio/src/components/layout/nav-rail.tsx`

## header-uses-converge-data
**Description**: header-bar references converge events or search
**Command**: `grep -q 'useConvergeEvents\|/api/search\|/api/events' packages/studio/src/components/layout/header-bar.tsx`