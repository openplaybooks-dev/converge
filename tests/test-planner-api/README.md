# test-planner-api

End-to-end test of the `core.plan(...)` verb. Runs the full planner-playbook with a **stubbed agent** so the analyze step writes a deterministic `PLAN.md` instead of calling a real LLM. Verifies the event shape the planner-app integration depends on.

## Why this exists

The planner app's "Plan new" tab calls `POST /api/playbooks/plan`, which calls `core.plan(...)` in-process and streams `RunEvent`s back as NDJSON. The app's `runPlanner` (`apps/planner/src/lib/planner-stream.ts`) reads those events and drives the `PlanningConsole` UI.

For the app integration to work, `core.plan(...)` needs to emit:

1. One `task-start` / `task-complete` pair per planner phase (so `PlanningConsole` advances through `enrich-requirements → design-document → plan-tasks`).
2. A `children-spawned` event during the `parse-plan` phase carrying the drafted children, so `PlanReview` can render the new playbook's task list.
3. A `run-complete` at the end so the UI flips to the review surface.

This script asserts all of that, end-to-end, against the published `dist/` bundle.

## What the stub agent does

The real `runAnalyze` calls `agentfn(...)` with instructions that tell an LLM to write `PLAN.md` to disk. The stub replaces that — it ignores the prompt and writes a fixed `PLAN.md`:

```yaml
---
kind: container
children:
  - id: 01-requirements
    kind: executable
    title: Capture requirements
  - id: 02-architecture
    kind: container
    title: Design the architecture
  - id: 03-implementation
    kind: seed
    title: Generate implementation
---

# Goal

Build a baby tracker app …
```

So the test is fully deterministic: same input goal → same on-disk tree → same event sequence.

## Run it

```bash
pnpm --filter @converge/core build
pnpm --filter @converge-example/test-planner-api test
```

You should see something like:

```
[1/5] Calling core.plan() with a stub agent…
       outputDir: .converge/playbooks/test-baby-tracker
[2/5] Asserting RunResult shape…
       runId: 2026-…  completed: 4  failed: 0
[3/5] Asserting event sequence the app depends on…
       4 task-start / 4 task-complete pairs ✓
       1 children-spawned with 3 drafted children ✓
       run-complete present ✓
[4/5] Asserting on-disk artifacts…
       playbook.yml ✓
       PLAN.md ✓
       tasks/01-requirements/TASK.md ✓
       tasks/02-architecture/TASK.md + PLAN.md ✓
       seeds/03-implementation/SEED.md + index.js ✓
[5/5] Round-trip: load the produced playbook…
       loadPlaybookFromFolder reads 2 tasks (seeds excluded from playbook.yml) ✓

✅ All planner-API smoke checks passed.
```

## App integration handoff

After this test passes, the planner app is ready to swap from its mock to the real planner:

- **Inputs** the app already provides: `goal`, optional `name`.
- **Streaming events** the app's `runPlanner` already maps:
  - `task-start: scaffold-root` → `phase-start: enrich-requirements`
  - `task-start: analyze` → `phase-start: design-document`
  - `task-start: parse-plan` / `materialize-children` → `phase-start: plan-tasks`
  - `children-spawned` → `task-draft` (one per child, populates `PlanReview`)
  - `run-complete` → `plan-ready` (UI flips to the review surface)
- **Outputs**: a real `.converge/playbooks/<slug>/` directory the app can immediately load with `loadPlaybookFromFolder` and run with `core.run(...)`.

If you change the planner's task list or the `PLAN.md` schema, run this test first — it's the contract the app relies on.
