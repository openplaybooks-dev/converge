# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **handler-wired**

## ❌ handler-wired

**Command**: `grep -q 'context\.\(go\|push\)' lib/screens/weight_nutrition/weight_nutrition_screen.dart && ! grep -PE 'onDestinationSelected:\s*\(.*?\)\s*\{\s*(\/\/[^\n]*)?\s*\}' lib/screens/weight_nutrition/weight_nutrition_screen.dart`
**Exit code**: 1
**Output**:
```
Command failed: grep -q 'context\.\(go\|push\)' lib/screens/weight_nutrition/weight_nutrition_screen.dart && ! grep -PE 'onDestinationSelected:\s*\(.*?\)\s*\{\s*(\/\/[^\n]*)?\s*\}' lib/screens/weight_nutrition/weight_nutrition_screen.dart
```
