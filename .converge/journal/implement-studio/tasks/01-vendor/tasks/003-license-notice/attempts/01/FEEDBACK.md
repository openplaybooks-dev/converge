# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ❌ **upstream-license-preserved**
- ❌ **notice-attribution**
- ✅ **studio-license-mit**
- ✅ **readme-mentions-fork**

## ❌ upstream-license-preserved

**Command**: `test -f packages/converge-studio/LICENSE.upstream && grep -qi 'MIT' packages/converge-studio/LICENSE.upstream`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/LICENSE.upstream && grep -qi 'MIT' packages/converge-studio/LICENSE.upstream
```

## ❌ notice-attribution

**Command**: `test -f packages/converge-studio/NOTICE && grep -qi 'mission-control' packages/converge-studio/NOTICE && grep -qE '[0-9a-f]{7,40}' packages/converge-studio/NOTICE`
**Exit code**: 1
**Output**:
```
Command failed: test -f packages/converge-studio/NOTICE && grep -qi 'mission-control' packages/converge-studio/NOTICE && grep -qE '[0-9a-f]{7,40}' packages/converge-studio/NOTICE
```
