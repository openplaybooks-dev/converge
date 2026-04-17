---
name: converge-planning
description: Create converge playbooks with deterministic, verifiable work breakdown structures
version: 2.0
category: system
tags: [planning, wbs, playbook]
---

# Converge Planning

## Core Principle: Progressive Information Enrichment

Planning is **convergence** — you start with a vague prompt and a large gap between what you know and what you need to execute. Each phase narrows that gap by enriching the information built up so far, until the plan is specific enough to run.

```
 KNOWN                                                    TARGET
  |                                                          |
  |  prompt  -->  analysis  -->  requirements  -->  outline  |
  |                                                    |     |
  |         <enriches>    <enriches>     <enriches>    |     |
  |                                                    v     |
  |              epics/*.json  -->  plan.json  -------> |    |
  |                                     |               |    |
  |                              deepened/*.json        |    |
  |                                     |               |    |
  |                              plan.json (final) ---> |    |
  |                                                     v    |
  |  GAP CLOSED: validation.json confirms coverage ========> |
  |                                                          |
  |  EMIT: playbook.yml + TASK.md files (executable plan)    |
```

Each artifact doesn't just "feed the next" — it **enriches** the cumulative understanding:
- `analysis.json` establishes ground truth: what exists right now
- `requirements.json` cross-references the prompt against that ground truth, identifying gaps between current state and desired state
- `outline.json` maps those gaps to work packages (epics)
- `epics/*.json` decomposes each gap into executable steps (tasks)
- `plan.json` merges everything and checks for remaining gaps
- `deepened/*.json` fills any tasks still too coarse to execute
- `validation.json` confirms zero gaps remain — every requirement is covered, every dependency resolved, every output verifiable

The plan is ready when the gap between "what we know" and "what we need" is zero.

## What This Skill Produces

A `.converge/playbooks/{name}/` directory containing `playbook.yml`, `TASK.md` files, and `wbs.js` scripts. The result is a playbook you run with `converge run --playbook={name}`.

Every task in the playbook has:
- **inputs** — what information it consumes (closing which knowledge gap)
- **outputs** — what information it produces (specific file paths)
- **checks** — deterministic proof the gap is closed (shell commands, exit 0 = done)
- **dependencies** — which gaps must be closed before this one can start

## Semantic Decomposition Levels

Each level refines the information. Earlier levels are broad and coarse; later levels are narrow and executable.

```
Level 0: Prompt        -> what the user wants               (the gap)
Level 1: Analysis      -> what exists now                    (analysis.json)
Level 2: Requirements  -> what's needed vs what exists       (requirements.json)
Level 3: Outline       -> work packages to close the gaps    (outline.json)
Level 4: Decomposition -> executable steps per work package  (epics/{id}.json)
Level 5: Deepening     -> sub-steps for complex tasks        (deepened/{id}.json)
Level 6: Plan          -> merged, cross-referenced plan      (plan.json)
Level 7: Validation    -> gap = 0 confirmed                  (validation.json)
Level 8: Emission      -> runnable playbook files
```

State directory: `.converge/plan-state/{name}/`. All artifacts go here.

## Pipeline Phases

```
000-setup-skills  -> install this skill
001-scan          -> analysis.json          (ground truth)
002-research      -> requirements.json      (gaps identified)
003-outline       -> outline.json           (gaps mapped to epics)
003-decompose     -> [WBS: one subtask per epic] -> epics/*.json  (gaps -> tasks)
003-merge         -> plan.json              (cross-referenced)
003-deepen        -> [WBS: conditional, per complex task] -> deepened/*.json
003-finalize      -> plan.json (updated)    (all gaps at task level)
004-validate      -> validation.json        (gap = 0 confirmed)
005-emit          -> playbook.yml + TASK.md files  (executable)
```

Phases 003-decompose and 003-deepen are WBS parents — they recognize that decomposition is itself a gap-filling operation: a coarse task is a gap in specificity, and WBS closes that gap by spawning finer-grained subtasks.

### Information Flow

Each artifact enriches the ones before it. Later phases read multiple earlier artifacts to cross-reference and fill gaps.

```
prompt ─────────────┐
                    v
          ┌──> analysis.json ──┐
          │                    v
          │    requirements.json ──┐     (enriches: prompt + analysis)
          │         │              v
          │         │       outline.json ──────────┐  (enriches: reqs + analysis)
          │         │              │                v
          │         └──────────────┼──> epics/*.json   (enriches: outline + reqs + analysis)
          │                        │         │
          │                        v         v
          │                     plan.json (merged)     (cross-references all epics)
          │                        │
          │                        v
          │                  deepened/*.json            (fills remaining coarse gaps)
          │                        │
          │                        v
          │                  plan.json (finalized)      (no gaps remain)
          │                        │
          │                        v
          └──────────────> validation.json              (proves gap = 0)
                                   │
                                   v
                          playbook.yml + TASK.md files  (executable plan)
```

## Rules

These constraints are non-negotiable. Every plan must follow them.

### The I/O Chain (Information Contract)
- Every task MUST have `inputs` — what knowledge it consumes (which gap it reads)
- Every task MUST have `outputs` — what knowledge it produces (specific file paths, not globs)
- Every task MUST have `checks` — postcondition proof that the output exists and is correct (run after execution)
- Every task SHOULD have `needs` — precondition checks that verify upstream outputs are valid before this task starts. Same `CheckDef` format as `checks`, but run **before** execution. If any `needs` check fails, the task is blocked — it doesn't execute at all.
- The I/O chain must be **complete and traceable**: every input must trace back to a prior task's output. No dangling inputs. If task B reads `schema.sql`, then some task A must produce `schema.sql` and B must depend on A.
- This chain is what makes the plan an **interpolation** — each task's output fills the gap between what's known and what the next task needs.
- Check layers (use all that apply for both `needs` and `checks`):
  1. File exists: `test -f path`
  2. Non-empty: `test -s path`
  3. Valid format: `node -e "JSON.parse(require('fs').readFileSync('path','utf-8'))"`
  4. Semantic correctness: `node -e "const d=JSON.parse(...);if(!d.field)throw 'missing'"`
- No task is "done" unless all `checks` pass. No task starts unless all `needs` pass.
- `needs` prevents wasted execution: if a precondition fails, the task blocks immediately instead of running and failing. Use `needs` for every task that depends on upstream file outputs.

### Dependencies (Gap Ordering)
- Dependencies encode the order in which gaps must be closed
- Same-epic: reference by task id (`001-setup`)
- Cross-epic: use `epic-id.task-id` format (`01-foundation.001-setup`)
- Tag-based: `tag:critical`
- No circular dependencies — ever
- If task B needs information that task A produces, B depends on A. Period.

### Structure
- 3-7 epics per plan, 3-7 tasks per epic
- Directory naming: `NN-kebab-case` for epics (01-foundation), `NNN-kebab-case` for tasks (001-setup)
- Each task gets its own directory with a `TASK.md` file

### WBS (Systematic Decomposition)
- A task that is too coarse to execute is a **gap in specificity** — WBS closes it by interpolating between the coarse description and executable steps
- When a task contains N similar items (entities, endpoints, pages), spawn one subtask per item via `ctx.spawn()` in a `wbs.js` script — this is **data-driven decomposition**
- When a task is too complex but items aren't uniform, decompose into heterogeneous subtasks — this is **structural decomposition**
- Each WBS subtask must have its own `inputs`, `outputs`, `needs`, and `checks` — the full information contract
- WBS is recursive: if a spawned subtask is still too coarse, it can have its own WBS. Continue until every leaf task is directly executable.
- File artifacts (JSON) are the ONLY way to share state between tasks — no implicit state, no global variables
- The WBS script reads prior artifacts to determine WHAT to decompose, then spawns tasks that produce new artifacts for subsequent phases

### Interpolation Rules
- Each phase must read ALL relevant prior artifacts — not just the immediate predecessor. This is interpolation: you need all known data points to fill the gaps between them.
- Cross-reference systematically: requirements against analysis, outline against requirements, tasks against outline AND requirements AND analysis
- Identify gaps explicitly: what's missing, what's ambiguous, what's too coarse — each gap becomes a task or a deepening candidate
- Every `openQuestion` in `requirements.json` must either be resolved by a later phase or documented as a risk
- The interpolation is complete when `validation.json` confirms: every requirement has a task, every task has outputs, every output has checks, every input traces to a prior output

### Planning Behavior
- No user interaction during planning — infer everything from the prompt and codebase
- If something is ambiguous, list it in `openQuestions` in `requirements.json`
- Do not over-engineer — if a task is simple, keep it simple
- The goal is convergence: each phase should bring you measurably closer to an executable plan

## Modifying an Existing Playbook

When `--update` is set:

1. Read the existing playbook at `.converge/playbooks/{name}/`
2. Check the journal for completed tasks — preserve them
3. Identify what's new or changed in the prompt
4. Add new tasks with proper dependencies on existing ones
5. Update changed tasks but preserve their ids if possible
6. Never delete completed tasks
7. Re-validate the merged plan

The scan phase should diff against the existing playbook's state, not start from scratch.

## Reference Files

Load these on demand — not all at once.

| File | When to load |
|------|-------------|
| `task-format.md` | When writing TASK.md or playbook.yml files |
| `pipeline.md` | When implementing the planning pipeline phases |
| `wbs-guide.md` | When writing WBS scripts that spawn subtasks |

**Progressive disclosure:** Load `SKILL.md` first (this file). Load reference files only when you need the detail they contain. Return here between phases.
