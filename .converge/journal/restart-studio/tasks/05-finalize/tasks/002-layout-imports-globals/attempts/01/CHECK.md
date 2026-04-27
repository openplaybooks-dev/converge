# Checks: 05-finalize/002-layout-imports-globals

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## layout-imports-css
**Description**: layout.tsx imports globals.css
**Command**: `grep -q 'globals.css' packages/studio/src/app/layout.tsx`