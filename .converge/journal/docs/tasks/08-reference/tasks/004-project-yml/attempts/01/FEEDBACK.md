# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **page-exists**
- ❌ **documents-ai-section**
- ❌ **documents-name-description**

## ❌ page-exists

**Command**: `test -f docs/reference/project-yml.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/reference/project-yml.md
```

## ❌ documents-ai-section

**Command**: `grep -qiE 'ai|provider' docs/reference/project-yml.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/project-yml.md: No such file or directory
```

## ❌ documents-name-description

**Command**: `grep -qE '`name`|^###\s+name' docs/reference/project-yml.md && grep -qE '`description`|^###\s+description' docs/reference/project-yml.md`
**Exit code**: 2
**Output**:
```
grep: docs/reference/project-yml.md: No such file or directory
```
