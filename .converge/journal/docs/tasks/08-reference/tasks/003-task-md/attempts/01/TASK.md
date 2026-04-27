# Task: 08-reference/003-task-md

# Write `docs/reference/task-md.md`

Complete reference for `TASK.md` frontmatter.

## Required frontmatter

```yaml
---
title: "TASK.md"
description: "Complete schema reference for TASK.md frontmatter."
sources:
  - packages/core/src/config/task-definition.ts
  - packages/core/src/storage/types.ts
sidebar:
  order: 3
---
```

## Required structure

1. **At-a-glance example.** Show a complete leaf TASK.md (frontmatter + a
   short body). Use a real one from `implement-studio` or `landing-page`.

2. **Frontmatter fields.** Document every field. Group as:

   **Identity**
   - `id` (string, required for leaves) — unique within the playbook
   - `title` (string, required)
   - `description` (string, optional)

   **Hierarchy / dependencies**
   - `dependencies` (string[], optional) — task IDs this one waits on
   - `blocking` (boolean, default false on leaves, true on phases)

   **I/O contract**
   - `inputs` (string[], optional) — files this task reads
   - `outputs` (string[], optional) — files this task produces
   - `references` (string[], optional) — knowledge-base IDs the agent should consult
   - `tags` (string[], optional)

   **Validation**
   - `checks` (CheckDef[], required for leaves)
     - `id` (string, required)
     - `description` (string, optional)
     - `cmd` (string, required) — shell command, exit 0 = pass
   - `backlogs` (BacklogDef[], optional) — non-blocking checks; warn rather than fail

   **Dynamic children**
   - `wbs` (object, optional) — `type: nodejs`, `path: ./wbs/index.js`

   **Skill / routing**
   - `skill` (string, optional) — execute via a registered skill
   - `vars` (object, optional) — variables passed to children (used by WBS templates)

3. **Body.** The markdown after the closing `---` is the prompt the agent
   reads. Keep it focused — a TASK.md body should explain the *intent* and
   *constraints*, not the implementation.

4. **Inheritance.** Children inherit some context from parents (sources,
   skills). Document what's inherited if `task-definition.ts` codifies it.

## Read first

- `packages/core/src/config/task-definition.ts` — `TaskDefinition` and
  `TaskFrontmatterSchema` (or whatever they're called). Pull field names
  and types verbatim.
- `packages/core/src/storage/types.ts` for `CheckSchema` etc.

## Banned

- Inventing inheritance rules not in the source.
- Documenting fields from a previous V1 schema if the codebase has moved on.
  Verify against current source.