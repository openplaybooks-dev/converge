# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **upstream-license-preserved**
- ❌ **notice-attribution**

## ❌ upstream-license-preserved

**Command**: `test -f packages/studio/LICENSE.upstream && grep -qi 'MIT' packages/studio/LICENSE.upstream`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/LICENSE.upstream && grep -qi 'MIT' packages/studio/LICENSE.upstream
```

## ❌ notice-attribution

**Command**: `test -f packages/studio/NOTICE && grep -qi 'mission-control' packages/studio/NOTICE && grep -q 'a020d1b7' packages/studio/NOTICE`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/studio/NOTICE && grep -qi 'mission-control' packages/studio/NOTICE && grep -q 'a020d1b7' packages/studio/NOTICE
```
