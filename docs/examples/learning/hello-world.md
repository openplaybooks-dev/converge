---
title: "Hello World — the simplest Converge playbook"
description: "Read end-to-end in 30 seconds: one task, one output, one check. The minimal Converge example to learn how playbooks, tasks, and verification fit together."
sidebar:
  label: "Hello World"
  order: 1
---

> **Use this if:** *"I want a minimal working playbook I can read end-to-end in one sitting."*

**Complexity:** trivial · **Run time:** seconds · **Cost:** ~$0 · **Category:** [Learning](../)

The smallest possible Converge playbook. One task creates `output.txt`, one check verifies the file exists. That's it.

If you've never written a playbook before, start here — every other example in the gallery is a layered version of this same shape: **TASK.md → outputs → checks → done.**

## What it does

Creates a single file (`output.txt`) and verifies it exists on disk. The runner reads the task, executes it once, runs the check, and exits. No loops, no Seed, no dynamic spawning — just the bare bones.

## Anatomy

```
examples/hello-world/
└── .converge/
    └── playbooks/default/
        ├── playbook.yml          # default run mode: oneoff
        └── tasks/
            └── create-file/
                └── TASK.md       # outputs: [output.txt], checks: [test -f output.txt]
```

A `TASK.md` is a markdown file with frontmatter that declares two things:

- **`outputs`** — files this task is responsible for producing.
- **`checks`** — shell commands that must exit `0` for the task to be considered done.

The runner keeps re-attempting the task until every check passes. If your check measures the gap between current state and target state, the loop has a target — and that's the entire premise of Converge.

## Run it

```bash
git clone https://github.com/myanlabs/converge.git
cd converge/examples/hello-world
converge run
```

Expected output: `output.txt` appears in the working directory. Check the journal at `.converge/journal/` to see the model's reasoning, retries (if any), and the check exit code.

## What to read next

Once you've run it, open the artifacts:

- `.converge/journal/LEARN.md` — narrative summary of what happened.
- `.converge/journal/events.jsonl` — structured event stream the runner emitted.

Then change one thing at a time:

1. Add a second check: `grep -q "hello" output.txt`. Re-run. Watch the runner re-do the task to satisfy the new constraint.
2. Add a second task that depends on the first (e.g. count the lines in `output.txt`).
3. Replace the trivial output with something a model has to *reason* about — e.g. "write a haiku about state machines to `haiku.txt`".

## Customize it

- [Customize an example](../../guides/customize-an-example) — how to fork and modify a playbook safely.
- [Your first playbook](../../getting-started/your-first-playbook) — write one from scratch instead of cloning.
- [`TASK.md` reference](../../reference/task-md) — every frontmatter field, fully documented.

## Related examples

- [Data Pipeline](../learning/data-pipeline) — next step up: three sequential tasks with explicit dependencies.
- [Fullstack App](../software/fullstack-app) — same primitives, but with Seed dynamically spawning component tasks.
- [Hello World source on GitHub](https://github.com/myanlabs/converge/tree/main/examples/hello-world)
