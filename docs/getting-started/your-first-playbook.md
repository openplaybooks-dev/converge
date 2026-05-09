---
title: "Your first playbook"
description: "Scaffold, edit one file, run. End to end in five minutes."
sidebar:
  order: 3
---
## Two paths

This page walks the **manual path**: write the playbook by hand so you see what every field does. Five minutes, one file, no magic.

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

`playbook.yml` is the playbook configuration. `playbooks/default/` is where tasks live: the agent reads task definitions from here.

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

- **outputs**: files this task creates. The agent will ensure these exist when checks pass.
- **checks**: shell commands that decide if the task is done. Exit 0 = done, non-zero = not done.
- **body**: the instruction the agent reads to figure out how to satisfy the checks.

## Run

Two paths again: pick by what you want to do while it runs.

**Direct CLI**: you watch the output and step in if something fails.

```bash
converge compile
converge run
```

The agent picks up your task, runs it, and the checks pass. Watch for `NODE_COMPLETE` in the event stream. If something fails, read the journal, fix the TASK.md, re-compile, and run `converge run --select 'result:error+'` to retry only failures.

**Babysat by Claude Code**: recommended for anything longer than a few tasks. In Claude Code, invoke the [`converge-control`](../guides/converge-control-skill) skill:

```
You: /converge-control compile and run my playbook
```

Claude runs `converge compile` then `converge run`, monitors the event stream, recognizes common failure patterns (stale paths, missing dependencies, pre-existing type errors), applies known fixes inline, and only escalates to you when it hits something novel. For the date-writing task this is overkill, but on a 50-task playbook it's the difference between watching a terminal for an hour and reviewing a summary.

## Verify

```bash
cat out/today.txt
# 2026-04-26
```

## What just happened

- You wrote a specification: what file to produce, what checks define success, and what approach to take.
- The agent executed your specification and produced the file.
- The checks verified the work was done correctly.

## Next

- **Skip the hand-authoring next time** → `guides/converge-planning-skill` (describe what you want in one sentence, get a full playbook)
- **Run a long playbook unattended** → `guides/converge-control-skill` (babysitter that diagnoses and resumes through common failures)
- **Want a more realistic example?** → `examples/` (the gallery)
- **Want to walk through articulating your own target?** → `getting-started/from-problem-to-playbook`
