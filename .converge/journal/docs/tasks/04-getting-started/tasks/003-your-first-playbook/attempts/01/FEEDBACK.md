# FEEDBACK.md — Check Results

**Status**: ❌ 5/6 check(s) failed

- ❌ **page-exists**
- ❌ **shows-init**
- ❌ **shows-run**
- ❌ **shows-task-md**
- ❌ **shows-checks**
- ✅ **word-count-tight**

## ❌ page-exists

**Command**: `test -f docs/getting-started/your-first-playbook.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/getting-started/your-first-playbook.md
```

## ❌ shows-init

**Command**: `grep -qE 'converge\s+init' docs/getting-started/your-first-playbook.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/your-first-playbook.md: No such file or directory
```

## ❌ shows-run

**Command**: `grep -qE 'converge\s+run' docs/getting-started/your-first-playbook.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/your-first-playbook.md: No such file or directory
```

## ❌ shows-task-md

**Command**: `grep -qE 'TASK\.md' docs/getting-started/your-first-playbook.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/your-first-playbook.md: No such file or directory
```

## ❌ shows-checks

**Command**: `grep -qE '^checks:|`checks:`|checks block' docs/getting-started/your-first-playbook.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/your-first-playbook.md: No such file or directory
```
