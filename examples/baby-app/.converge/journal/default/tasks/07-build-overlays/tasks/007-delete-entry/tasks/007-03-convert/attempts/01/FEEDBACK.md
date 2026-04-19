# FEEDBACK.md — Check Results

**Status**: ❌ 3/5 check(s) failed

- ❌ **widget-exists**
- ❌ **dart-valid**
- ❌ **uses-theme**
- ✅ **no-hardcoded-colors**
- ✅ **no-router-registration**

## ❌ widget-exists

**Command**: `test -f lib/widgets/overlays/delete_entry/delete_entry.dart`
**Exit code**: 1
**Output**:
```
Command failed: test -f lib/widgets/overlays/delete_entry/delete_entry.dart
```

## ❌ dart-valid

**Command**: `dart analyze lib/widgets/overlays/delete_entry/delete_entry.dart`
**Exit code**: 64
**Output**:
```
Directory or file doesn't exist: lib/widgets/overlays/delete_entry/delete_entry.dart

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```

## ❌ uses-theme

**Command**: `grep -q 'Theme.of(context)' lib/widgets/overlays/delete_entry/delete_entry.dart`
**Exit code**: 2
**Output**:
```
grep: lib/widgets/overlays/delete_entry/delete_entry.dart: No such file or directory
```
