# FEEDBACK.md — Check Results

**Status**: ❌ 2/2 check(s) failed

- ❌ **adr-dir-exists**
- ❌ **adr-index-exists**

## ❌ adr-dir-exists

**Command**: `test -d docs/adr`
**Exit code**: 1
**Output**:
```
Command failed: test -d docs/adr
```

## ❌ adr-index-exists

**Command**: `test -f docs/adr/README.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/adr/README.md
```
