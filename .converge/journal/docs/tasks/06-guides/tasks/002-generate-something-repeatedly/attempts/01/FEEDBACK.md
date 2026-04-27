# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **anchored-on-real-example**
- ❌ **shows-wbs-or-template-pattern**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/generate-something-repeatedly.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/generate-something-repeatedly.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/generate-something-repeatedly.md | grep -q '^title:' && head -10 docs/guides/generate-something-repeatedly.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/generate-something-repeatedly.md: No such file or directory
```

## ❌ anchored-on-real-example

**Command**: `grep -qE 'data-pipeline|cinematic-video-production' docs/guides/generate-something-repeatedly.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/generate-something-repeatedly.md: No such file or directory
```

## ❌ shows-wbs-or-template-pattern

**Command**: `grep -qiE 'wbs|template|per-item|per item|each item|loop' docs/guides/generate-something-repeatedly.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/generate-something-repeatedly.md: No such file or directory
```
