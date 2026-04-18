# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **no-harness-in-config**

## ❌ no-harness-in-config

**Command**: `! grep -ri 'harness' --include='*.json' --include='*.yml' --include='*.yaml' packages/ 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v package-lock | head -1`
**Exit code**: 1
**Output**:
```
Command failed: ! grep -ri 'harness' --include='*.json' --include='*.yml' --include='*.yaml' packages/ 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v package-lock | head -1
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `no-harness-in-config`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
