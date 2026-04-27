# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **links-into-examples**
- ❌ **links-into-guides**
- ❌ **links-into-reference**
- ✅ **short**

## ❌ page-exists

**Command**: `test -f docs/getting-started/next-steps.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/getting-started/next-steps.md
```

## ❌ links-into-examples

**Command**: `grep -qE '\(/examples/|\(\.\./examples/' docs/getting-started/next-steps.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/next-steps.md: No such file or directory
```

## ❌ links-into-guides

**Command**: `grep -qE '\(/guides/|\(\.\./guides/' docs/getting-started/next-steps.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/next-steps.md: No such file or directory
```

## ❌ links-into-reference

**Command**: `grep -qE '\(/reference/|\(\.\./reference/' docs/getting-started/next-steps.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/next-steps.md: No such file or directory
```
