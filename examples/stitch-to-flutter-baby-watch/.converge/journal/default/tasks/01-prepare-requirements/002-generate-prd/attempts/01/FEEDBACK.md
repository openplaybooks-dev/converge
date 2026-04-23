# FEEDBACK.md — Check Results

**Status**: ❌ 3/3 check(s) failed

- ❌ **prd-exists**
- ❌ **prd-has-sections**
- ❌ **prd-matches-idea**

## ❌ prd-exists

**Command**: `test -f PRD.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f PRD.md
```

## ❌ prd-has-sections

**Command**: `grep -qE "## (Overview|Features|Requirements)" PRD.md`
**Exit code**: 2
**Output**:
```
grep: PRD.md: No such file or directory
```

## ❌ prd-matches-idea

**Command**: `first=$(head -1 idea.md | sed 's/^#* *//' | awk '{print $1}'); grep -qi "$first" PRD.md`
**Exit code**: 2
**Output**:
```
grep: PRD.md: No such file or directory
```
