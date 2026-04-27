# FEEDBACK.md — Check Results

**Status**: ❌ 4/5 check(s) failed

- ❌ **page-exists**
- ❌ **page-frontmatter**
- ❌ **covers-claude-and-others**
- ❌ **shows-project-yml**
- ✅ **word-count-ok**

## ❌ page-exists

**Command**: `test -f docs/guides/switch-providers.md`
**Exit code**: 1
**Output**:
```
Command failed: test -f docs/guides/switch-providers.md
```

## ❌ page-frontmatter

**Command**: `head -10 docs/guides/switch-providers.md | grep -q '^title:' && head -10 docs/guides/switch-providers.md | grep -q '^sources:'`
**Exit code**: 1
**Output**:
```
head: docs/guides/switch-providers.md: No such file or directory
```

## ❌ covers-claude-and-others

**Command**: `grep -qiE 'claude' docs/guides/switch-providers.md && grep -qiE 'gemini|kimi|qwen|openrouter' docs/guides/switch-providers.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/switch-providers.md: No such file or directory
```

## ❌ shows-project-yml

**Command**: `grep -qE 'project\.yml|^ai:' docs/guides/switch-providers.md`
**Exit code**: 2
**Output**:
```
grep: docs/guides/switch-providers.md: No such file or directory
```
