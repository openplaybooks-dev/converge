# Anti-Patterns Reference

Complete anti-patterns catalog for converge-planning. Read when validation flags a leaky contract, or when a forced decomposition shape leads to structural issues during planning.

---

## General Anti-Patterns

- **Pattern-first thinking** — "this looks like a Lifecycle Pipeline" before decomposing the goal. The shape should *emerge* from the goal tree, not drive it. Start with the user's goal and deliverables; recognize the shape after.
- **Middle work** — tasks whose outputs are not complete, usable deliverables. If the next task *finishes* what this task started (rather than *consuming* a complete output), you've split the workflow instead of the result. Every leaf must produce something a user could use directly.
- **Missing requirements** — proceeding to contracts without verifying every user requirement maps to at least one sub-goal. Run the requirement coverage check before writing contracts. A requirement with no mapping is a gap; a sub-goal with no requirement is scope creep.
- **Flat 30-task playbook** → top is doing everyone's job. Group by concern.
- **One-child node** → no delegation. Collapse into parent.
- **Mixed-shape siblings** → multiple concerns leaked. Split.
- **Process-stage decomposition** (`fetch → clean → analyze`, `spec → author → prompt → render`) → you split the workflow instead of the scope. Each "stage" task processes the whole population; failures re-run the whole stage. Re-decompose by *what exists when done*: one task per entity (or one seed), each owning its end-to-end mini-workflow. The verbs belong inside one task body, not as sibling task names. This is the same as the "middle work" anti-pattern.
- **5 hand-written near-copies** → use a seed template.
- **Orphan input** → upstream contract didn't deliver. Fix the chain.
- **Over-broad input (`src/**/*`)** → leaky scope. Narrow it.
- **Pasting content into a TASK.md body that another task needs** → missing artifact. Make the producer write a file; declare it as `output:` / `input:`.
- **Structured data inlined as prose** → use JSON in a file, not paragraphs in a body.
- **Hard-coding project data into a TASK.md body or `vars:`** → playbook becomes single-use. Move the data to a project file the seed reads.
- **Reaching into grandchildren during planning** → broken delegation discipline. Stop at your layer.
- **Skipping analysis on existing codebase** → planning blind.
- **No checks on a task** → no acceptance criterion. Add one.
- **Inventing facts to fill scope-packet gaps** → write Open Questions instead.

---

## Per-Shape Anti-Patterns

- **Ordered Stages for bulk replicable work.** If you have 100 scenes to generate, sequential phases at the top crush parallelism. Use Domain Split or push seed to the right layer.
- **Domain Split when deliverables are tiny.** A "per-config-file" fan-out with one-line bodies is just nesting for nesting's sake. Hand-write or move seed up a level.
- **Epoch Loop without a convergence check.** Without a stop condition, you spawn epochs forever. Define what "converged" looks like *before* writing the template.
- **Linear Pipeline when work refines.** Linear stages can't go back. If quality must improve over rounds, use Epoch Loop.
- **Creative Progression for deterministic work.** If checks are deterministic and stages are orderable, prefer Linear Pipeline — it's mechanically simpler.
