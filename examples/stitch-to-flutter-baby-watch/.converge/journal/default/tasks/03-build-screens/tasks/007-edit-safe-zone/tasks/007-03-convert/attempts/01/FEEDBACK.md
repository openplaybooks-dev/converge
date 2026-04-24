# FEEDBACK.md — Check Results

**Status**: ❌ 3/4 check(s) failed

- ❌ **screen-exists**
- ❌ **dart-valid**
- ❌ **uses-theme**
- ✅ **no-hardcoded-colors**

## ❌ screen-exists

**Command**: `test -f lib/screens/edit_safe_zone/edit_safe_zone_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: test -f lib/screens/edit_safe_zone/edit_safe_zone_screen.dart
```

## ❌ dart-valid

**Command**: `dart analyze lib/screens/edit_safe_zone/edit_safe_zone_screen.dart`
**Exit code**: 64
**Output**:
```
Directory or file doesn't exist: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```

## ❌ uses-theme

**Command**: `grep -q 'Theme.of(context)' lib/screens/edit_safe_zone/edit_safe_zone_screen.dart`
**Exit code**: 2
**Output**:
```
grep: lib/screens/edit_safe_zone/edit_safe_zone_screen.dart: No such file or directory
```
