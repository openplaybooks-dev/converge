# FEEDBACK.md — Check Results

**Status**: ❌ 1/1 check(s) failed

- ❌ **posts-have-frontmatter**

## ❌ posts-have-frontmatter

**Command**: `for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f "$f" && head -20 "$f" | grep -q '^title:' && head -20 "$f" | grep -q '^date:' || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f "$f" && head -20 "$f" | grep -q '^title:' && head -20 "$f" | grep -q '^date:' || exit 1; done
```
