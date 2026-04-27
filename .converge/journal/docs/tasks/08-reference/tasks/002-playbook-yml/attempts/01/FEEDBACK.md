# FEEDBACK.md — Check Results

**Status**: ❌ 4/4 check(s) failed

- ❌ **page-exists**
- ❌ **documents-name-and-tasks**
- ❌ **documents-checks**
- ❌ **shows-full-example**

## ❌ page-exists

**Command**: `test -f docs/reference/playbook-yml.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/reference/playbook-yml.md
```

## ❌ documents-name-and-tasks

**Command**: `grep -qE '^##\s+name|^###\s+name' docs/reference/playbook-yml.md && grep -qE '^##\s+tasks|^###\s+tasks' docs/reference/playbook-yml.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/playbook-yml.md: No such file or directory
```

## ❌ documents-checks

**Command**: `grep -qE '^##\s+checks|^###\s+checks' docs/reference/playbook-yml.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/playbook-yml.md: No such file or directory
```

## ❌ shows-full-example

**Command**: `grep -qE '^name:.+\n.+description:' docs/reference/playbook-yml.md || grep -A20 '```yaml' docs/reference/playbook-yml.md | grep -q 'name:'`
**Exit code**: 1
**Output**:
```
grep: docs/reference/playbook-yml.md: No such file or directory
grep: docs/reference/playbook-yml.md: No such file or directory
```
