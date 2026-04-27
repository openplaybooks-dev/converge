# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **link-check**

## ❌ link-check

**Command**: `test -d apps/landing/dist && (pnpm --filter @converge/landing exec lychee --no-progress --offline ./dist 2>&1 || pnpm --filter @converge/landing exec linkinator ./dist --recurse --silent 2>&1)`
**Exit code**: 254
**Output**:
```
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.
undefined
/Users/minh/Documents/converge/apps/landing:
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "lychee" not found
packages/studio                          |  WARN  The field "pnpm.onlyBuiltDependencies" was found in /Users/minh/Documents/converge/packages/studio/package.json. This will not take effect. You should configure "pnpm.onlyBuiltDependencies" at the root of the workspace instead.
undefined
/Users/minh/Documents/converge/apps/landing:
 ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "linkinator" not found

Did you mean "pnpm exec envinfo"?
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `link-check`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
