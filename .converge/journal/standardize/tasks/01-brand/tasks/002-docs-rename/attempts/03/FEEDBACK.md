# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **no-harness-in-md**

## ❌ no-harness-in-md

**Command**: `! grep -ri 'harness' --include='*.md' packages/ docs/ README.md CONTRIBUTING.md 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify | head -1`
**Exit code**: 1
**Output**:
```
Command failed: ! grep -ri 'harness' --include='*.md' packages/ docs/ README.md CONTRIBUTING.md 2>/dev/null | grep -v node_modules | grep -v CHANGELOG | grep -v '.converge/' | grep -v auto-verify | head -1
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `no-harness-in-md`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
