---
id: 005-next-steps
title: Write docs/getting-started/next-steps.md
inputs:
  - docs/_ia.json
outputs:
  - docs/getting-started/next-steps.md
checks:
  - id: page-exists
    cmd: "test -f docs/getting-started/next-steps.md"
    description: page exists
  - id: links-into-examples
    cmd: "grep -qE '\\(/examples/|\\(\\.\\./examples/' docs/getting-started/next-steps.md"
    description: links into Examples gallery
  - id: links-into-guides
    cmd: "grep -qE '\\(/guides/|\\(\\.\\./guides/' docs/getting-started/next-steps.md"
    description: links into Guides
  - id: links-into-reference
    cmd: "grep -qE '\\(/reference/|\\(\\.\\./reference/' docs/getting-started/next-steps.md"
    description: links into Reference
  - id: short
    cmd: "wc -w docs/getting-started/next-steps.md | awk '{exit ($1<=350?0:1)}'"
    description: <=350 words (this is a hub, not a topic)
---

# Write `docs/getting-started/next-steps.md`

A short hub page. The reader has shipped their first playbook (or browsed
the examples gallery); this page points them at the right next stop based
on what they want to do.

## Required frontmatter

```yaml
---
title: "Next steps"
description: "Where to go next, depending on what you want to build."
sources:
  - docs/_ia.json
sidebar:
  order: 5
---
```

## Required structure

A single intro paragraph, then 5-6 "if you want X, read Y" sign-posts.
The first sign-post points to the Examples gallery, since that's the
fastest path from problem to working playbook.

```markdown
You have a working playbook. Where next depends on what you want to build.

### If you want to see real-world examples first
→ [Examples gallery](/examples/) — 21 working playbooks across software,
research, creative work, security, and protocol demos. Find the closest
match to your problem and copy it.

### If you want to articulate your own problem as a playbook
→ [From your problem to a playbook](/getting-started/from-problem-to-playbook)
walks a non-technical reader through goal articulation, picking an
example, and tweaking it.

### If you want a real, multi-step playbook
→ [Build a software project](/guides/build-a-software-project) walks
through structure, naming conventions, and dependency ordering.

### If you want to switch providers (or use multiple)
→ [Switch providers](/guides/switch-providers) covers Claude, Gemini,
Kimi, Qwen.

### If a run gets stuck
→ [Troubleshooting](/troubleshooting/) — symptom-indexed fixes.

### If you want the conceptual model
→ [Gap-driven model](/concepts/gap-driven-model).
```

Adjust based on what `docs/_ia.json` actually contains.

## Banned

- A long "where we're going next" roadmap. This is sign-posts.
- Linking to internal/_internal docs.
- More than 6 sign-posts. Decision fatigue is the enemy here.
