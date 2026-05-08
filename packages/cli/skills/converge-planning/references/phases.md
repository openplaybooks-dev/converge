# Phases Reference

Phase-by-phase execution guide for converge-planning. Read during active planning when you need detailed phase instructions with commands.

---

## Phase Overview

```
Phase 1 ANALYZE  → .converge/analysis.md       (codebase scan)
Phase 2 DISCOVER → .converge/requirements.md   (user needs)
Phase 3 ARCHITECT → playbook.yml + tasks/      (write contracts)
Phase 4 VALIDATE  → approved plan              (contract review)
```

---

## Phase 1 — Analyze

Scan what exists. Skip if fresh project.

```bash
ls package.json pyproject.toml go.mod Cargo.toml 2>/dev/null     # runtime
cat package.json 2>/dev/null | jq -r '.dependencies // {} | keys[]' | head -20    # framework
find . -maxdepth 2 -type d -not -path '*/node_modules/*' -not -path '*/.git/*' | sort    # structure
git log --oneline -10 2>/dev/null && git status --short 2>/dev/null    # state
ls -la .converge/ 2>/dev/null    # existing converge
```

Capture findings into `.converge/analysis.md`: tech stack, file structure, current state, conventions, external dependencies.

---

## Phase 2 — Discover

Ask the user what they want. Skip if the prompt is already specific.

1. **Vision** — what is this project, what problem does it solve?
2. **Core features** — top 3–5, ranked.
3. **User flows** — the main journey.
4. **Data & APIs** — entities, external services.
5. **Constraints** — deadlines, tech, compliance.

Capture as facts in `.converge/requirements.md`. Facts should be specific (`React 19`, not `React`), measurable (`100 concurrent users`, not `should scale`), and sourced.

---

## Phase 3 — Architect

You are the project's **top-level manager**. Your job:

1. Apply the recipe to write the top-level contracts (3–7 phase `TASK.md` files).
2. For each phase, write its `TASK.md` contract and `PLAN.md` blueprint describing its children.
3. Write `playbook.yml` referencing the top-level tasks with `depends_on` edges.
4. Add playbook-level checks (e.g., `npx tsc --noEmit`, `npm test`).

You write **only** the top-level contracts. Children's contracts are written when the container executes.

---

## Phase 4 — Validate

Contract review gate. Run the validation checklist from SKILL.md §6 on every contract before declaring the plan ready.

---

## PLAN.md Blueprint

Each container has a `PLAN.md` that describes what its children will be. It's a blueprint written during `init --from-prompt` — not a runtime artifact.

PLAN.md contains:
- **Goal** — restated in the container's own words
- **Decision** — why this container exists and what it delegates
- **Children** — the sub-tasks it will spawn (3–7 per container)
- **Each child** — `id`, `kind` (container | seed), `objective`, `inputs`, `dependencies`, `outputs`, `checks`
- **Test points** — checks that gate progression
- **Open questions** — things unknown at plan time

PLAN.md is **descriptive**, not prescriptive. It records the design intent. The runtime materializes children based on TASK.md contracts and seed scripts, not PLAN.md.
