---
title: "Your first playbook"
description: "Scaffold, add one task, compile, and run."
sidebar:
  order: 3
---

## Goal

Write today's date to `out/today.txt` with one task and two deterministic checks.

## Scaffold

```bash
mkdir hello-converge && cd hello-converge
converge init
```

The project now contains a `.converge/` directory with project config and a default playbook.

Typical shape:

```text
hello-converge/
└── .converge/
    ├── project.yaml
    └── playbooks/
        └── default/
            └── playbook.yml
```

## Add one task

Create `.converge/playbooks/default/tasks/01-write-date/TASK.md`:

```markdown
---
id: 01-write-date
title: Write today's date to out/today.txt
outputs:
  - out/today.txt
checks:
  - id: file-exists
    cmd: test -f out/today.txt
  - id: looks-like-date
    cmd: grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' out/today.txt
---

Run `date '+%Y-%m-%d'` and write the result to `out/today.txt`.
Create the output directory if it does not exist.
```

This is the core Converge pattern:

- `outputs` says what must exist
- `checks` says how success is verified
- the body says how to get there

## Compile

```bash
converge compile
```

Compile discovers the task graph and writes runtime artifacts into the journal:

```text
.converge/journal/default/
├── manifest.json
└── runstate.json
```

Those files are the compiled view the runtime will execute.

## Run

```bash
converge run
```

The runner reads the task, executes it, and verifies the checks. If the task fails, fix the task definition or the environment and run again.

## Verify

```bash
cat out/today.txt
```

Expected shape:

```text
2026-05-17
```

## What just happened

- You defined a task as a file-backed contract.
- `converge compile` turned the playbook into journal-backed runtime state.
- `converge run` executed the task and checked the result.

## Optional: use the bundled skills

If you initialized with `--skills`, the bundled `converge-planning` and `converge-control` skills can help author and operate playbooks from Claude Code or Codex. They are helpers around the same playbook and journal model documented here; they do not change the runtime contract.

## Next

- Read [From your problem to a playbook](./from-problem-to-playbook.md)
- Read [The playbook](../concepts/playbook.md)
- Read the schema references for [`playbook.yml`](../reference/playbook-yml.md) and [`TASK.md`](../reference/task-md.md)
