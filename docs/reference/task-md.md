---
title: "TASK.md"
description: "Current TASK.md frontmatter reference."
sidebar:
  order: 3
---

# TASK.md Frontmatter Reference

`TASK.md` is the primary task authoring format in Converge. It is a markdown file with required YAML frontmatter followed by a markdown body.

- The **frontmatter** declares the contract.
- The **body** is the instruction text the agent or seed executor uses.

The parser requires a `--- ... ---` frontmatter block. Files without YAML frontmatter are treated as malformed task definitions.

## Example

```markdown
---
id: 01-write-date
title: Write today's date
outputs:
  - out/today.txt
checks:
  - id: file-exists
    cmd: test -f out/today.txt
seed:
  mode: cli
vars:
  timezone: UTC
---

Write today's date to `out/today.txt`.
If more child work is needed, emit `converge spawn ...` commands.
```

## Core fields

### Identity

- `id?: string`
- `name?: string`
- `title?: string`
- `description?: string`

Notes:

- At runtime, the loader derives task identity from the directory path. Frontmatter `id` is still required by validation and serialization, but the runtime's source of truth is the task directory.

### Dependencies and routing

- `depends_on?: string[]`
- `blocking?: boolean`
- `tags?: string[]`
- `from_seed?: string`
- `on-fail?: { reset?: string[] }`

### Inputs and outputs

- `inputs?: string[]`
- `outputs?: string[]`
- `materials?: string[]`

Notes:

- `outputs` is parsed strictly. Invalid shapes are treated as authoring errors.
- Human-readable output annotations like `file.ts (new)` or `file.ts (modified)` are stripped before path resolution.

### Checks

You can use either:

- `checks?: { id, cmd, description? }[]`
- `tests?: { id, cmd, description? }[]`

`tests` is the canonical field in the parser; `checks` remains as the common authored shape and is preserved as an alias in the current tooling.

Current check rules:

- deterministic shell commands only
- each entry must be `{ id, cmd }`
- AI assertions and named test references are rejected

### Agent and execution

- `skills?: string[]`
- `agent?: string`
- `ai?: object`
- `executor?: { type: "ai" | "script" | "function", path?, args?, env? }`
- `passthrough?: boolean`
- `retry-full-body?: boolean`
- `converge?: string`

### Planning and context

- `plan?: true | { prompt?, output?, outputPrompt? }`
- `context?: ...`
- `auto-converge?: boolean | object`
- `diagnosis-hints?: ...`
- `correction-budget?: number`
- `context-depth?: number`
- `vars?: Record<string, unknown>`

Unknown frontmatter keys are collected into `vars` unless they are reserved parser keys.

## Seeding and dynamic work

### Canonical seed declaration

```yaml
seed:
  mode: cli
```

This is the current declarative seed contract. When present, the runtime builds a CLI-seed function from the task body.

The body should emit `converge spawn ...` commands to materialize child tasks.

### Removed legacy shape

`seeds:` is removed. The parser throws:

```text
Legacy `seeds:` is removed. Use `seed: { mode: cli }`.
```

### Declarative child specs

`spawns?: TaskMdSpawnSpec[]` is also supported for declarative spawned children.

Each entry may contain:

- `id`
- `template`
- `vars`
- `depends_on`
- `inherit_vars`
- `title`
- `description`

### Root-task pattern

A playbook may use a root `TASK.md` at the playbook directory instead of only task directories under `tasks/`. This is common in loop or dynamically seeded playbooks.

## Materialization

`materialization?: string`

The runtime currently uses this for behaviors such as:

- `incremental`
- `queue`

These behaviors matter to execution and resume semantics, so document them in the task that owns the loop or queue.

## Authoring rules that matter in practice

- Frontmatter must parse as a YAML mapping.
- List-shaped fields such as `outputs`, `inputs`, `depends_on`, `tags`, and `skills` must actually be YAML lists.
- The task body is required operationally for agent tasks and CLI seed tasks.
- Folder/path layout matters: the runtime loads tasks from directories containing `TASK.md`.

## Mental model

- `playbook.yml` names the playbook and top-level task entries.
- `TASK.md` defines what a task reads, writes, checks, and how it should proceed.
- `converge compile` discovers the task graph and writes journal artifacts.
- `converge run` executes that graph against journal state.

For playbook-level config, see [playbook.yml](./playbook-yml.md).
