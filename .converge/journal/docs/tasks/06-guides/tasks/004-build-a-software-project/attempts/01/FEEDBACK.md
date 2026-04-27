# FEEDBACK.md — Check Results

**Status**: ❌ 5/6 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **anchored-on-software-examples**
- ❌ **shows-playbook-yml**
- ❌ **shows-task-md**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/build-a-software-project.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/build-a-software-project.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/build-a-software-project.md | grep -q '^title:' && head -10 docs/guides/build-a-software-project.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/build-a-software-project.md: No such file or directory
```

## ❌ anchored-on-software-examples

**Command**: `grep -qE 'flutter-app|fullstack-app|stitch-to-flutter' docs/guides/build-a-software-project.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/build-a-software-project.md: No such file or directory
```

## ❌ shows-playbook-yml

**Command**: `grep -qE 'playbook\.yml|^\s*name:' docs/guides/build-a-software-project.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/build-a-software-project.md: No such file or directory
```

## ❌ shows-task-md

**Command**: `grep -qE 'TASK\.md' docs/guides/build-a-software-project.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/build-a-software-project.md: No such file or directory
```
