---
id: 002-split-navigator-actions
title: PR2 — Split navigator engine from repair actions (in-core)
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 002-split-navigator-actions
  title: PR2 — Split navigator engine from repair actions (in-core)
  tier: 1 — Navigator upper-front
  task: "Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced."
  spec: "The `packages/core/src/repair/navigator/` directory mixes engine (graph, loop, predicates) with domain-specific handlers (`actions.ts`, 1236 L, 20 handlers). This PR separates those layers **inside core** so the navigator can be extracted cleanly in PR3a/PR3b.\n\n**Actions split:**\n\nSplit `repair/actions.ts` → `repair/actions/*.ts`, one handler per file (≤200 L each). Group related helpers in sibling `_helpers.ts` files. Expected handlers (verify via PR1's `action-registry-shape` test):\n- `repair-loop.ts`\n- `run-strategy.ts`\n- `detect-gaps.ts`\n- `verify.ts`\n- `signal-done.ts`\n- `check-wbs-seeded.ts`\n- `check-outputs-exist.ts`\n- `advance-attempt.ts`\n- `check-stall.ts`\n- `start-new-cycle.ts`\n- (plus any remaining from the 20-handler set)\n\n`repair/actions/index.ts` exports `buildRepairActionRegistry(): Map<string, ActionHandler>` — same public name/shape `Unit.run()` used before.\n\n**Engine isolation:**\n\nEngine files in `repair/navigator/` (`graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts`) must NOT import:\n- `repair/actions/`\n- `repair/default-graph.ts`\n- `repair/strategies/`\n- `journal/event-writer.ts`\n\n**EventSink injection:**\n\nIn `navigator/types.ts`, define:\n```ts\nexport interface EventSink {\n  emit(event: NavigatorEvent): void;\n}\nexport type NavigatorEvent = { kind: string; ts: number; [k: string]: unknown };\n```\n\nNavigator functions that currently emit events take an `eventSink: EventSink` parameter (or the `converge()` options object gains an `eventSink` field). `unit/run.ts` constructs a journal-backed sink and passes it in.\n\n**Grep audits (must pass):**\n```bash\ngrep -rn \"from.*['\\\"]\\\\.\\\\./\\\\(actions\\\\|default-graph\\\\|strategies\\\\)\" packages/core/src/repair/navigator && exit 1 || true\ngrep -rn \"from.*journal/event-writer\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 suites still green (navigator suites unchanged)\n- Each new `actions/*.ts` ≤200 lines; engine files untouched in size/behavior\n- `Unit.run()` works end-to-end on a fixture scenario (existing integration test)\n- `pnpm --filter @converge/core test` green\n- Grep audits above return clean"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR2 — Split navigator engine from repair actions (in-core)

**Tier:** 1 — Navigator upper-front

**Summary:** Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced.

## Full specification

The `packages/core/src/repair/navigator/` directory mixes engine (graph, loop, predicates) with domain-specific handlers (`actions.ts`, 1236 L, 20 handlers). This PR separates those layers **inside core** so the navigator can be extracted cleanly in PR3a/PR3b.

**Actions split:**

Split `repair/actions.ts` → `repair/actions/*.ts`, one handler per file (≤200 L each). Group related helpers in sibling `_helpers.ts` files. Expected handlers (verify via PR1's `action-registry-shape` test):
- `repair-loop.ts`
- `run-strategy.ts`
- `detect-gaps.ts`
- `verify.ts`
- `signal-done.ts`
- `check-wbs-seeded.ts`
- `check-outputs-exist.ts`
- `advance-attempt.ts`
- `check-stall.ts`
- `start-new-cycle.ts`
- (plus any remaining from the 20-handler set)

`repair/actions/index.ts` exports `buildRepairActionRegistry(): Map<string, ActionHandler>` — same public name/shape `Unit.run()` used before.

**Engine isolation:**

Engine files in `repair/navigator/` (`graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts`) must NOT import:
- `repair/actions/`
- `repair/default-graph.ts`
- `repair/strategies/`
- `journal/event-writer.ts`

**EventSink injection:**

In `navigator/types.ts`, define:
```ts
export interface EventSink {
  emit(event: NavigatorEvent): void;
}
export type NavigatorEvent = { kind: string; ts: number; [k: string]: unknown };
```

Navigator functions that currently emit events take an `eventSink: EventSink` parameter (or the `converge()` options object gains an `eventSink` field). `unit/run.ts` constructs a journal-backed sink and passes it in.

**Grep audits (must pass):**
```bash
grep -rn "from.*['\"]\\.\\./\\(actions\\|default-graph\\|strategies\\)" packages/core/src/repair/navigator && exit 1 || true
grep -rn "from.*journal/event-writer" packages/core/src/repair/navigator && exit 1 || true
```

**Acceptance:**
- PR1 suites still green (navigator suites unchanged)
- Each new `actions/*.ts` ≤200 lines; engine files untouched in size/behavior
- `Unit.run()` works end-to-end on a fixture scenario (existing integration test)
- `pnpm --filter @converge/core test` green
- Grep audits above return clean

---

Runs the full pipeline: **analyze → implement → review → quality**.
