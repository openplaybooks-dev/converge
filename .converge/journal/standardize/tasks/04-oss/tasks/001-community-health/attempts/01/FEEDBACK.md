# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **coc-exists**
- ❌ **issue-templates-exist**
- ❌ **pr-template-exists**

## ❌ coc-exists

**Command**: `test -f CODE_OF_CONDUCT.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f CODE_OF_CONDUCT.md
```

## ❌ issue-templates-exist

**Command**: `test -d .github/ISSUE_TEMPLATE`
**Exit code**: 1
**Output**:
```
Command failed: test -d .github/ISSUE_TEMPLATE
```

## ❌ pr-template-exists

**Command**: `test -f .github/PULL_REQUEST_TEMPLATE.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f .github/PULL_REQUEST_TEMPLATE.md
```
