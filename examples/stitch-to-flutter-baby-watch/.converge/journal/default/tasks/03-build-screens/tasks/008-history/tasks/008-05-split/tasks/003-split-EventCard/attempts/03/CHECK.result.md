# RESULT.md — Attempt 3

**Outcome**: ❌ FAILED
**Duration**: 4m 58s
**Completed**: 2026-04-21T16:49:18.300Z

## Outputs

- `lib/widgets/event_card.dart` — ✗ missing

## Check Results — ❌ some failed

- ✗ **widget-exists**: Widget file exists
- ✗ **dart-valid**: Dart analysis passes

## Failed Check Details

### widget-exists — ❌ FAILED
**Command**: `test -f lib/widgets/event_card.dart`
**Exit code**: 1
**Output**: *(none)*

### dart-valid — ❌ FAILED
**Command**: `dart analyze lib/widgets/event_card.dart`
**Exit code**: 64
**Output**:
```
Directory or file doesn't exist: lib/widgets/event_card.dart

Usage: dart analyze [arguments] [<directory>]
-h, --help                   Print this usage information.
    --fatal-infos            Treat info level issues as fatal.
    --[no-]fatal-warnings    Treat warning level issues as fatal.
                             (defaults to on)

Run "dart help" to see global options.
```
