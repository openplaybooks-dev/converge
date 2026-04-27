---
id: 006-seed-posts
title: Write 2 seed posts (launch + langgraph comparison) sourced from README + concepts
dependencies: [001-collection-schema, 002-listing-page, 003-post-template, 004-rss-feed]
inputs:
  - README.md
  - docs/getting-started/why-converge.md
  - docs/concepts/context-interpolation.md
  - docs/concepts/deterministic-checks.md
  - docs/concepts/dynamic-work-breakdown.md
  - docs/concepts/self-correction.md
outputs:
  - apps/landing/src/content/blog/introducing-converge.mdx
  - apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx
checks:
  - id: both-posts-exist
    cmd: "test -f apps/landing/src/content/blog/introducing-converge.mdx && test -f apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx"
    description: both seed posts exist
  - id: posts-have-frontmatter
    cmd: "for f in apps/landing/src/content/blog/introducing-converge.mdx apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx; do test -f \"$f\" && head -20 \"$f\" | grep -q '^title:' && head -20 \"$f\" | grep -q '^date:' || exit 1; done"
    description: both posts have valid frontmatter (title + date)
  - id: rss-includes-posts
    cmd: "test -f apps/landing/package.json && pnpm --filter @converge/landing build >/dev/null 2>&1 && grep -q 'introducing-converge' apps/landing/dist/rss.xml && grep -q 'from-langgraph-to-goal-driven' apps/landing/dist/rss.xml"
    description: built rss.xml references both posts
  - id: tagline-in-intro-post
    cmd: "test -f apps/landing/src/content/blog/introducing-converge.mdx && grep -q 'Define done. Converge gets there.' apps/landing/src/content/blog/introducing-converge.mdx"
    description: introducing-converge contains the canonical tagline
---

# Seed posts

Write 2 launch posts. Both bodies are synthesized from real sources —
no new copy invented.

## Post 1: `apps/landing/src/content/blog/introducing-converge.mdx`

Pinned launch post. Quote the tagline + the "Why Converge?" bullets from
`README.md`, transition into the why-converge framing, end with the
quickstart command.

Frontmatter:

```yaml
---
title: "Define done, not how: introducing Converge"
description: "Why we built a goal-driven framework instead of another graph-driven one — and what that means for AI workflows."
date: 2026-04-26
author: "Converge Team"
tags: [announcements, philosophy]
pinned: true
---
```

Body skeleton (~600–900 words):

```mdx
> Define done. Converge gets there.

<-- 2-3 paragraphs derived from README.md hero + "Why Converge?" bullets -->

## Define how vs. define done

<-- 2 paragraphs from docs/getting-started/why-converge.md framing the paradigm shift -->

## What this looks like in practice

<-- code block: a small TASK.md showing the pattern, drawn from docs/getting-started/why-converge.md -->

## Try it in 60 seconds

<-- 3-step quickstart, copied from README.md -->

## What's next

<-- pointer to /docs/getting-started/your-first-playbook and /docs/concepts/ -->
```

## Post 2: `apps/landing/src/content/blog/from-langgraph-to-goal-driven.mdx`

Code-heavy. Same workflow goal expressed in LangGraph (steps) vs.
Converge (target state). Prose comes from the contrast sections of
`docs/concepts/deterministic-checks.md` + `dynamic-work-breakdown.md`.

Frontmatter:

```yaml
---
title: "From LangGraph to goal-driven: a side-by-side rewrite"
description: "We took the same workflow goal and expressed it two ways. Here's what changes when you swap from steps to a target state."
date: 2026-04-27
author: "Converge Team"
tags: [comparisons, tutorial]
---
```

Body skeleton (~800–1200 words):

```mdx
<-- intro paragraph derived from docs/concepts/deterministic-checks.md "The judgement problem" + dynamic-work-breakdown.md "The pre-declared-graph problem" -->

## The task

<-- describe the URL-fetch-summarize task once, plainly -->

## In LangGraph

<-- prose explanation -->

```python
# realistic LangGraph code, ~25-30 lines
```

## In Converge

```yaml
# playbook.yml
```

```markdown
---
id: 01-summarize
outputs: [out/summary.md]
checks:
  - id: file-exists
    cmd: test -f out/summary.md
---

Fetch {{url}} and write a 5-bullet summary to out/summary.md.
```

## What changed?

<-- comparison matrix: programming model, failure handling, state store, provider abstraction, debuggability -->

## When each shines

<-- balanced honest take, drawn from the trade-offs sections of docs/concepts/deterministic-checks.md and dynamic-work-breakdown.md -->
```

## Process

1. Read `README.md`, `docs/getting-started/why-converge.md`, and the 4 `docs/concepts/*.md` pages.
2. Write both `.mdx` files. Quote sources verbatim where possible; transition with light prose.
3. Run `pnpm --filter @converge/landing build`. Verify both posts appear in `dist/blog/<slug>/index.html` and in `dist/rss.xml`.

## Banned

- Inventing claims not in the source docs. Every assertion traces to a `sources` doc.
- Embedding live code execution. MDX components for runnable demos are out of scope for v1.
- Editing the comparison code samples to make Converge look better than fair. The contrast in concepts/*.md is honest; preserve that tone.
