---
id: 001-why-converge
title: Write docs/getting-started/why-converge.md
inputs:
  - README.md
  - packages/core/src/index.ts
outputs:
  - docs/getting-started/why-converge.md
checks:
  - id: page-exists
    cmd: "test -f docs/getting-started/why-converge.md"
    description: page exists
  - id: page-has-frontmatter
    cmd: "head -10 docs/getting-started/why-converge.md | grep -q '^title:' && head -10 docs/getting-started/why-converge.md | grep -q '^sources:'"
    description: page has title + sources frontmatter
  - id: page-has-define-done
    cmd: "grep -q 'define done' docs/getting-started/why-converge.md || grep -q 'Define done' docs/getting-started/why-converge.md"
    description: page introduces the 'define done' framing
  - id: page-not-too-long
    cmd: "test -f docs/getting-started/why-converge.md && wc -w docs/getting-started/why-converge.md | awk '{exit ($1<=600?0:1)}'"
    description: page is <=600 words (under 3 min read)
  - id: page-not-too-short
    cmd: "test -f docs/getting-started/why-converge.md && wc -w docs/getting-started/why-converge.md | awk '{exit ($1>=200?0:1)}'"
    description: page is >=200 words (substantive)
---

# Write `docs/getting-started/why-converge.md`

The first page a new reader sees. Their decision tree on this page:

> "Is this for me, or do I keep looking?"

If the answer is yes, they continue to `install.md`. If no, they leave with
a clear understanding of what we *are* and *aren't* — which is honest and
saves their time.

## Required frontmatter

```yaml
---
title: "Why Converge"
description: "Define what 'done' looks like. Converge closes the gap. Filesystem-native, multi-provider, TypeScript."
sources:
  - README.md
  - packages/core/src/index.ts
sidebar:
  order: 1
---
```

## Required structure (in order)

1. **One-sentence opener.** What converge is, in 12 words or fewer.
2. **The paradigm flip.** Most agent frameworks ask you to define *how* (graphs of nodes/edges, sequences of steps). Converge asks you to define *done* — the target state — and closes the gap. ~80 words.
3. **A tiny "feel it" example.** A 6-line `TASK.md` showing target-state declaration: outputs + checks. The reader should think "oh, that's it?".
4. **What you get from that.** 3-5 bullet points: gap-driven self-correction, filesystem-as-plan, multi-provider, small core, TypeScript-native. One line each.
5. **What this is NOT.** Two or three honest "if you need X, look elsewhere" sentences. Examples: not a graph runtime, not a chatbot framework, not a multi-agent collaboration toolkit.
6. **Next step.** Single CTA: "Continue to [Install](./install)."

## Voice

- First-person plural ("we built this", "we found that").
- Concrete over abstract. Show, then claim.
- No marketing words: "revolutionary", "next-gen", "AI-native". Read `docs/_internal/brand-messaging.md` if you need the voice spec.
- Code blocks are real and minimal. Don't show 30 lines when 6 explain it.

## Process

1. Read `README.md` for the canonical project intro and quickstart.
2. Read `packages/core/src/index.ts` for the actual public API surface (so you don't claim features that don't exist).
3. Write the page following the structure above. Keep it tight (target ~400 words).
4. The `wc -w` checks will fail if you go under 200 or over 600. They exist to enforce tightness.

## Banned

- Comparisons to other frameworks here. The user just landed; comparisons live on a dedicated page if/when added later.
- Roadmap promises ("we're working on X"). Document what is, not what might be.
- Generic AI hype openers ("In the era of LLMs..."). Skip the framing. Get to the point.
