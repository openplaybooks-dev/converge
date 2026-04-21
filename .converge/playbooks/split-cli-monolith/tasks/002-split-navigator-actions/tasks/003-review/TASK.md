---
id: 003-review
title: Review — PR2 — Split navigator engine from repair actions (in-core)
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/review/report.md"
vars:
  taskId: 003-review
  parentId: 002-split-navigator-actions
  title: PR2 — Split navigator engine from repair actions (in-core)
  tier: 1 — Navigator upper-front
  task: "Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced."
  spec: "The `packages/core/src/repair/navigator/` directory mixes engine (graph, loop, predicates) with domain-specific handlers (`actions.ts`, 1236 L, 20 handlers). This PR separates those layers **inside core** so the navigator can be extracted cleanly in PR3a/PR3b.\n\n**Actions split:**\n\nSplit `repair/actions.ts` → `repair/actions/*.ts`, one handler per file (≤200 L each). Group related helpers in sibling `_helpers.ts` files. Expected handlers (verify via PR1's `action-registry-shape` test):\n- `repair-loop.ts`\n- `run-strategy.ts`\n- `detect-gaps.ts`\n- `verify.ts`\n- `signal-done.ts`\n- `check-wbs-seeded.ts`\n- `check-outputs-exist.ts`\n- `advance-attempt.ts`\n- `check-stall.ts`\n- `start-new-cycle.ts`\n- (plus any remaining from the 20-handler set)\n\n`repair/actions/index.ts` exports `buildRepairActionRegistry(): Map<string, ActionHandler>` — same public name/shape `Unit.run()` used before.\n\n**Engine isolation:**\n\nEngine files in `repair/navigator/` (`graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts`) must NOT import:\n- `repair/actions/`\n- `repair/default-graph.ts`\n- `repair/strategies/`\n- `journal/event-writer.ts`\n\n**EventSink injection:**\n\nIn `navigator/types.ts`, define:\n```ts\nexport interface EventSink {\n  emit(event: NavigatorEvent): void;\n}\nexport type NavigatorEvent = { kind: string; ts: number; [k: string]: unknown };\n```\n\nNavigator functions that currently emit events take an `eventSink: EventSink` parameter (or the `converge()` options object gains an `eventSink` field). `unit/run.ts` constructs a journal-backed sink and passes it in.\n\n**Grep audits (must pass):**\n```bash\ngrep -rn \"from.*['\\\"]\\\\.\\\\./\\\\(actions\\\\|default-graph\\\\|strategies\\\\)\" packages/core/src/repair/navigator && exit 1 || true\ngrep -rn \"from.*journal/event-writer\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 suites still green (navigator suites unchanged)\n- Each new `actions/*.ts` ≤200 lines; engine files untouched in size/behavior\n- `Unit.run()` works end-to-end on a fixture scenario (existing integration test)\n- `pnpm --filter @converge/core test` green\n- Grep audits above return clean"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR2 — Split navigator engine from repair actions (in-core)

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Inside core/src/repair/: navigator engine files stop importing from repair/actions/ or journal. actions.ts splits into repair/actions/*.ts. EventSink interface introduced.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/implement/plan.md`

## Review criteria

1. **Alignment** — does the diff match the spec? Files named in the spec should be the only files changed (plus strictly required import updates). If scope drifted, **REJECT**.
2. **Acceptance criteria** — every bullet in the spec's Acceptance block must be satisfied. If not, REJECT.
3. **Behavior-locking tests (PR1)** — still green? If a move/split broke them, the split is wrong, REJECT.
4. **No shims** — the user explicitly chose hard breaks for public exports (PR4, PR13). If a re-export shim was added "for safety", REJECT.
5. **Line limits** — for split PRs (3, 5, 6, 9), every new file ≤500 lines. If any file is larger, REJECT.
6. **Layering (CRITICAL for Tier B, PR10–PR13)** — `@converge/core` is the programmatic interface; `@converge/cli` is the terminal-facing shell; a future web UI must be able to integrate directly with `core` without touching `cli` or `display`. Run these audits and **REJECT** on any hit:
   - `grep -rn "@converge/display\|@converge/cli" packages/core/src` → no matches (core never imports CLI-layer packages)
   - `grep -n "@converge/display\|@converge/cli" packages/core/package.json` → no matches
   - `grep -rn "process\.exit\|process\.stdout\.write\|process\.stderr\.write" packages/core/src` → no matches
   - `grep -rn "console\.\(log\|error\|warn\|info\)" packages/core/src | grep -v ".test.ts"` → no matches
   - `grep -rn "@converge/display" packages/scheduler/src packages/journal/src 2>/dev/null` → no matches
7. **Style** — matches existing codebase conventions.

## Steps

1. `git diff --stat` — confirm only spec-scoped files changed.
2. `git diff` — read the full diff.
3. Re-run `pnpm test` to confirm green.
4. Compare diff against each Acceptance bullet.

## Output

Write `D:/converge/.converge/artifacts/split-cli/002-split-navigator-actions/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
