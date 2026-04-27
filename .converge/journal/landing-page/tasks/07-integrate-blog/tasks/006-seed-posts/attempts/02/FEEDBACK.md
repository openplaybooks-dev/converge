# FEEDBACK.md — Check Results

**Status**: ❌ 2/4 check(s) failed

- ✅ **both-posts-exist**
- ❌ **posts-have-frontmatter**
- ❌ **rss-includes-posts**
- ✅ **tagline-in-intro-post**

## ❌ posts-have-frontmatter

**Command**: `for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f "$f" && head -20 "$f" | grep -q '^title:' && head -20 "$f" | grep -q '^date:' || exit 1; done`
**Exit code**: 1
**Output**:
```
Command failed: for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f "$f" && head -20 "$f" | grep -q '^title:' && head -20 "$f" | grep -q '^date:' || exit 1; done
```

## ❌ rss-includes-posts

**Command**: `test -f apps/landing/package.json && pnpm --filter @converge/landing build >/dev/null 2>&1 && grep -q 'introducing-converge' apps/landing/dist/rss.xml && grep -q 'from-langgraph-to-goal-driven' apps/landing/dist/rss.xml`
**Exit code**: 2
**Output**:
```
grep: apps/landing/dist/rss.xml: No such file or directory
```
