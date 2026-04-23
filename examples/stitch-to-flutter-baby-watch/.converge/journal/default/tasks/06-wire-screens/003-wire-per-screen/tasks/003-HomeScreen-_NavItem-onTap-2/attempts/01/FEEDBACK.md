# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **handler-wired**

## ❌ handler-wired

**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/003-wire-per-screen/wbs/check-handler.mjs lib/screens/home/home_screen.dart --id HomeScreen-_NavItem-onTap-2 onTap`
**Exit code**: 1
**Output**:
```
FAIL: marker "// @converge:element HomeScreen-_NavItem-onTap-2" not found in lib/screens/home/home_screen.dart
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `handler-wired`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
