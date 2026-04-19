# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **widget-exists**
- ❌ **dart-valid**

## ❌ widget-exists

**Command**: `test -f lib/screens/home/widgets/greeting_header.dart`
**Exit code**: 1
**Output**:
```
Command failed: test -f lib/screens/home/widgets/greeting_header.dart
```

## ❌ dart-valid

**Command**: `dart analyze --no-fatal-infos lib/screens/home/widgets/greeting_header.dart`
**Exit code**: 64
**Output**:
```
Cannot negate option "--no-fatal-infos".

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```
