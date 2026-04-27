# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **links-to-getting-started**
- ❌ **links-to-examples**
- ❌ **links-to-troubleshooting**
- ✅ **short**

## ❌ page-exists

**Command**: `test -f docs/index.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/index.md
```

## ❌ links-to-getting-started

**Command**: `grep -qE 'getting-started/' docs/index.md`
**Exit code**: 2
**Output**:
```
grep: docs/index.md: No such file or directory
```

## ❌ links-to-examples

**Command**: `grep -qE 'examples/' docs/index.md`
**Exit code**: 2
**Output**:
```
grep: docs/index.md: No such file or directory
```

## ❌ links-to-troubleshooting

**Command**: `grep -qE 'troubleshooting/' docs/index.md`
**Exit code**: 2
**Output**:
```
grep: docs/index.md: No such file or directory
```
