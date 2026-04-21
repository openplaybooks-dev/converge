---
id: 001-plan
title: Plan implementation — PR2 — Split navigator engine from repair actions (in-core)
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/implement/plan.md"
vars:
  taskId: 001-plan
  title: PR2 — Split navigator engine from repair actions (in-core)
  task: "Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced."
  spec: "The `packages/core/src/repair/navigator/` directory mixes engine (graph, loop, predicates) with domain-specific handlers (`actions.ts`, 1236 L, 20 handlers). This PR separates those layers **inside core** so the navigator can be extracted cleanly in PR3a/PR3b.\n\n**Actions split:**\n\nSplit `repair/actions.ts` → `repair/actions/*.ts`, one handler per file (≤200 L each). Group related helpers in sibling `_helpers.ts` files. Expected handlers (verify via PR1's `action-registry-shape` test):\n- `repair-loop.ts`\n- `run-strategy.ts`\n- `detect-gaps.ts`\n- `verify.ts`\n- `signal-done.ts`\n- `check-wbs-seeded.ts`\n- `check-outputs-exist.ts`\n- `advance-attempt.ts`\n- `check-stall.ts`\n- `start-new-cycle.ts`\n- (plus any remaining from the 20-handler set)\n\n`repair/actions/index.ts` exports `buildRepairActionRegistry(): Map<string, ActionHandler>` — same public name/shape `Unit.run()` used before.\n\n**Engine isolation:**\n\nEngine files in `repair/navigator/` (`graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts`) must NOT import:\n- `repair/actions/`\n- `repair/default-graph.ts`\n- `repair/strategies/`\n- `journal/event-writer.ts`\n\n**EventSink injection:**\n\nIn `navigator/types.ts`, define:\n```ts\nexport interface EventSink {\n  emit(event: NavigatorEvent): void;\n}\nexport type NavigatorEvent = { kind: string; ts: number; [k: string]: unknown };\n```\n\nNavigator functions that currently emit events take an `eventSink: EventSink` parameter (or the `converge()` options object gains an `eventSink` field). `unit/run.ts` constructs a journal-backed sink and passes it in.\n\n**Grep audits (must pass):**\n```bash\ngrep -rn \"from.*['\\\"]\\\\.\\\\./\\\\(actions\\\\|default-graph\\\\|strategies\\\\)\" packages/core/src/repair/navigator && exit 1 || true\ngrep -rn \"from.*journal/event-writer\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 suites still green (navigator suites unchanged)\n- Each new `actions/*.ts` ≤200 lines; engine files untouched in size/behavior\n- `Unit.run()` works end-to-end on a fixture scenario (existing integration test)\n- `pnpm --filter @converge/core test` green\n- Grep audits above return clean"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR2 — Split navigator engine from repair actions (in-core)

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/implement/plan.md`:

```markdown
# PR2 — Split navigator engine from repair actions (in-core) — Implementation Plan

## Summary
<one line>

## Changes (ordered)
1. File: `packages/core/src/...` — <create | move | edit | delete>; what
2. File: `packages/core/src/...` — ...

## Order of Operations
1. Do X first because Y depends on it
2. Then Z

## Post-change verification commands
- `pnpm --filter @converge/core build`
- `pnpm --filter @converge/core test`
- <any smoke checks specific to this PR>
```
