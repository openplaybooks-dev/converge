# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ✅ **screen-exists**
- ✅ **dart-valid**
- ❌ **uses-theme**
- ❌ **no-hardcoded-colors**

## ❌ uses-theme

**Command**: `grep -q 'Theme.of(context)' lib/screens/guardians/guardians_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'Theme.of(context)' lib/screens/guardians/guardians_screen.dart
```

## ❌ no-hardcoded-colors

**Command**: `! grep -qE 'Color\(0x|Colors\.' lib/screens/guardians/guardians_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: ! grep -qE 'Color\(0x|Colors\.' lib/screens/guardians/guardians_screen.dart
```

> **BROKEN COMMAND** — The check command itself cannot run.
> This is NOT a code problem. Fix the `cmd` in the source TASK.md
> (in `.converge/epics/`). Look for the check with id `no-hardcoded-colors`.
> Replace absolute/platform-specific paths with portable commands.
> Example: `grep -q "pattern" "file.tsx"`
