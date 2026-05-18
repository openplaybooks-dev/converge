# test-planner-app-flow

End-to-end smoke test of the planner app's "Plan new" flow, exercised against the public `@openplaybooks/converge-core` primitives the app's Route Handlers use internally. Uses a stub agent so it runs offline.

## What this verifies

The planner app's `runPlanner` (in `apps/planner/src/lib/planner-stream.ts`) does this:

1. POST `/api/playbooks/plan` (the route calls `core.plan(...)`).
2. Stream NDJSON `RunEvent`s back to the UI.
3. After `run-complete`, GET `/api/playbooks/[slug]/contract-tree` to materialize the produced playbook into a `DraftPlan`.
4. Hand `{ slug, plan }` back to `PlanNewTab` so Approve becomes a tab switch.

This script exercises the same chain, against the published `dist/` bundle:

1. Calls `core.plan(...)` with a stubbed agent.
2. Confirms the produced playbook directory has the expected on-disk shape.
3. Loads it back via `loadPlaybookFromFolder` (the same primitive the contract-tree route uses internally).
4. Confirms the slug derivation in `slugifyPrompt` (re-implemented client-side in `planner-stream.ts`) matches what the planner actually wrote.
5. Confirms a follow-up DELETE-equivalent (`fs.rm -r`) cleans up.

## Run it

```bash
pnpm --filter @openplaybooks/converge-core build
pnpm --filter @openplaybooks-example/test-planner-app-flow test
```

## Why not boot the actual app?

The route handlers (`/api/playbooks/plan/route.ts`, `/api/playbooks/[name]/contract-tree/route.ts`) are thin wrappers around `core.plan(...)` and `loadPlaybookFromFolder(...)`. Testing them against a real Next.js server would catch routing-layer bugs but is overkill for verifying "the app's plumbing works." This test checks the **contract** — same primitives, same on-disk shape, same slug derivation. If this passes, the app's POST `/api/playbooks/plan` will also succeed.

For a true HTTP-level test, run `pnpm --filter @openplaybooks/planner dev` and exercise the UI manually.
