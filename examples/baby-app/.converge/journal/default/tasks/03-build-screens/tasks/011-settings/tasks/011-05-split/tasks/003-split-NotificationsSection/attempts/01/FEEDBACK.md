# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **widget-exists**
- ❌ **dart-valid**

## ❌ widget-exists

**Command**: `test -f lib/screens/settings/widgets/notifications_section.dart`
**Exit code**: 1
**Output**:
```
Command failed: test -f lib/screens/settings/widgets/notifications_section.dart
```

## ❌ dart-valid

**Command**: `dart analyze lib/screens/settings/widgets/notifications_section.dart`
**Exit code**: 64
**Output**:
```
Directory or file doesn't exist: lib/screens/settings/widgets/notifications_section.dart

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```
