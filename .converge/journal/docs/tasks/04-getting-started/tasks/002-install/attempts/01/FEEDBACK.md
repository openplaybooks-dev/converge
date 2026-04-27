# FEEDBACK.md — Check Results

**Status**: ❌ 5/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **shows-pnpm**
- ❌ **shows-verify-step**
- ❌ **shows-env-vars**

## ❌ page-exists

**Command**: `test -f docs/getting-started/install.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/getting-started/install.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/getting-started/install.md | grep -q '^title:' && head -10 docs/getting-started/install.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/getting-started/install.md: No such file or directory
```

## ❌ shows-pnpm

**Command**: `grep -qE 'pnpm\s+(add|install)' docs/getting-started/install.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/install.md: No such file or directory
```

## ❌ shows-verify-step

**Command**: `grep -qE 'converge\s+(--version|--help)' docs/getting-started/install.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/install.md: No such file or directory
```

## ❌ shows-env-vars

**Command**: `grep -qE 'API_KEY|ANTHROPIC|GEMINI|env' docs/getting-started/install.md`
**Exit code**: 2
**Output**:
```
grep: docs/getting-started/install.md: No such file or directory
```
