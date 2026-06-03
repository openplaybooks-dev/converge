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

## When to use this skill

User says: "plan a project" / "design a playbook" / "decompose into tasks" / "write a playbook"

---

## Scenario lookup — pick the right file immediately

Read one scenario that matches the user's ask. If learning or comparing patterns, read multiple.

| What the user says | Read this scenario |
|---|---|
| "build an app" / "implement features" / "create screens and components" | `scenarios/software-development.md` |
| "generate a design system" / "design tokens" / "component library" | `scenarios/design-system.md` |
| "automate a workflow" / "business rules" / "reports and notifications" | `scenarios/business-automation.md` |
| "optimize" / "genetic algorithm" / "score and rank candidates" | `scenarios/optimization.md` |
| "deep research" / "explore a topic" / "multi-epoch research" | `scenarios/exploration.md` |
| "goal-driven" / "sprint planning" / "kanban" / "do-while loop" | `scenarios/goal-driven.md` |
| "data pipeline" / "cron-triggered" / "ETL" / "continuous sync" | `scenarios/pipeline.md` |
| "two playbooks feeding each other" / "dual loop" / "generator-evaluator" | `scenarios/dual-feedback-loop.md` |
| "decompose into modules" / "write templates" / "spawn per component" | `scenarios/decomposition.md` |

**No match?** Default to `scenarios/decomposition.md` — it explains the root pattern all others specialize.

---

## The thinking sequence

1. **Ask: what does the deliverable contain?** (BOM, not steps)
2. **Decompose into artifacts** — noun-phrase task names.
3. **Identify composition** — which artifact reads whose output? (inputs:)
4. **Identify static vs. dynamic** — known at plan time vs. runtime data
5. **Assign modes** — task / spawner / converger / gateway
6. **Write TASK.md contracts**
7. **Validate** (anti-patterns check)
8. **Hand off** to converge-control

---

## Step-by-step

### 1. Ask: what does the deliverable contain?

Not "what steps" — "what artifacts".

WRONG: "generate a design system" / "build a blog" / "plan, design, implement"
RIGHT: "A design system: brand identity + tokens + primitives + components"
RIGHT: "A blog: schema + API + frontend + tests"

Work backward from final artifacts. This is your BOM (bill of materials).

### 2. Decompose into artifacts

Break into complete deliverables. Task name = output artifact (noun phrase).

See `scenarios/` for worked examples:
- `scenarios/design-system.md` — BOM: branding → tokens → primitives → components
- `scenarios/software-development.md` — BOM: schema → API → frontend → tests
- `scenarios/business-automation.md` — BOM: intake → rules → report → notification

For each artifact: can one agent finish it in one session?
- Yes → task
- No → split further

If the decomposition reads like steps ("1. do X, 2. do Y"), stop and restart from the artifacts.

### 3. Identify composition via inputs:

Ordering is by inputs tracing. No `depends_on:` in task frontmatter.

If task B reads A's output path → B runs after A. The runtime deduces the graph from inputs: alone.

```
Brand identity (no inputs — first)
  ↓ inputs: brand identity output
Tokens (reads: Brand identity)
  ↓ inputs: tokens output
Primitives (reads: Tokens)
  ↓ inputs: primitives output
Components (reads: Primitives)
```

### 4. Identify static vs. dynamic

**Static:** known at plan time. Lives in `tasks/`. The fixed skeleton.

**Dynamic:** from runtime data (catalog, API, user input). Lives in `templates/`. Spawned by a `mode: spawner` task.

Ask: is the child list known at plan time?
- Yes → static children under `tasks/<id>/tasks/`
- No → mode: spawner + templates/

Templates are for content that varies per invocation — NOT for every task.

### 5. Assign modes

Read `references/task-modes.md` for the full table.

```
task         — one agent, one deliverable. (default)
spawner     — runtime fan-out from data. Body calls ctx.loop.spawn().
converger   — multi-wave fix loop until checks pass.
gateway     — sync point. No body.
```

### 6. Write TASK.md contracts

Read `references/schema.md` for field reference.

For each task, write `tasks/<id>/TASK.md`:

```yaml
---
id: <id>
title: <noun phrase for the output>
inputs:
  - <path to upstream output>
outputs:
  - <path to this task's output>
checks:
  - id: <check-name>
    cmd: <shell command — exit 0 = pass>
---
```

**Do not add `tasks:` to playbook.yml.** For static skeletons, the loader discovers tasks from the `tasks/` directory at compile time. Task bodies (inputs:, outputs:, checks:) go in `tasks/<id>/TASK.md`.

For spawner tasks (dynamic children from templates/), write the spawner body in `tasks/<id>/TASK.md` with `mode: spawner`.

### 7. Validate

Read `references/anti-patterns.md` if something smells wrong.

Per-task checks:
- [ ] Title is a noun phrase, not a verb
- [ ] Outputs are specific paths
- [ ] Every output has a check
- [ ] Every input traces to an upstream output

Playbook-level:
- [ ] Looks like a BOM, not steps
- [ ] Static vs. dynamic is correct

### 8. Hand off

```
/converge-control run --playbook=<name>
```

---

## Key principles

**BOM over steps.** Start from "what does it contain", not "what runs first".

**Files are the currency.** Work passes through `outputs:` and `inputs:`, not prompts pasted into bodies.

**Middle work is wrong.** Each task's output must be complete and usable — not "part 1" for the next task to finish.

**Tasks are nouns.** "brand identity", "color tokens", "primitive components". NOT "catalog", "generate", "build".

**Ordering via inputs:.** Do not write `depends_on:` in task frontmatter. Sibling order is determined by `inputs:`.

---

## Trigger references

Read `references/` only when flagged:
- `references/task-modes.md` — when assigning mode to a parent task
- `references/schema.md` — when writing TASK.md frontmatter
- `references/anti-patterns.md` — when decomposition smells wrong
- `references/phases.md` — only if existing codebase (step 1, optional)

---

## Update existing playbook

### 1. Read current structure

Read the `tasks/` tree to understand what's already there.

### 2. Identify what changed

- New goal or requirement? → decompose new sub-goals (step 2 above)
- Restructure existing? → anti-patterns check
- Add new fan-out or loop? → assign mode + write contracts

### 3. Apply steps 3–7 from Plan new

### 4. Hand off

```
/converge-control run --playbook=<name> --resume
```
