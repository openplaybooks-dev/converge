---
id: 08-reference
title: Phase 08 — Reference (CLI WBS + 4 schema/API pages)
description: |
  Reference is the structured part of the docs. The CLI section is generated
  by WBS over docs/_cli-commands.json (one task per command). The four
  schema/API pages are fixed.
seeds: [reference]
blocking: true
dependencies: [03-ia]
inputs:
  - docs/_cli-commands.json
  - docs/_sources.json
outputs:
  - docs/reference/cli/**/*.md
  - docs/reference/playbook-yml.md
  - docs/reference/task-md.md
  - docs/reference/project-yml.md
  - docs/reference/core-api.md
checks:
  - id: cli-pages-generated
    cmd: "test $(find docs/reference/cli -name '*.md' 2>/dev/null | wc -l) -ge 5"
    description: at least 5 CLI command pages generated
  - id: schema-pages-exist
    cmd: "test -f docs/reference/playbook-yml.md && test -f docs/reference/task-md.md && test -f docs/reference/project-yml.md"
    description: all 3 schema reference pages exist
  - id: core-api-page-exists
    cmd: "test -f docs/reference/core-api.md"
    description: "@converge/core API surface page exists"
  - id: cli-index-exists
    cmd: "test -f docs/reference/cli/index.md"
    description: docs/reference/cli/index.md (CLI overview / command list)
---

# Reference

Six fixed leaves + a WBS-driven CLI section.

This phase does not change with the IA reshuffle — Reference is the
schema-level / CLI-level surface, useful for technical readers who want
to know exactly what flag does what. The user-facing problem-shaped
content lives under Guides and Examples; Reference stays
mechanical / generated.

## Fixed leaves

- **001-cli-index** — `docs/reference/cli/index.md`. The "all commands at a glance"
  page. Auto-built from `docs/_cli-commands.json`.
- **002-playbook-yml** — schema reference for `playbook.yml`.
- **003-task-md** — schema reference for `TASK.md` frontmatter.
- **004-project-yml** — schema reference for `project.yml`.
- **005-core-api** — `@converge/core` public API surface page.

## WBS-driven CLI

`./wbs/index.js` reads `docs/_cli-commands.json` (produced by `02-source-scan`)
and spawns one task per command. Each spawned task uses the
`{{prefix}}-{{slug}}` template at `wbs/templates/cli-command/tasks/{{slug}}/TASK.md`
to write `docs/reference/cli/<name>.md`.

The template knows: command name, handler file path (where to read behaviour
from), the source line in `main.ts`. The agent reads those, then writes the
page.
