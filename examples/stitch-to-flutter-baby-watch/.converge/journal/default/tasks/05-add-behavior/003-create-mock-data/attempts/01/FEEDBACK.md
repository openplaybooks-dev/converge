# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **file-exists**
- ❌ **file-size**
- ❌ **dart-analysis**

## ❌ file-exists

**Command**: `test -f lib/data/mock_data.dart`
**Exit code**: 1
**Output**:
```
Command failed: test -f lib/data/mock_data.dart
```

## ❌ file-size

**Command**: `test $(wc -l < lib/data/mock_data.dart) -gt 200`
**Exit code**: 2
**Output**:
```
/bin/bash: lib/data/mock_data.dart: No such file or directory
/bin/bash: line 0: test: -gt: unary operator expected
```

## ❌ dart-analysis

**Command**: `dart analyze lib/data/mock_data.dart`
**Exit code**: 64
**Output**:
```
Directory or file doesn't exist: lib/data/mock_data.dart

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```
