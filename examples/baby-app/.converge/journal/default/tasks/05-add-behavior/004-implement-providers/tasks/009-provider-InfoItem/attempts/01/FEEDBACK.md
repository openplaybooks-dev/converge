# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **file-exists**
- ❌ **dart-valid**

## ❌ file-exists

**Command**: `test -f lib/providers/info_item_provider.dart`
**Exit code**: 1
**Output**:
```
Command failed: test -f lib/providers/info_item_provider.dart
```

## ❌ dart-valid

**Command**: `dart analyze lib/providers/info_item_provider.dart`
**Exit code**: 64
**Output**:
```
Directory or file doesn't exist: lib/providers/info_item_provider.dart

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```
