# Example: Planning Playbook

A meta-playbook that generates other playbooks. Give it a prompt and it
auto-scans your project, decomposes requirements into delegated subtasks,
and emits a runnable playbook.

## Structure

```
.harness/playbooks/plan/
├── playbook.yml                    ← inputs (prompt, name, update), keyed on name
└── tasks/
    ├── TASK.md                     ← root task with wbs: in frontmatter
    ├── wbs.js                      ← main pipeline generator
    ├── decompose-epics-wbs.js      ← reads outline, spawns per-epic subtasks
    └── deepen-tasks-wbs.js         ← reads plan, conditionally sub-decomposes
```

## Pipeline

The main WBS spawns a multi-phase pipeline where **decomposition is delegated**:

```
000-setup-skills   → install harness-planning skill to .harness/skills
001-scan           → auto-scan cwd for tech stack, structure, state
002-research       → parse prompt into structured requirements
003-outline        → identify epics (high-level, no task details)
003-decompose      → WBS parent: spawns one subtask per epic
  003-001-<epic>   →   detail-decompose epic into tasks
  003-002-<epic>   →   detail-decompose epic into tasks
  ...
003-merge          → combine all epic plans into plan.json
003-deepen         → WBS parent (conditional): if any task is too complex,
  003-d-001-*      →   spawns sub-decomposition subtask per oversized task
  003-d-002-*      →   (zero subtasks if nothing needs deepening)
  ...
003-finalize       → merge deepening results into final plan.json
004-validate       → verify completeness and consistency
005-emit           → write playbook files to .harness/playbooks/<name>/
```

**Key pattern:** parent scans N items, delegates each to a subtask. This means
each epic gets its own AI execution context and can flag tasks that need further
decomposition — making planning self-decomposable to any depth.

## Usage

```bash
# Generate a new playbook from a prompt
harness plan --prompt "Build a todo app with auth and real-time sync"

# Generate with a specific name
harness plan --prompt "Add dark mode" --name dark-mode

# Update an existing playbook with new requirements
harness plan --prompt "Add offline support" --name my-app --update
```

## What Happens

1. `wbs.js` spawns the full pipeline
2. `000-setup-skills` installs harness-planning skill into `.harness/skills/`
3. `001-scan` reads your project files, detects stack, maps structure
3. `002-research` parses your prompt into features, constraints, facts
4. `003-outline` identifies 3-7 epics with complexity estimates
5. `003-decompose` reads the outline and spawns one subtask per epic:
   - Each subtask detail-decomposes its epic into 3-7 tasks
   - If a task is too complex, the subtask flags it for deepening
6. `003-merge` combines all per-epic plans into a single plan.json
7. `003-deepen` checks if any tasks were flagged — if yes, spawns
   sub-decomposition subtasks (one per oversized task). If no, skips.
8. `003-finalize` merges deepening results back into plan.json
9. `004-validate` checks completeness, no broken deps, full coverage
10. `005-emit` writes the playbook to `.harness/playbooks/<name>/`

After completion:

```bash
harness run --playbook=<name>
```

## Self-Decomposable Planning

The planning pipeline handles projects of any complexity:

- **Small project** (< 5 features): 2-3 epics, no deepening needed
- **Medium project** (5-15 features): 4-6 epics, some tasks may need deepening
- **Large project** (15+ features): 6-7 epics, multiple tasks flagged for
  sub-decomposition, WBS scripts generated for repetitive work

The deepening phase is conditional — it only spawns subtasks when the AI
decomposer flags tasks as too complex. Each round of deepening can itself
identify further complexity, but in practice 1-2 rounds is sufficient.

## Continuous Planning

Re-run with `--update` to refine an existing plan:

```bash
harness plan --prompt "Build a dashboard" --name dashboard
harness run --playbook=dashboard          # start building
harness plan --prompt "Add export feature" --name dashboard --update
harness run --playbook=dashboard          # resumes with new tasks
```

Each update re-scans the project (picks up new code), merges new requirements,
and adds tasks without destroying existing progress.
