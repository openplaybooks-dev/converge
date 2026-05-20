---
title: "The playbook"
description: "The playbook is Converge's durable unit of work: file-backed tasks plus journal-backed runtime state."
sidebar:
  order: 1
---

## You write the spec. Converge runs it. The journal records it.

A playbook is the durable artifact in Converge. It is a file-backed specification for work:

- `playbook.yml` defines the playbook
- `TASK.md` files define the tasks
- `.converge/journal/<playbook>/` records compiled and runtime state

The task files declare what must be produced and how success is checked. The journal records what the runner discovered and what happened when it ran.

## Anatomy

Common shape:

```text
.converge/playbooks/default/
├── playbook.yml
└── tasks/
    ├── 01-prepare/TASK.md
    ├── 02-build/TASK.md
    └── 03-verify/TASK.md
```

Dynamic or loop-oriented playbooks may also use a root `TASK.md` directly at the playbook root:

```text
.converge/playbooks/default/
├── playbook.yml
├── TASK.md
└── tasks/
```

Runtime artifacts live here:

```text
.converge/journal/default/
├── manifest.json
├── runstate.json
└── ...
```

## What makes a playbook useful

**File-based contract.** Inputs, outputs, and checks live in version-controlled files.

**Deterministic verification.** Checks are shell commands, not AI self-grading.

**Composable graph.** Tasks depend on each other through explicit declarations and discovered structure.

**Replayable runtime record.** Compile and run state live in the journal, so resume and inspection work against durable artifacts.

## `playbook.yml` vs `TASK.md`

`playbook.yml` is the wrapper:

- name
- inputs
- task entries
- run limits
- goals
- playbook-level checks

`TASK.md` is the task contract:

- dependencies
- inputs
- outputs
- checks/tests
- task mode (`leaf` / `spawner` / `converger` / `gateway`)
- vars and execution hints
- markdown body

## Lifecycle

### 1. Author

You write `playbook.yml` and `TASK.md` files.

### 2. Compile

`converge compile` reads the playbook and writes:

- `.converge/journal/<playbook>/manifest.json`
- `.converge/journal/<playbook>/runstate.json`

### 3. Run

`converge run` executes the compiled graph, updates journal state, and records attempts and outcomes.

### 4. Inspect or resume

Subsequent commands such as `run --resume`, `inspect`, `status`, and `list` work against that journal-backed state.

## Dynamic work

Converge supports dynamic work expansion, but the current authored contract is still file-first:

- static tasks are discovered from `TASK.md`
- dynamic fan-out uses `mode: spawner` — body writes `<id>/spawn.yml` invocations under `$CONVERGE_SPAWN_DIR`; framework expands templates and applies (RFC 0024 — `converge apply` survives as internal IR)
- multi-wave loops use `mode: converger` with `halt_when` / `wave_check` / `halt.marker` (RFC 0022)
- loop-oriented playbooks often use a root `TASK.md`

The current shipped runtime is journal-backed and compile-then-run.

## Skills and playbooks

Skills are reusable execution knowledge. Playbooks are complete runnable specs.

- A playbook says what must be done.
- A skill helps a task do it.

You can run playbooks without custom skills. You can also install the bundled `converge-planning` and `converge-control` skills to help author and operate playbooks, but the playbook and journal remain the core runtime model either way.
