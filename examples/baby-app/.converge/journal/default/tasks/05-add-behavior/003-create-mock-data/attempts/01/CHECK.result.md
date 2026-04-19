# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 6m 57s
**Completed**: 2026-04-18T12:17:44.600Z

## Outputs

- `lib/data/mock_data.dart` — ✓ produced (21.9 KB)

## Check Results — ❌ some failed

- ✓ **file-exists**: Mock data file exists
- ✓ **file-size**: File is >200 lines
- ✗ **dart-analysis**: Dart analysis passes

## Failed Check Details

### dart-analysis — ❌ FAILED
**Command**: `dart analyze --no-fatal-infos lib/data/mock_data.dart`
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
