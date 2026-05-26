# Anti-Patterns

Read when validation flags a contract problem.

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
| 30 flat sibling tasks | Group by concern; build a DAG |
| Content pasted into TASK.md body | Producer writes a file; consumer reads it via `inputs:` |

## Structural problems

- **Process decomposition** — siblings named `fetch`, `clean`, `analyze` each process the whole population. Correct: one task per entity, each owning end-to-end.
- **Middle work** — task output is a stage, not a usable thing. The next task finishes it instead of consuming it.
- **Missing requirements** — proceeding to contracts before every requirement maps to a sub-goal.
- **Hard-coding project data** in `vars:` or task bodies — playbook becomes single-use. Move to a project file the spawner reads at runtime.
- **Reaching into grandchildren** — broken delegation. Plan one layer at a time.

## Pattern problems

- **Epoch loop without a halt condition** — spawns epochs forever. Define what "converged" looks like before writing the template.
- **Domain split for tiny deliverables** — nesting for nesting's sake. Hand-write or push spawn up.
- **Ordered stages for bulk fan-out** — sequential top level crushes parallelism. Use domain split or move fan-out to the right layer.
- **Linear pipeline when work refines** — linear stages can't go back. Use epoch loop.
- **5 hand-written near-copies** — use a spawn template instead.