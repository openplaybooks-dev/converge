# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **no-mission-control-in-messages**
- ❌ **marker-written**

## ❌ no-mission-control-in-messages

**Command**: `test -z "$(grep -ril 'mission control' packages/studio/messages 2>/dev/null)"`
**Exit code**: 1
**Output**:
```
Command failed: test -z "$(grep -ril 'mission control' packages/studio/messages 2>/dev/null)"
```

## ❌ marker-written

**Command**: `test -f .converge/studio-state/stripped-mc-strings.txt`
**Exit code**: 1
**Output**:
```
Command failed: test -f .converge/studio-state/stripped-mc-strings.txt
```
