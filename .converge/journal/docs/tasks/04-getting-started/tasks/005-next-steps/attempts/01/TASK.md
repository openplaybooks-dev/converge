# Task: 04-getting-started/005-next-steps

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