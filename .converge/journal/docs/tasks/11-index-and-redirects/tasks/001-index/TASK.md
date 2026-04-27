---
id: 001-index
title: Write docs/index.md (root landing)
inputs:
  - docs/_ia.json
outputs:
  - docs/index.md
checks:
  - id: page-exists
    cmd: "test -f docs/index.md"
    description: page exists
  - id: links-to-getting-started
    cmd: "grep -qE 'getting-started/' docs/index.md"
    description: links into Getting Started
  - id: links-to-examples
    cmd: "grep -qE 'examples/' docs/index.md"
    description: links into Examples gallery
  - id: links-to-troubleshooting
    cmd: "grep -qE 'troubleshooting/' docs/index.md"
    description: links into Troubleshooting
  - id: short
    cmd: "wc -w docs/index.md | awk '{exit ($1<=500?0:1)}'"
    description: <=500 words (it's a hub, not a topic)
---

# Write `docs/index.md`

Root of the docs site. What users land on at `/docs`.

## Required frontmatter

```yaml
---
title: "Converge"
description: "Define done. Converge gets there."
---
```

(No `sources:` — this is a hub, not a content page. The `validate-docs`
script skips `docs/index.md`.)

## Required structure

A short hello + six entry points (one per top-level group from
`docs/_ia.json`). Order: Getting Started, Examples, Guides,
Troubleshooting, Reference, Concepts. Group the entry points into two
clusters — "Start here" (the first three) and "Go deeper / get
unstuck" (the last three).

```markdown
# Converge

> Define done. Converge gets there.

Converge is a TypeScript framework for AI workflows that runs gap-driven
instead of step-driven. You declare what "done" looks like; Converge closes
the gap.

## Start here

- **[Getting Started](./getting-started/why-converge)** — install and ship
  your first playbook in five minutes.
- **[Examples gallery](./examples/)** — 21 working playbooks across
  software, research, creative work, security, and protocol demos.
- **[Guides](./guides/articulate-your-goal)** — problem-shaped how-tos
  ("research a topic deeply", "build a software project").

## Go deeper / get unstuck

- **[Troubleshooting](./troubleshooting/)** — symptom-indexed fixes for
  stuck runs.
- **[Reference](./reference/cli/)** — every CLI command and config
  schema.
- **[Concepts](./concepts/gap-driven-model)** — the mental model behind
  the framework.
```

## Banned

- A wall of feature claims. The reader is here to *navigate*.
- More than six entry points. The IA has six groups; mirror that.
- A "What's new" section. Belongs in CHANGELOG, not the docs root.
- Linking to `_internal/` from the root.
