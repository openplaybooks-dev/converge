# Anti-Patterns

Read when validation flags a contract problem, or when decomposition reads like steps rather than a BOM.

---

## Smells that warrant stopping and reassessing

**Task level:**
- Name is a verb ("catalog", "generate") → noun (the artifact)
- Output is "half done" — next task finishes it → middle work, split differently
- 30 inputs declared → task is a container, not an artifact
- Input path not produced by any upstream output → broken chain

**Playbook level:**
- Reads like steps ("1. do X, 2. do Y") → reads like a BOM
- `tasks:` has `depends_on:` entries → `inputs:` should carry ordering, not explicit depends_on
- N tasks at root level (N > 7) → consider nested groups or spawner

**Pattern level:**
- First instinct is "nested static" → confirm child list is known at plan time
- Thinking "let me fan out" → confirm runtime data (catalog/API/user input), not just because there are many items
- Epoch loop without measurable halt → define what "converged" looks like first

---

## Contract leaks

| Smell | Fix |
|---|---|
| Verb-named task | Decompose by result, not workflow stage |
| Next task finishes this task's output | Split differently — each task owns a complete deliverable |
| Input not produced by any upstream output | Fix the chain |
| Over-broad input (`src/**`) | Narrow to specific files |
| No checks on a task | Add one — existence + format minimum |
| One-child node | No delegation happened — collapse into parent |
| Content pasted into TASK.md body | Producer writes a file; consumer reads it via `inputs:` |

---

## Structural problems

- **Process decomposition** — siblings named `fetch`, `clean`, `analyze` each process the whole population. Correct: one task per entity, each owning end-to-end.
- **Middle work** — task output is a stage, not a usable thing. The next task finishes it instead of consuming it.
- **Missing requirements** — proceeding to contracts before every requirement maps to a sub-goal.
- **Hard-coding project data** in `vars:` or task bodies — playbook becomes single-use. Move to a project file the spawner reads at runtime.
- **Reaching into grandchildren** — broken delegation. Plan one layer at a time.
