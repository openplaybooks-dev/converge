---
id: 001-analyze
title: Analyze — PR2 — Split navigator engine from repair actions (in-core)
checks:
  - id: plan-written
    description: Analysis plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/analyze/plan.md"
vars:
  taskId: 001-analyze
  parentId: 002-split-navigator-actions
  title: PR2 — Split navigator engine from repair actions (in-core)
  tier: 1 — Navigator upper-front
  task: "Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced."
  spec: "The `packages/core/src/repair/navigator/` directory mixes engine (graph, loop, predicates) with domain-specific handlers (`actions.ts`, 1236 L, 20 handlers). This PR separates those layers **inside core** so the navigator can be extracted cleanly in PR3a/PR3b.\n\n**Actions split:**\n\nSplit `repair/actions.ts` → `repair/actions/*.ts`, one handler per file (≤200 L each). Group related helpers in sibling `_helpers.ts` files. Expected handlers (verify via PR1's `action-registry-shape` test):\n- `repair-loop.ts`\n- `run-strategy.ts`\n- `detect-gaps.ts`\n- `verify.ts`\n- `signal-done.ts`\n- `check-wbs-seeded.ts`\n- `check-outputs-exist.ts`\n- `advance-attempt.ts`\n- `check-stall.ts`\n- `start-new-cycle.ts`\n- (plus any remaining from the 20-handler set)\n\n`repair/actions/index.ts` exports `buildRepairActionRegistry(): Map<string, ActionHandler>` — same public name/shape `Unit.run()` used before.\n\n**Engine isolation:**\n\nEngine files in `repair/navigator/` (`graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts`) must NOT import:\n- `repair/actions/`\n- `repair/default-graph.ts`\n- `repair/strategies/`\n- `journal/event-writer.ts`\n\n**EventSink injection:**\n\nIn `navigator/types.ts`, define:\n```ts\nexport interface EventSink {\n  emit(event: NavigatorEvent): void;\n}\nexport type NavigatorEvent = { kind: string; ts: number; [k: string]: unknown };\n```\n\nNavigator functions that currently emit events take an `eventSink: EventSink` parameter (or the `converge()` options object gains an `eventSink` field). `unit/run.ts` constructs a journal-backed sink and passes it in.\n\n**Grep audits (must pass):**\n```bash\ngrep -rn \"from.*['\\\"]\\\\.\\\\./\\\\(actions\\\\|default-graph\\\\|strategies\\\\)\" packages/core/src/repair/navigator && exit 1 || true\ngrep -rn \"from.*journal/event-writer\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 suites still green (navigator suites unchanged)\n- Each new `actions/*.ts` ≤200 lines; engine files untouched in size/behavior\n- `Unit.run()` works end-to-end on a fixture scenario (existing integration test)\n- `pnpm --filter @converge/core test` green\n- Grep audits above return clean"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/analyze"
  wbsSection: 
---

# Analyze — PR2 — Split navigator engine from repair actions (in-core)

Read the PR spec, inspect current code, and write a concrete implementation plan.

## Inputs

**PR summary:** Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced.

**Full spec:**

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

## Steps

1. **Read the spec** above carefully — it names exact file paths, line ranges, and acceptance criteria.
2. **Inspect current state:**
   - Read every file path named in the spec; note its current size, exports, imports.
   - Run `grep -rn "from.*<module>" packages/core/src` to enumerate real import sites — the spec's numbers are estimates, the grep is truth.
   - Check `git log --oneline -- <path>` for recent churn that might complicate the move.
3. **Identify risks:**
   - Cyclic imports introduced by the split
   - Public API paths that downstream packages (swebench, tbench) import from
   - Line-range drift since the spec was written — symbols may have moved
4. **Write the plan.**

## Output

Write `D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/analyze/plan.md`:

```markdown
# PR2 — Split navigator engine from repair actions (in-core) — Analysis

## Source audit
- <file>: <current lines>, <exports>, <consumers found via grep>

## Implementation plan
1. Step — what to do and why
2. Step — ...

## Risks & mitigations
- <risk>: <mitigation>

## Acceptance checklist (copy from spec)
- [ ] <criterion>
- [ ] <criterion>
```
