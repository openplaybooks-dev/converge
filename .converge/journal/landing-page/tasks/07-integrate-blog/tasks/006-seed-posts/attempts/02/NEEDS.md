# Needs: 07-integrate-blog/006-seed-posts

## Inputs

- `README.md`
- `docs/getting-started/why-converge.md`
- `docs/concepts/context-interpolation.md`
- `docs/concepts/deterministic-checks.md`
- `docs/concepts/dynamic-work-breakdown.md`
- `docs/concepts/self-correction.md`

## Expected Outputs

- `apps/landing/src/content/blog/introducing-converge.mdx`
- `apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx`

## Checks

- **both-posts-exist**: both seed posts exist
- **posts-have-frontmatter**: both posts have valid frontmatter (title + date)
- **rss-includes-posts**: built rss.xml references both posts
- **tagline-in-intro-post**: introducing-converge contains the canonical tagline
