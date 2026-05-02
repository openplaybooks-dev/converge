---
id: 05-examples
title: Phase 05 — Examples gallery (hub + WBS-driven per-example pages)
description: |
  The Examples gallery is the highest-leverage surface in the docs.
  Most non-technical readers will pick an example, copy it, and tweak it —
  so every example needs a page that answers: what problem does it solve,
  how is it structured, how do I run it.

  Hub page (docs/examples/index.md) is a fixed leaf that groups examples
  by category and links to each per-example page. The per-example pages
  are spawned by WBS over docs/_examples.json.
seeds: [examples]
blocking: true
dependencies: [03-ia]
inputs:
  - docs/_examples.json
  - docs/_ia.json
  - examples
outputs:
  - docs/examples/index.md
  - docs/examples/**/*.md
checks:
  - id: gallery-hub-exists
    cmd: "test -f docs/examples/index.md"
    description: gallery hub page exists
  - id: per-example-pages-generated
    cmd: "test $(find docs/examples -mindepth 2 -name '*.md' | wc -l) -ge 15"
    description: at least 15 per-example pages generated
  - id: every-category-has-pages
    cmd: "for cat in learning software research creative security agent-protocol; do test $(find docs/examples/$cat -name '*.md' 2>/dev/null | wc -l) -ge 1 || { echo \"missing pages for category: $cat\"; exit 1; }; done"
    description: each of the 6 categories has at least one example page
---

# Examples gallery

Two parts:

1. **Hub** (`docs/examples/index.md`) — the gateway. Groups examples by
   category. Each card has: title, tagline, a one-line "use this if…"
   matcher, link to the detail page. Authored by the fixed leaf
   `001-gallery-hub`.

2. **Per-example pages** — one per entry in `docs/_examples.json`.
   Spawned by `wbs/index.js`, written from a template at
   `wbs/templates/example-page/tasks/{{slug}}/TASK.md`.

The template knows: slug, title, category, README path, playbook path,
tagline, complexity. The agent reads the README and the playbook.yml,
then writes the page.

## Categories

Six categories drive the directory layout
(`docs/examples/<category>/<slug>.md`):

- `learning` — beginner-friendly, single-concept playbooks.
- `software` — building runnable software (apps, games, asset pipelines).
- `research` — multi-pass deep research / analysis playbooks.
- `creative` — creative output, simulation, optimization.
- `security` — security work.
- `agent-protocol` — protocol / SDK demos.

The `02-source-scan` phase assigns each example a category in
`docs/_examples.json`. The WBS uses that field to choose the output
directory.

## Per-example page contract

Every page must answer:

1. **What problem does it solve?** (one paragraph)
2. **How is the playbook structured?** (phases at a glance)
3. **How do I run it?** (concrete commands)
4. **What do I tweak to make it mine?** (the 2-3 files most readers
   will change first)
5. **Where to look next** (related examples, related guides).

Examples that lack a README **or** lack a playbook still get a page —
but it explicitly says "this example is undocumented; here's the file
tree and the playbook (if any)" rather than fabricating content. The
WBS template handles both shapes.
