# RESULT.md — Attempt 1

**Outcome**: ❌ FAILED
**Duration**: 4m 15s
**Completed**: 2026-04-19T01:06:19.349Z

## Check Results — ❌ some failed

- ✗ **handler-wired**: ElevatedButton.onPressed has real logic at lib/screens/home/home_screen.dart:105

## Failed Check Details

### handler-wired — ❌ FAILED
**Command**: `node .converge/playbooks/default/tasks/06-wire-screens/check-handler.mjs lib/screens/home/home_screen.dart 105 onPressed`
**Exit code**: 1
**Output**:
```
FAIL: onPressed expected near line 105 but found elsewhere in lib/screens/home/home_screen.dart
```
