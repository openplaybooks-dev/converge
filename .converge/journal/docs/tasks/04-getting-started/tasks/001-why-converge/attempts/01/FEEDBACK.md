# FEEDBACK.md — Check Results

**Status**: ❌ 3/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-has-frontmatter**
- ❌ **page-has-define-done**
- ✅ **page-not-too-long**
- ✅ **page-not-too-short**

## ❌ page-exists

**Command**: `test -f docs/getting-started/why-converge.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/getting-started/why-converge.md
```

## ❌ page-has-frontmatter

**Command**: `head -10 docs/getting-started/why-converge.md | grep -q '^title:' && head -10 docs/getting-started/why-converge.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/getting-started/why-converge.md: No such file or directory
```

## ❌ page-has-define-done

**Command**: `grep -q 'define done' docs/getting-started/why-converge.md || grep -q 'Define done' docs/getting-started/why-converge.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/why-converge.md: No such file or directory
grep: docs/getting-started/why-converge.md: No such file or directory
```
