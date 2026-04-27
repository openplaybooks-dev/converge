# Checks: 07-integrate-blog/006-seed-posts

All checks must pass for this task to be considered complete.
Run each command from the project root. Fix failures and re-run.

## both-posts-exist
**Description**: both seed posts exist
**Command**: `test -f apps/landing/src/content/blog/introducing-converge.mdx && test -f apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx`

## posts-have-frontmatter
**Description**: both posts have valid frontmatter (title + pubDate)
**Command**: `for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f "$f" && head -20 "$f" | grep -q '^title:' && head -20 "$f" | grep -q '^pubDate:' || exit 1; done`

## rss-includes-posts
**Description**: built rss.xml references both posts
**Command**: `cd apps/landing && pnpm exec astro preview --port 4321 &
sleep 3 && curl -sf http://localhost:4321/rss.xml | grep -q 'introducing-converge' && curl -sf http://localhost:4321/rss.xml | grep -q 'from-langgraph-to-goal-driven'; kill %1 2>/dev/null`

## tagline-in-intro-post
**Description**: introducing-converge contains the canonical tagline
**Command**: `test -f apps/landing/src/content/blog/introducing-converge.mdx && grep -q 'Define done. Converge gets there.' apps/landing/src/content/blog/introducing-converge.mdx`