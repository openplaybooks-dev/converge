# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **parent-imports-overlay**
- ❌ **parent-shows-overlay**
- ✅ **dart-valid**

## ❌ parent-imports-overlay

**Command**: `grep -q 'health_log_entry' lib/screens/health_log/health_log_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'health_log_entry' lib/screens/health_log/health_log_screen.dart
```

## ❌ parent-shows-overlay

**Command**: `grep -qE 'showModalBottomSheet|showDialog' lib/screens/health_log/health_log_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -qE 'showModalBottomSheet|showDialog' lib/screens/health_log/health_log_screen.dart
```
