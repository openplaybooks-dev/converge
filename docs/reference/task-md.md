---
title: "TASK.md"
description: "Current TASK.md frontmatter reference."
sidebar:
  order: 3
---

# TASK.md Frontmatter Reference

`TASK.md` is the primary task authoring format in Converge. It is a markdown file with required YAML frontmatter followed by a markdown body.

- The **frontmatter** declares the contract.
- The **body** is the instruction text the agent or shell executor uses.

The parser requires a `--- ... ---` frontmatter block. Files without YAML frontmatter are treated as malformed task definitions.

## Example

```markdown
---
id: 01-write-date
title: Write today's date
mode: leaf
outputs:
  - out/today.txt
checks:
  - id: file-exists
    cmd: test -f out/today.txt
vars:
  timezone: UTC
---

Write today's date to `out/today.txt`.
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
- `converge?: string | { prompt?, cmd? }` *(legacy do-while; see also `mode: converger`)*

### Planning and context

- `plan?: true | { prompt?, output?, outputPrompt? }`
- `context?: ...`
- `auto-converge?: boolean | object`
- `diagnosis-hints?: ...`
- `correction-budget?: number`
- `context-depth?: number`
- `vars?: Record<string, unknown>`

Unknown frontmatter keys are collected into `vars` unless they are reserved parser keys.

## Task mode (RFC 0022) — declared lifecycle

Every task declares its lifecycle via `mode:`. The runtime enforces the contract and surfaces violations as structured errors the repair loop can address.

Four modes, deliberate cap:

| `mode:`     | Intent                                  | Body produces                  | Post-body invariant                                            |
|-------------|-----------------------------------------|--------------------------------|----------------------------------------------------------------|
| `leaf`      | Produce declared outputs, no children   | Files at `outputs:` paths      | Outputs exist; no `spawn.plan.jsonl`; no children registered    |
| `spawner`   | One-shot fan-out from a manifest        | `spawn.plan.jsonl` + apply     | Manifest applied; result file all `ok: true`; children registered |
| `converger` | Multi-wave loop until a halt condition  | New evidence each wave         | A halt marker exists OR the wave check decides to continue     |
| `gateway`   | Synchronisation point; no own outputs   | Nothing                        | All `depends_on:` complete; no spawn manifest expected         |

If `mode:` is absent, the runtime infers from signals (`passthrough:`, body content). New playbooks should declare `mode:` explicitly.

### `mode: leaf` (default)

```yaml
id: 03-render-card
mode: leaf
outputs:
  - lib/widgets/card.dart
checks:
  - id: card-exists
    cmd: test -f lib/widgets/card.dart
```

### `mode: spawner` — declarative fan-out

```yaml
id: 02-fan-out-shots
mode: spawner
spawn:
  template: shot          # default template if rows omit it
  min_children: 1
  max_children: 50
  apply: auto             # framework calls `converge apply` after body (default)
checks:
  - id: shots-applied-clean
    cmd: scripts/spawn-results-clean.sh
```

Body responsibility: write `$CONVERGE_TASK_DIR/spawn.plan.jsonl` with one JSON row per child. The framework calls `converge apply` after the body when `apply: auto` (the default).

Row schema (RFC 0021):

```jsonl
{"id":"child-1","template":"templates/shot","vars":{"shot_id":"01"}}
{"id":"child-2","template":"templates/shot","vars":{"shot_id":"02"}}
```

See [RFC 0021 — Declarative spawn apply](../rfcs/0021-declarative-spawn-apply.md) for the full schema and error codes.

### `mode: converger` — multi-wave loop

```yaml
id: 04-fix-all-type-errors
mode: converger
converge:
  max_waves: 20
  halt_when:
    - id: zero-type-errors
      cmd: pnpm tsc --noEmit
  wave_check:                    # runs after each wave to decide continue/halt
    cmd: scripts/wave-decision.sh
```

Halt signals (priority order):

1. `$CONVERGE_TASK_DIR/halt.marker` exists → halt, success.
2. Every check in `halt_when:` passes → halt, success.
3. `wave_check` exits 0 → halt, success.
4. `wave_check` exits 2 → halt, fail (give up).
5. `wave_check` exits 1 → continue, next wave.
6. Wave count exceeds `max_waves` → halt, fail with `errorCode: "converger-max-waves"`.

The body may optionally write `spawn.plan.jsonl` per wave. The framework applies the manifest before evaluating halt signals.

### `mode: gateway` — synchronisation point

```yaml
id: 09-staging-ready
mode: gateway
depends_on: [01-build, 02-test, 03-lint]
```

No body, no outputs. The task exists so downstream tasks have one edge to depend on instead of N.

See [RFC 0022 — Task mode contract](../rfcs/0022-task-mode-contract.md) for the full contract, error codes, and migration guidance.

### Removed legacy surface

The following are removed and now raise migration errors at parse:

- `seed: { mode: cli }` → use `mode: spawner` (one-shot) or `mode: converger` (loop).
- `seeds: [...]` → same as above.
- `from_seed: <id>` → spawned children now flow through `converge apply` and the runtime ledger's `parent` field.

## Materialization

`materialization?: string`

The runtime currently uses this for behaviors such as:

- `incremental`
- `queue`

These behaviors matter to execution and resume semantics, so document them in the task that owns the loop or queue.

## Authoring rules that matter in practice

- Frontmatter must parse as a YAML mapping.
- List-shaped fields such as `outputs`, `inputs`, `depends_on`, `tags`, and `skills` must actually be YAML lists.
- The task body is required operationally for agent tasks and `mode: spawner` / `mode: converger` tasks.
- Folder/path layout matters: the runtime loads tasks from directories containing `TASK.md`.

## Mental model

- `playbook.yml` names the playbook and top-level task entries.
- `TASK.md` defines what a task reads, writes, checks, and how it should proceed.
- `mode:` declares the task's lifecycle contract; the runtime enforces it.
- `converge compile` discovers the task graph and writes journal artifacts.
- `converge run` executes that graph against journal state.
- `converge apply <manifest.jsonl>` ingests declarative spawn manifests (auto-invoked for `mode: spawner`).

For playbook-level config, see [playbook.yml](./playbook-yml.md).
