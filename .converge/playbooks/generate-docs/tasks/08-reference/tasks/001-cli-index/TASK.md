---
id: 001-cli-index
title: Write docs/reference/cli/index.md (CLI overview)
inputs:
  - docs/_cli-commands.json
  - packages/cli/src/main.ts
outputs:
  - docs/reference/cli/index.md
checks:
  - id: page-exists
    cmd: "test -f docs/reference/cli/index.md"
    description: page exists
  - id: lists-commands
    cmd: "test $(grep -cE '^\\*?\\s*\\[?\\s*`?converge\\s+\\w+' docs/reference/cli/index.md) -ge 8"
    description: lists at least 8 commands
---

# Write `docs/reference/cli/index.md`

The "all commands at a glance" page. Reader who knows what they want can
scan this page and click through to the right reference page.

## Required frontmatter

```yaml
---
title: "CLI"
description: "All converge CLI commands at a glance."
sources:
  - docs/_cli-commands.json
  - packages/cli/src/main.ts
sidebar:
  order: 1
---
```

## Required structure

1. **Top of page.** "Every CLI command, grouped by intent. For full flag and
   option detail, click through to a command's page."

2. **Workflow group.** Most-used commands. From `_cli-commands.json` filter
   to: `init`, `run`, `verify`, `status`, `reset`, `plan`. Each as a row:
   command + one-line summary + link to its detail page.

3. **Inspection group.** `inspect`, `show`, `metrics`.

4. **Management group.** `playbook`, `skills`, `goals`.

5. **A11y group / advanced.** Anything else.

Use a markdown table or definition list — whichever Starlight renders best.

## Read first

- `docs/_cli-commands.json` — the canonical list with handlers.
- `packages/cli/src/main.ts` — verify the groupings match how the CLI's own
  `--help` groups them (the help text in `packages/cli/src/main.ts` has a
  natural grouping; mirror it).

## Banned

- Documenting flag-level detail here. Each command has its own page for that.
- Listing commands not in `_cli-commands.json`. If the scanner missed one,
  fix the scanner.
