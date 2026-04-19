# FEEDBACK.md — Check Results

**Status**: ❌ 2/3 check(s) failed

- ❌ **parent-imports-overlay**
- ❌ **parent-shows-overlay**
- ✅ **dart-valid**

## ❌ parent-imports-overlay

**Command**: `grep -q 'due_date_picker' lib/screens/settings/settings_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'due_date_picker' lib/screens/settings/settings_screen.dart
```

## ❌ parent-shows-overlay

**Command**: `grep -qE 'showModalBottomSheet|showDialog' lib/screens/settings/settings_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -qE 'showModalBottomSheet|showDialog' lib/screens/settings/settings_screen.dart
```
