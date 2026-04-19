# RESULT.md — Attempt 2

**Outcome**: ✅ SUCCESS
**Duration**: 4m 35s
**Completed**: 2026-04-18T12:10:47.480Z

## Outputs

- `lib/models/**/*.dart` — ✗ missing

## Check Results — ❌ some failed

- ✓ **models-dir-exists**: Model files exist
- ✗ **dart-analysis**: Dart analysis passes on models

## Failed Check Details

### dart-analysis — ❌ FAILED
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
