# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **analysis-md-exists**
- ❌ **analysis-has-design-system**
- ❌ **analysis-has-screen-inventory**

## ❌ analysis-md-exists

**Command**: `test -f .stitch/references/ANALYSIS.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .stitch/references/ANALYSIS.md
```

## ❌ analysis-has-design-system

**Command**: `grep -q "## Design System Synthesis" .stitch/references/ANALYSIS.md`
**Exit code**: 2
**Output**:
```
grep: .stitch/references/ANALYSIS.md: No such file or directory
```

## ❌ analysis-has-screen-inventory

**Command**: `grep -q "## Screen Inventory" .stitch/references/ANALYSIS.md`
**Exit code**: 2
**Output**:
```
grep: .stitch/references/ANALYSIS.md: No such file or directory
```
