# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **models-dir-exists**
- ❌ **dart-analysis**

## ❌ models-dir-exists

**Command**: `find lib/models -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'`
**Exit code**: 1
**Output**:
```
Command failed: find lib/models -name '*.dart' -type f | wc -l | awk '{if ($1 > 0) exit 0; exit 1}'
```

## ❌ dart-analysis

**Command**: `dart analyze --no-fatal-infos lib/models/`
**Exit code**: 127
**Output**:
```
/bin/bash: dart: command not found
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `dart-analysis`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
