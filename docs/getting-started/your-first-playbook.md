---
title: "Your first playbook"
description: "Scaffold, edit one file, run. End to end in five minutes."
sidebar:
  order: 3
---
## Two paths

This page walks the **manual path** — write the playbook by hand so you see what every field does. Five minutes, one file, no magic.

If you'd rather skip ahead, there's also a **generated path**: in Claude Code, invoke the [`converge-planning`](../guides/converge-planning-skill) skill with a one-sentence description and it produces the whole playbook (phases, tasks, checks, scripts) for you to review and run. Recommended once you've done the manual path once and know what you're looking at.

```
You: /converge-planning generate a playbook that writes today's date to out/today.txt
Claude: <emits .converge/playbooks/default/ with TASK.md, checks, and a verify step>
```

The rest of this page is the manual path.

## Pick a target

Write today's date to `out/today.txt`. That's it. You can swap this for your own target later, but for this walkthrough we stay concrete and verifiable.

## Scaffold

```bash
mkdir hello-converge && cd hello-converge
converge init
```

`converge init` scaffolds a `.converge/` directory. After running, your project looks like this:

```
hello-converge/
└── .converge/
    ├── .gitignore
    └── playbooks/
        └── default/
            └── playbook.yml
```

`playbook.yml` is the playbook configuration. `playbooks/default/` is where tasks live — the agent reads task definitions from here.

## Edit one file

Create `playbooks/default/tasks/01-write-date/TASK.md`:

```markdown
---
id: 01-write-date
title: Write today's date to out/today.txt
outputs: [out/today.txt]
checks:
  - id: file-exists
    cmd: test -f out/today.txt
  - id: looks-like-a-date
    cmd: grep -qE '^\d{4}-\d{2}-\d{2}$' out/today.txt
---

Run `date '+%Y-%m-%d'` and write its output to `out/today.txt`. Create the
directory if it doesn't exist.
```

Here's what each section does:

- **outputs** — files this task creates. The agent will ensure these exist when checks pass.
- **checks** — shell commands that decide if the task is done. Exit 0 = done, non-zero = not done.
- **body** — the instruction the agent reads to figure out how to satisfy the checks.

## Run

Two paths again — pick by what you want to do while it runs.

**Direct CLI** — you watch the output and step in if it gets stuck.

```bash
converge run
```

The agent picks up your task, runs it, and the checks pass. Watch for the status flip to ✓ when the task completes. If something fails, you read the journal, edit, and run `converge run` again (resume is the default).

**Babysat by Claude Code** — recommended for anything longer than a few tasks. In Claude Code, invoke the [`converge-control`](../guides/converge-control-skill) skill:

```
You: /converge-control run my playbook
```

Claude launches `converge run`, monitors the event stream, recognizes common failure patterns (orphan processes, path drift, buggy checks, repeat-failure stalls), applies known fixes inline, and only escalates to you when it hits something novel. For the date-writing task this is overkill, but on a 50-task playbook it's the difference between watching a terminal for an hour and reviewing a summary.

## Verify

```bash
cat out/today.txt
# 2026-04-26
```

## What just happened

- You declared a target state (file + checks). You did not write code that produces the file.
- The agent generated and executed the work to satisfy the checks.
- The journal at `.converge/journal/` holds the receipt.

## Next

- **Skip the hand-authoring next time** → `guides/converge-planning-skill` (describe what you want in one sentence, get a full playbook)
- **Run a long playbook unattended** → `guides/converge-control-skill` (babysitter that diagnoses and resumes through common failures)
- **Want to read the journal?** → `guides/read-the-journal`
- **Want a more realistic example?** → `examples/` (the gallery)
- **Want to walk through articulating your own target?** → `getting-started/from-problem-to-playbook`
