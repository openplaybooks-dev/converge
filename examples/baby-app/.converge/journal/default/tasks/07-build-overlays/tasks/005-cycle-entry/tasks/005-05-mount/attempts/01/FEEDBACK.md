# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **parent-imports-overlay**
- ❌ **parent-shows-overlay**
- ✅ **dart-valid**

## ❌ parent-imports-overlay

**Command**: `grep -q 'cycle_entry' lib/screens/cycle_tracking/cycle_tracking_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'cycle_entry' lib/screens/cycle_tracking/cycle_tracking_screen.dart
```

## ❌ parent-shows-overlay

**Command**: `grep -qE 'showModalBottomSheet|showDialog' lib/screens/cycle_tracking/cycle_tracking_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -qE 'showModalBottomSheet|showDialog' lib/screens/cycle_tracking/cycle_tracking_screen.dart
```
