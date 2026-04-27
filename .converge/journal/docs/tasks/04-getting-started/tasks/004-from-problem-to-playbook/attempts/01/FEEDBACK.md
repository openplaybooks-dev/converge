# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **links-to-examples-gallery**
- ❌ **shows-three-questions**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/getting-started/from-problem-to-playbook.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/getting-started/from-problem-to-playbook.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/getting-started/from-problem-to-playbook.md | grep -q '^title:' && head -10 docs/getting-started/from-problem-to-playbook.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/getting-started/from-problem-to-playbook.md: No such file or directory
```

## ❌ links-to-examples-gallery

**Command**: `grep -qE '\(/examples/|\(\.\./examples/' docs/getting-started/from-problem-to-playbook.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/from-problem-to-playbook.md: No such file or directory
```

## ❌ shows-three-questions

**Command**: `grep -qiE 'what.*done|what.*success|what.*output' docs/getting-started/from-problem-to-playbook.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/from-problem-to-playbook.md: No such file or directory
```
