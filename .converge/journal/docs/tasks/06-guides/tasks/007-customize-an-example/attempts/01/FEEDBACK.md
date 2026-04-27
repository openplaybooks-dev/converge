# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **lists-edit-targets**
- ❌ **links-back-to-gallery**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/customize-an-example.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/customize-an-example.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/customize-an-example.md | grep -q '^title:' && head -10 docs/guides/customize-an-example.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/customize-an-example.md: No such file or directory
```

## ❌ lists-edit-targets

**Command**: `grep -qiE 'playbook\.yml|TASK\.md|input file|topic|idea\.md' docs/guides/customize-an-example.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/customize-an-example.md: No such file or directory
```

## ❌ links-back-to-gallery

**Command**: `grep -qE '\(/examples/|\(\.\./examples/' docs/guides/customize-an-example.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/customize-an-example.md: No such file or directory
```
