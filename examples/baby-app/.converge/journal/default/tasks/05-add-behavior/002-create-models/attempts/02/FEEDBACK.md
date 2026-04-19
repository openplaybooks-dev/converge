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
