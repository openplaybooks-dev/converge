# Phases Reference

Step-by-step execution guide for converge-planning. Read during active planning when you need detailed instructions with commands.

---

## Process Overview

```
1. EXTRACT GOAL     → clear one-sentence deliverable goal
2. GATHER REQS      → exhaustive list of must-haves, should-haves, constraints, non-goals
3. DECOMPOSE        → sub-goal tree (recursive, until leaves are workable)
4. CONTRACT         → write TASK.md + playbook.yml from the goal tree
5. VALIDATE         → contract review + requirement coverage gate
```

These aren't separate phases producing separate files — they're the thinking steps you go through before writing contracts. The only files produced are the playbook structure.

---

## Step 1 — Extract Goal

Reduce the user's request to one sentence: what complete, usable thing must exist when this is done?

**Good:** "A deployed blog with post CRUD, comments, RSS feed, and responsive design."
**Bad:** "A blog." (too vague)
**Bad:** "Plan, design, implement, and test a blog." (process, not result)

If the user hasn't stated a clear goal, ask. If the goal is too broad ("Build me a SaaS platform"), narrow it with follow-up questions before proceeding.

---

## Step 2 — Gather Requirements

Extract every requirement from the user's prompt and from discovery questions. Capture them as specific, testable statements.

**Discovery questions (ask if not already answered):**

1. **Vision** — what is this project, what problem does it solve?
2. **Core features** — top 3–5, ranked by priority.
3. **User flows** — the main journey through the product.
4. **Data & APIs** — entities, external services, integrations.
5. **Constraints** — deadlines, tech stack, compliance, budget.
6. **Non-goals** — what are we explicitly NOT building? (Prevents scope creep.)

**Capture format:**

```
R1: [must] Authors can create, edit, publish, and delete posts
R2: [must] Readers can submit comments on published posts
R3: [must] RSS feed of latest published posts at /feed.xml
R4: [should] Comments support threaded replies
R5: [must] Posts support markdown with syntax highlighting
R6: [constraint] Tech stack: Node.js + PostgreSQL + React
R7: [non-goal] No user registration beyond author account
```

Tag each as `[must]`, `[should]`, `[constraint]`, or `[non-goal]`. Number them. This list is your requirement coverage checklist in later steps.

**Surfacing goals from requirements:** When the work is large, replayable, or reactive — and the user describes a measurable end state — surface these as candidate **playbook goals**. Goals are different from sub-goal deliverables:
- **Sub-goals** are things that must *exist* (a database, an API endpoint, a UI page)
- **Goals** are conditions that must be *true* (all tests pass, type checking is clean, coverage reaches 90%)

A requirement like "the codebase must have zero type errors" is a goal. It may require many sub-goal deliverables to achieve, but the goal itself is the completion condition. Goals become the `goals:` list in `playbook.yml` and drive a goal-driven epoch loop. See `references/patterns.md` § Goal-Driven Epoch Loop.

**Existing codebase?** Run these before gathering requirements:

```bash
ls package.json pyproject.toml go.mod Cargo.toml 2>/dev/null     # runtime
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | head -20    # framework
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | sort    # structure
git log --oneline -10 2>/dev/null && git status --short 2>/dev/null    # state
ls -la .converge/ 2>/dev/null    # existing converge
```

Capture tech stack, conventions, and existing state. These inform constraints but don't produce a separate deliverable file.

---

## Step 3 — Decompose into Sub-Goals

Decompose the user's goal into deliverable sub-goals. Each sub-goal is a **complete, independently verifiable result**.

### Decomposition rules

- **3–7 children per level.** Less than 3 → no real decomposition. More than 7 → group into an intermediate level.
- **Name by deliverable, not activity.** "Database schema" not "Design database." "Working API endpoints" not "Build API."
- **Each child produces a complete thing.** Not a stage of producing a thing.
- **Children form a complete cover.** Reading all children's deliverables together achieves the parent goal.

### Recursive application

For each sub-goal, ask: *can one agent produce this complete deliverable in one session?*

- **Yes** → it's a leaf. Stop decomposing.
- **No** → decompose further. Split by sub-feature, by entity, by endpoint — not by workflow stage.
- **Same shape repeats N times** → use a runtime template plus `mode: spawner` with a body that writes `$CONVERGE_TASK_DIR/spawn.plan.jsonl` (see `references/task-modes.md`).

### Requirement mapping

Before proceeding, run the requirement coverage check:

```
R1 → Sub-goal A  ✓
R2 → Sub-goal B  ✓
R3 → Sub-goal C  ✓
R4 → ???        ← GAP: add a sub-goal or expand existing scope
```

Every `[must]` requirement must map to at least one sub-goal. Unmapped requirements are gaps. Sub-goals with no mapped requirements are scope creep.

### Pattern recognition (after decomposition)

Once the goal tree exists, recognize its shape to sanity-check the design:

- Linear dependencies between sub-goals → ordered stages
- N identical sub-goals from a catalog → `mode: spawner` fan-out
- Iterative improvement until quality threshold → epoch loop
- N distinct domains with their own sub-trees → domain split

The shape confirms the decomposition; it doesn't drive it. If the shape looks wrong, the decomposition might be wrong.

---

## Step 4 — Write Contracts

Write contracts from the goal tree. Start at the root, one layer at a time.

### For each leaf task

Write `TASK.md` with:
- **title + description:** What complete deliverable this produces
- **inputs:** Files it reads (upstream outputs, project data)
- **outputs:** Specific paths for its complete deliverable
- **checks:** Deterministic verification commands (exit 0 = pass)
- **depends_on:** Tasks that must complete first
- **Skill check.** Before writing a long body, ask: does the general *how-to* for this task already exist as a skill? Is the same how-to about to repeat in another task? If yes — reference it via `skills: [<name>]` and let the body carry only what's specific to *this* invocation (the subjective request + its situational context: which name, which path, which catalog row). The methodology stays in the skill; the body stays short. If the methodology doesn't exist yet but will be reused, factor it into a new skill now. See `references/skills.md` for when to create a skill vs. inline, where it should live, and the Anthropic-compatible SKILL.md format.

### For each container task

Write `TASK.md` + `PLAN.md`. The TASK.md body describes:
1. **Decomposition** — what sub-goals exist and why
2. **Convergence** — how to integrate children's deliverables, what cross-child validation to run, what the converged output is

### Playbook-level

Write `playbook.yml` referencing top-level tasks with `depends_on` edges. Add playbook-level checks (e.g., `npx tsc --noEmit`, `npm test`).

Write the root `PLAN.md` capturing:
- **Goal:** The user's one-sentence goal
- **Decision:** Why this decomposition
- **Children:** Each top-level sub-goal with id, kind, objective, inputs, dependencies, outputs, checks
- **Requirements:** The full numbered list with sub-goal mappings
- **Open questions:** Things unknown at plan time

---

## Step 5 — Validate

Run contract review on every TASK.md. See SKILL.md §7 for the full checklist.

Key gates:
- Every output has a deterministic check
- Every input traces to an upstream output
- Every requirement maps to ≥1 task
- No middle work — every leaf produces a complete, usable deliverable
- No verb-named siblings

When validation passes, the plan is ready for `converge run`.
