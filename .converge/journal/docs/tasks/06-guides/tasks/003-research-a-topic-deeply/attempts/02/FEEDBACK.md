# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **anchored-on-research-examples**
- ❌ **explains-layered-or-iterative**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/research-a-topic-deeply.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/research-a-topic-deeply.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/research-a-topic-deeply.md | grep -q '^title:' && head -10 docs/guides/research-a-topic-deeply.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/research-a-topic-deeply.md: No such file or directory
```

## ❌ anchored-on-research-examples

**Command**: `grep -qE 'deep-research|frontier-research|scientific-research' docs/guides/research-a-topic-deeply.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/research-a-topic-deeply.md: No such file or directory
```

## ❌ explains-layered-or-iterative

**Command**: `grep -qiE 'layer|iterat|deepen|round|pass' docs/guides/research-a-topic-deeply.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/research-a-topic-deeply.md: No such file or directory
```
