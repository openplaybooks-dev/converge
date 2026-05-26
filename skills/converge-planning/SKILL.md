---
name: converge-planning
description: >-
  Design a Converge playbook end-to-end. Use when the user says "plan a
  project", "design a playbook", "decompose into tasks", "scaffold a
  Converge workflow", "onboard to Converge", or asks how to write
  TASK.md / playbook.yml. Two entry points: plan a new playbook or update
  an existing one. Hand off to `/converge-control` after producing the
  playbook structure.
---

# Converge Planning

## Core mental model

**A playbook is a contract, not a script.**

Every task states what must exist when done — not what steps to run.

**Split by result, not by process.**

Task names are nouns: "database schema", "payment API". Verbs signal process decomposition — wrong.

**Every task produces a complete deliverable.**

If the next task finishes your output, you built middle work — split differently.

**Files are the currency.** Work passes through `outputs:` and `inputs:`, not through prompts pasted into bodies.

**Middle work detector — three questions:**

1. Can someone use this output directly? If no → middle work.
2. Does the next task consume it, or finish it? If finish → middle work.
3. Does the name describe a thing that exists, or a stage of making one? If stage → middle work.

---

## Definition of done

**Playbook done:** all `goals:` checks pass. Each goal has shell commands — exit 0 = pass.

```yaml
# playbook.yml
goals:
  - id: code-quality
    checks:
      - cmd: pnpm tsc --noEmit
      - cmd: pnpm vitest run
```

**Task done:** all declared `outputs:` exist + all `checks:` pass. Not "started" or "in progress" — complete.

---

## Context bounding

Each task takes a **slice** of context (inputs) → produces a **bounded** output. One task = one unit of work.

**Rules:**

- **Input list is tight.** A task with 30 inputs has 30 file paths in context — expensive. Keep it small. If a task needs 20 files, it's probably doing too much.
- **Output is specific file paths.** Not "various files", not "etc.". Each path is declared.
- **Large specs split into focused artifacts.** Don't pass one mega JSON down the chain. Split it: task A writes `spec-01.json`, task B writes `spec-02.json`. Each task reads only what it needs.
- **Bounded output size.** A task that produces 10 outputs is probably a container that should decompose. Each leaf task has 1–3 outputs.
- **Middleware output is a smell.** If task B's output is "half done" and task C finishes it, that's middle work — split differently.

**The viewport:** `inputs:` is the viewport. Make it small but precise: everything the task needs, nothing else.

---

## Plan new playbook

### 1. Gather context (optional — only if existing codebase)

Run discovery commands from `references/phases.md` to understand what already exists.

---

### 2. Extract the goal

One sentence. A complete, usable deliverable.

```
"A deployed blog with post CRUD, comments, and RSS feed."
"A working REST API with auth and test coverage."
```

NOT "build a blog" (vague). NOT "plan, design, implement, test" (process).

---

### 3. Decompose into 3–7 sub-goals

Break the goal into complete things, not stages.

```
"A deployed blog"
├── "Database schema + seed"     → migration.sql + seed.sql
├── "Blog API endpoints"         → working server, passing tests
├── "Blog frontend"             → rendered pages with live data
└── "Auth + permissions"         → login flow with role checks
```

At each node: can one agent finish this in one session?
- Yes → leaf. Stop.
- No → split further.

**Load `references/anti-patterns.md` if something smells wrong.**

---

### 4. Assign a mode to each task

**Load `references/task-modes.md`** — has decision tree + examples.

| Mode | Use when | Body |
|---|---|---|
| `leaf` (default) | One agent produces one complete deliverable. No children. | Write the outputs. |
| `spawner` | Child list is data-driven, large, or from a catalog. | Call `ctx.loop.spawn()` per child. |
| `converger` | Keep running until checks pass. Fix-all loop. | Loop: fix → `ctx.loop.continue()` until `halt_when` fires. |
| `gateway` | Sync point — downstream depends on one edge instead of N. No body. | Empty. |

**Static nested (not a mode):** When N ≤ 7 and the child list is known at plan time, just put `01-name/TASK.md` files under `tasks/<parent>/tasks/`. Folder name IS execution order (`ls` alphabetical). No mode declaration needed.

---

### 5. Write TASK.md contracts

**Load `references/schema.md`** — field reference for frontmatter.

For each task, write `TASK.md`:

```yaml
---
id: 02-blog-api
title: Blog API endpoints
inputs:
  - 01-db/migration.sql
outputs:
  - api/server.js
  - api/routes/posts.js
depends_on: [01-db]
checks:
  - id: server-runs
    cmd: node api/server.js &
    sleep 2 && curl localhost:3000/posts
  - id: tests-pass
    cmd: pnpm test
---
```

**Spawner** — body calls `ctx.loop.spawn(target, { params: { key: value } })` per child. Never write child TASK.md files directly.

**Converger** — body loops: fix what checks caught, call `ctx.loop.continue()`. Halts when `halt_when` passes or `max_waves` exceeded.

---

### 6. Validate

**Load `references/anti-patterns.md`** — contract leak check.

**Per-task checks:**
- [ ] Title is one noun phrase, not a verb
- [ ] Outputs are specific paths, not "various files"
- [ ] Every output has at least one check
- [ ] Every input traces to an upstream output
- [ ] No middle work (next task consumes, does not finish)

**DAG-level checks:**
- [ ] Every user requirement maps to ≥1 task
- [ ] `depends_on` edges are explicit
- [ ] Static children for known lists ≤7; spawner for data-driven >7
- [ ] Static child folders named with `\d+-` prefix (e.g. `01-`, `99-`, `001-`, `000x-`) — `ls` alphabetical = execution order
- [ ] Convergers have `halt_when`
- [ ] No cycles

---

### 7. Hand off

```
/converge-control run --playbook=<name>
```

---

## Update existing playbook

### 1. Read current structure

Read `PLAN.md` + the `tasks/` tree to understand what's already there.

### 2. Identify what changed

- New goal or requirement? → decompose new sub-goals
- Restructure existing? → apply anti-patterns check
- Add new fan-out or loop? → assign mode + write contracts

**Load `references/anti-patterns.md` if something smells wrong.**

### 3. Apply steps 3–6 from Plan new

### 4. Hand off

```
/converge-control run --playbook=<name> --resume
```

---

## Directory layout

```
.converge/
├── project.yaml
└── playbooks/
    └── <name>/
        ├── playbook.yml        # root: goals + top-level checks
        ├── PLAN.md             # goal decomposition (human review)
        ├── skills/             # reusable how-to (loaded by tasks)
        │   └── <skill-name>/
        │       ├── SKILL.md
        │       ├── references/
        │       └── scripts/    # deterministic helpers (sh, py)
        ├── tasks/              # static tasks — known at plan time
        │   ├── 01-prepare/
        │   │   └── TASK.md
        │   └── 02-build/
        │       ├── TASK.md     # mode: spawner or converger
        │       └── tasks/      # static children — folder name IS execution order (ls alphabetical)
        │           ├── 01-schema/
        │           │   └── TASK.md
        │           └── 02-api/
        │               └── TASK.md
        └── templates/          # spawn templates — handlebar templated, spawned at runtime
            └── screen/
                ├── TASK.md    # {{paramName}} interpolated at spawn
                ├── PARAMS.yml # param contract (optional)
                └── EXAMPLES.yml # canonical invocations (optional)
```

**Artifact roles:**

| Artifact | Role | When created |
|---|---|---|
| `playbook.yml` | Root manifest. Declares top-level tasks, goals, run config. | Hand-authored once per playbook |
| `TASK.md` (in `tasks/`) | Static unit of work. Inputs, outputs, checks, body. | Hand-authored |
| `TASK.md` (in `templates/`) | Handlebar template. `{{paramName}}` substituted at spawn. | Hand-authored once, instantiated many times |
| `PARAMS.yml` | Param contract for a template. Declares required/optional params and types. | Hand-authored |
| `SKILL.md` | How-to methodology. Loaded when task references `skills: [<name>]`. | Hand-authored |
| `scripts/*.sh` or `*.py` | Deterministic helpers. Called from checks or bodies. | Hand-authored |

**Execution order:** Static children run in `ls` alphabetical order of their folder names. Name folders with numeric prefixes: `01-`, `02-`, `001-`, `002-` — the prefix IS the execution sequence. `depends_on` wires the DAG but folder names define the run order. Templates under `templates/<name>/` are never run directly — they're instantiated at runtime by a parent calling `ctx.loop.spawn()`.

**Static vs dynamic:** Static tasks exist at plan time. Dynamic tasks (`templates/**/TASK.md`) are spawned at runtime from a template with interpolated params.