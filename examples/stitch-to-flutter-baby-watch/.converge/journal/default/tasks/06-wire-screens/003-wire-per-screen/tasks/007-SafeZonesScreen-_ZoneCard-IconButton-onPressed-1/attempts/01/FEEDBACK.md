# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **handler-wired**

## ❌ handler-wired

**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/safe_zones/safe_zones_screen.dart --id SafeZonesScreen-_ZoneCard-IconButton-onPressed-1 onPressed`
**Exit code**: 1
**Output**:
```
FAIL: marker "// @converge:element SafeZonesScreen-_ZoneCard-IconButton-onPressed-1" not found in lib/screens/safe_zones/safe_zones_screen.dart
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `handler-wired`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
