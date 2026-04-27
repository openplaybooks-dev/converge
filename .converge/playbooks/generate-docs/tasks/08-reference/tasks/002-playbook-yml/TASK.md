---
id: 002-playbook-yml
title: Write docs/reference/playbook-yml.md (playbook.yml schema)
inputs:
  - packages/core/src/storage/types.ts
  - examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml
  - .converge/playbooks/implement-studio/playbook.yml
outputs:
  - docs/reference/playbook-yml.md
checks:
  - id: page-exists
    cmd: "test -f docs/reference/playbook-yml.md"
    description: page exists
  - id: documents-name-and-tasks
    cmd: "grep -qE '^##\\s+name|^###\\s+name' docs/reference/playbook-yml.md && grep -qE '^##\\s+tasks|^###\\s+tasks' docs/reference/playbook-yml.md"
    description: documents name and tasks fields
  - id: documents-checks
    cmd: "grep -qE '^##\\s+checks|^###\\s+checks' docs/reference/playbook-yml.md"
    description: documents checks field
  - id: shows-full-example
    cmd: "grep -qE '^name:.+\\n.+description:' docs/reference/playbook-yml.md || grep -A20 '```yaml' docs/reference/playbook-yml.md | grep -q 'name:'"
    description: shows a complete playbook.yml example
---

# Write `docs/reference/playbook-yml.md`

The complete reference for `playbook.yml`. Every field, every constraint.

## Required frontmatter

```yaml
---
title: "playbook.yml"
description: "Complete schema reference for playbook.yml."
sources:
  - packages/core/src/storage/types.ts
  - examples/stitch-to-flutter-baby-watch-v2/.converge/playbooks/default/playbook.yml
  - .converge/playbooks/implement-studio/playbook.yml
sidebar:
  order: 2
---
```

## Required structure

1. **At-a-glance example.** Show a complete `playbook.yml` (~40 lines) at the
   top so readers can scroll back to it. Use `implement-studio`'s manifest
   as the canonical example.

2. **Field-by-field reference.** For each top-level field:
   - `name` (string, required)
   - `description` (string, optional)
   - `run` (object, required)
     - `mode` (`oneoff` | `loop` | `dispatch`)
     - `maxIterations` (integer)
     - `maxTaskAttempts` (integer)
     - `maxDuration` (duration string, e.g. `8h`)
     - `resume` (boolean)
     - `stall` (object: `maxConsecutive`, `backoffMs`)
   - `tasks` (array, required) — phase list with `id` + optional `depends_on`
   - `checks` (array, optional) — global checks
   - `variables` (object, optional)

   For each field, document:
   - Type (from the schema in `packages/core/src/storage/types.ts`)
   - Required vs optional
   - Default (if any)
   - One-line description
   - One-line example

3. **Common patterns.**
   - File-nested phases vs explicit `tasks:` list
   - When to declare global checks vs per-task checks
   - `run.mode` choices

## Read first

- `packages/core/src/storage/types.ts` — find `PlaybookConfigSchema` (or
  similarly-named zod schema). Pull field names + types from there. **Do not
  invent fields.**
- The two example `playbook.yml` files cited in `sources:`.

## Banned

- Documenting fields not in the schema. If `run.timeout` doesn't exist in
  `PlaybookConfigSchema`, do not document it.
- Marking a field "required" without verifying. Check the zod schema's
  `.optional()` calls.
- Skipping the at-a-glance example. Reference pages live or die on having
  one.
