---
id: 003-verify
title: Verify implementation — PR2 — Split navigator engine from repair actions (in-core)
checks:
  - id: typecheck
    description: Zero type errors
    cmd: "cd D:/converge && pnpm typecheck 2>&1 | grep -c 'error TS' | xargs test 0 -eq"
  - id: tests
    description: Tests pass
    cmd: "cd D:/converge && pnpm test 2>&1 | tail -1"
vars:
  taskId: 003-verify
  title: PR2 — Split navigator engine from repair actions (in-core)
  task: "Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced."
  spec: "The `packages/core/src/repair/navigator/` directory mixes engine (graph, loop, predicates) with domain-specific handlers (`actions.ts`, 1236 L, 20 handlers). This PR separates those layers **inside core** so the navigator can be extracted cleanly in PR3a/PR3b.\n\n**Actions split:**\n\nSplit `repair/actions.ts` → `repair/actions/*.ts`, one handler per file (≤200 L each). Group related helpers in sibling `_helpers.ts` files. Expected handlers (verify via PR1's `action-registry-shape` test):\n- `repair-loop.ts`\n- `run-strategy.ts`\n- `detect-gaps.ts`\n- `verify.ts`\n- `signal-done.ts`\n- `check-wbs-seeded.ts`\n- `check-outputs-exist.ts`\n- `advance-attempt.ts`\n- `check-stall.ts`\n- `start-new-cycle.ts`\n- (plus any remaining from the 20-handler set)\n\n`repair/actions/index.ts` exports `buildRepairActionRegistry(): Map<string, ActionHandler>` — same public name/shape `Unit.run()` used before.\n\n**Engine isolation:**\n\nEngine files in `repair/navigator/` (`graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts`) must NOT import:\n- `repair/actions/`\n- `repair/default-graph.ts`\n- `repair/strategies/`\n- `journal/event-writer.ts`\n\n**EventSink injection:**\n\nIn `navigator/types.ts`, define:\n```ts\nexport interface EventSink {\n  emit(event: NavigatorEvent): void;\n}\nexport type NavigatorEvent = { kind: string; ts: number; [k: string]: unknown };\n```\n\nNavigator functions that currently emit events take an `eventSink: EventSink` parameter (or the `converge()` options object gains an `eventSink` field). `unit/run.ts` constructs a journal-backed sink and passes it in.\n\n**Grep audits (must pass):**\n```bash\ngrep -rn \"from.*['\\\"]\\\\.\\\\./\\\\(actions\\\\|default-graph\\\\|strategies\\\\)\" packages/core/src/repair/navigator && exit 1 || true\ngrep -rn \"from.*journal/event-writer\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 suites still green (navigator suites unchanged)\n- Each new `actions/*.ts` ≤200 lines; engine files untouched in size/behavior\n- `Unit.run()` works end-to-end on a fixture scenario (existing integration test)\n- `pnpm --filter @converge/core test` green\n- Grep audits above return clean"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/verify"
  wbsSection: 
---

# Verify implementation — PR2 — Split navigator engine from repair actions (in-core)

Quick verification that the PR's implementation doesn't break the build or tests.

## Steps

1. `cd D:/converge && pnpm typecheck` — fix any type errors introduced by this PR.
2. `cd D:/converge && pnpm test` — fix any test failures introduced by this PR.
3. If fixes are needed, apply them directly. Don't just report — converge.
