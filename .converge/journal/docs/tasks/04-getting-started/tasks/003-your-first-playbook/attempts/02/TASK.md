# Task: 04-getting-started/003-your-first-playbook

# Write `docs/getting-started/your-first-playbook.md`

The most important page on the site. The reader walks from "I have the CLI"
to "I have a playbook that ran successfully and converged on a target state."

If this page works, they keep going. If it doesn't, they leave.

## Required frontmatter

```yaml
---
title: "Your first playbook"
description: "Scaffold, edit one file, run. End to end in five minutes."
sources:
  - README.md
  - examples/*/.converge/playbooks/*/playbook.yml
  - packages/cli/src/commands.ts
sidebar:
  order: 3
---
```

## Required structure

A linear walkthrough — no detours, no caveats inline.

### 1. Pick a goal (1 paragraph)

Tiny goal that's verifiable: "Write today's date to `out/today.txt`."
The reader can swap this for their own task later, but for the tutorial we
stay concrete.

### 2. Scaffold (`converge init`)

```bash
mkdir hello-converge && cd hello-converge
converge init
```

Show the resulting tree (`tree -a .converge` or equivalent), 8-12 lines max.
Annotate the files that matter most: `playbook.yml`, the first `TASK.md`.

### 3. Edit one file (`tasks/01-write-date/TASK.md`)

Show the verbatim file content the reader pastes:

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

Explain in one paragraph what the reader is looking at:
- **outputs**: the files this task creates.
- **checks**: shell commands that decide if the task is done. Exit 0 = done.
- **body**: the instruction the agent reads.

### 4. Run (`converge run`)

```bash
converge run
```

Show the expected output shape (paraphrased — don't fake exact strings).
Tell them what to watch for: the agent picks the task up, runs it, the
checks pass, status flips to ✓.

### 5. Verify

```bash
cat out/today.txt
# 2026-04-26
```

### 6. What just happened (3-bullet recap)

- You declared a target state (file + checks). You did not write code that
  produces the file.
- The agent generated and executed the work to satisfy the checks.
- The journal at `.converge/journal/` holds the receipt.

### 7. Next

Two pointers:
- **Want to read the journal?** → `guides/read-the-journal`
- **Want a more realistic example?** → `examples/` (the gallery)
- **Want to walk through articulating your own goal?** → `getting-started/from-problem-to-playbook`

## Read first

- `README.md` quickstart — verify `init` and `run` exist as documented.
- `examples/` — pick one with a *trivial* first task and use it to ground
  your `TASK.md` example. Do not invent fields not in the codebase.
- `packages/cli/src/commands.ts` — verify `initCommand` actually scaffolds
  what you describe.

## Banned

- Multiple alternate paths in the walkthrough ("you can also..."). Linear, single path.
- A "What if it fails?" troubleshooting branch. If a step commonly fails, fix the framework or the example — don't paper over it in the tutorial.
- Skipping the verify step. The reader needs to *see* `out/today.txt` exist for the lesson to land.