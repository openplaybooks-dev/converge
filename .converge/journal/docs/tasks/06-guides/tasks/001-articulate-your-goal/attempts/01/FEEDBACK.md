# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **covers-three-questions**
- ❌ **links-to-examples-or-from-problem**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/articulate-your-goal.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/articulate-your-goal.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/articulate-your-goal.md | grep -q '^title:' && head -10 docs/guides/articulate-your-goal.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/articulate-your-goal.md: No such file or directory
```

## ❌ covers-three-questions

**Command**: `grep -qiE 'output|done|verify' docs/guides/articulate-your-goal.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/articulate-your-goal.md: No such file or directory
```

## ❌ links-to-examples-or-from-problem

**Command**: `grep -qE '\(/examples/|/getting-started/from-problem-to-playbook' docs/guides/articulate-your-goal.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/articulate-your-goal.md: No such file or directory
```
