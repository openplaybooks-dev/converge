---
id: 015-split-navigator-from-actions
title: PR15 — Split navigator engine from repair actions
blocking: true
wbs:
  type: nodejs
  path: ./wbs.js
vars:
  taskId: 015-split-navigator-from-actions
  title: PR15 — Split navigator engine from repair actions
  tier: C
  task: "Within core: separate the domain-agnostic engine (graph, loop, predicates) from the repair-specific 20-handler registry. Prepares the clean extraction boundary."
  spec: "The navigator directory currently mixes two layers:\n\n- **Engine (domain-agnostic):** `graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts` — the reactive JIT-buffered node engine. Candidate for `@converge/navigator` in PR16.\n- **Repair actions (domain-specific):** `actions.ts` (1236L, 20 handlers), `default-graph.ts` (JIT node builders wired to repair's gap/unit types) — these stay in core because they import executors, strategy catalog, gap detection, skills.\n\nThis PR splits those layers *inside core* so PR16 can move the engine cleanly.\n\n**New layout inside `packages/core/src/repair/`:**\n\n```\nrepair/\n  navigator/              # engine (stays until PR16 moves it out)\n    graph.ts\n    types.ts\n    navigator.ts\n    predicates.ts\n    task-context.ts\n    index.ts              # barrel for engine-only exports\n  actions/                # NEW — repair-specific handlers, split from actions.ts\n    index.ts              # buildRepairActionRegistry(): Map<string, ActionHandler>\n    detect-gaps.ts\n    repair-loop.ts\n    run-strategy.ts\n    verify.ts\n    signal-done.ts\n    check-wbs-seeded.ts\n    check-outputs-exist.ts\n    advance-attempt.ts\n    check-stall.ts\n    start-new-cycle.ts\n    ...                   # one file per handler; group related helpers\n  default-graph.ts        # stays — repair's node-builder strategy (preflight/response/post-action)\n```\n\n**Rules:**\n- The `navigator/` engine files must not import anything from `repair/actions/` or `repair/default-graph.ts`. Invert: the engine exposes extension points (`ActionHandler`, `Graph`, node builder callbacks); repair plugs in.\n- `actions/index.ts` exports `buildRepairActionRegistry()` — same public name/shape `Unit.run()` used before.\n- `actions/*.ts` individual files: one handler per file, each ≤200 lines. If a handler exceeds 200 lines, factor helpers into sibling `_helpers.ts` files inside `actions/`.\n- Handlers keep their current lazy/dynamic imports of executors and strategy catalog — those stay in core.\n- Event writer coupling: if `navigator.ts` currently imports `../../journal/event-writer.ts` directly, **invert it** — navigator emits events via an injected `EventSink` interface defined in `navigator/types.ts`; `Unit.run()` passes a journal-backed sink. This is the last coupling that would otherwise block PR16.\n\n**Import-site updates:**\n- `packages/core/src/unit/run.ts` — update navigator imports to `../repair/navigator` (barrel) and action registry import to `../repair/actions`. Wire the event sink.\n- `packages/core/src/config/task-definition.ts` — type-only reference to `converge()`; update import path if needed.\n\n**Grep audits (post-split):**\n```bash\n# Engine must not import repair-specific layers\ngrep -rn \"from.*['\\\"]\\.\\./\\(actions\\|default-graph\\)\" packages/core/src/repair/navigator && exit 1 || true\n\n# Engine must not import journal directly (use injected EventSink)\ngrep -rn \"from.*journal/event-writer\" packages/core/src/repair/navigator && exit 1 || true\n\n# Actions must still register exactly the historical handler names\nnode -e \"import('./packages/core/dist/repair/actions/index.js').then(m=>{const reg=m.buildRepairActionRegistry();const expected=['repair-loop','run-strategy','detect-gaps','verify','signal-done','check-wbs-seeded','check-outputs-exist','advance-attempt','check-stall','start-new-cycle'];for(const n of expected){if(!reg.has(n))throw new Error('missing handler: '+n)}console.log('OK',reg.size,'handlers')})\"\n```\n\n(Adjust the handler-name list during PR14 analysis against the real `buildActionRegistry` output — use the PR14 `action-registry-shape.test.ts` result as ground truth.)\n\n**Acceptance:**\n- PR14 suites still green\n- No engine file imports from `repair/actions/` or `repair/default-graph.ts` or `journal/event-writer.ts`\n- Each file in `actions/` ≤200 lines; engine files ≤500 lines\n- `Unit.run()` still works end-to-end (run a scenario fixture with a trivial gap → strategy → resolved, verify via integration test)\n- `pnpm typecheck` + `pnpm test` green"
  projectDir: "D:\\converge"
  artifactsDir: "D:\\converge\\.converge\\artifacts\\split-cli\\015-split-navigator-from-actions"
  itemTemplateDir: "D:\\converge\\.converge\\playbooks\\split-cli-monolith\\wbs\\templates\\item"
---

# PR15 — Split navigator engine from repair actions

**Tier:** C

**Summary:** Within core: separate the domain-agnostic engine (graph, loop, predicates) from the repair-specific 20-handler registry. Prepares the clean extraction boundary.

## Full specification

The navigator directory currently mixes two layers:

- **Engine (domain-agnostic):** `graph.ts`, `types.ts`, `navigator.ts`, `predicates.ts`, `task-context.ts` — the reactive JIT-buffered node engine. Candidate for `@converge/navigator` in PR16.
- **Repair actions (domain-specific):** `actions.ts` (1236L, 20 handlers), `default-graph.ts` (JIT node builders wired to repair's gap/unit types) — these stay in core because they import executors, strategy catalog, gap detection, skills.

This PR splits those layers *inside core* so PR16 can move the engine cleanly.

**New layout inside `packages/core/src/repair/`:**

```
repair/
  navigator/              # engine (stays until PR16 moves it out)
    graph.ts
    types.ts
    navigator.ts
    predicates.ts
    task-context.ts
    index.ts              # barrel for engine-only exports
  actions/                # NEW — repair-specific handlers, split from actions.ts
    index.ts              # buildRepairActionRegistry(): Map<string, ActionHandler>
    detect-gaps.ts
    repair-loop.ts
    run-strategy.ts
    verify.ts
    signal-done.ts
    check-wbs-seeded.ts
    check-outputs-exist.ts
    advance-attempt.ts
    check-stall.ts
    start-new-cycle.ts
    ...                   # one file per handler; group related helpers
  default-graph.ts        # stays — repair's node-builder strategy (preflight/response/post-action)
```

**Rules:**
- The `navigator/` engine files must not import anything from `repair/actions/` or `repair/default-graph.ts`. Invert: the engine exposes extension points (`ActionHandler`, `Graph`, node builder callbacks); repair plugs in.
- `actions/index.ts` exports `buildRepairActionRegistry()` — same public name/shape `Unit.run()` used before.
- `actions/*.ts` individual files: one handler per file, each ≤200 lines. If a handler exceeds 200 lines, factor helpers into sibling `_helpers.ts` files inside `actions/`.
- Handlers keep their current lazy/dynamic imports of executors and strategy catalog — those stay in core.
- Event writer coupling: if `navigator.ts` currently imports `../../journal/event-writer.ts` directly, **invert it** — navigator emits events via an injected `EventSink` interface defined in `navigator/types.ts`; `Unit.run()` passes a journal-backed sink. This is the last coupling that would otherwise block PR16.

**Import-site updates:**
- `packages/core/src/unit/run.ts` — update navigator imports to `../repair/navigator` (barrel) and action registry import to `../repair/actions`. Wire the event sink.
- `packages/core/src/config/task-definition.ts` — type-only reference to `converge()`; update import path if needed.

**Grep audits (post-split):**
```bash
# Engine must not import repair-specific layers
grep -rn "from.*['\"]\.\./\(actions\|default-graph\)" packages/core/src/repair/navigator && exit 1 || true

# Engine must not import journal directly (use injected EventSink)
grep -rn "from.*journal/event-writer" packages/core/src/repair/navigator && exit 1 || true

# Actions must still register exactly the historical handler names
node -e "import('./packages/core/dist/repair/actions/index.js').then(m=>{const reg=m.buildRepairActionRegistry();const expected=['repair-loop','run-strategy','detect-gaps','verify','signal-done','check-wbs-seeded','check-outputs-exist','advance-attempt','check-stall','start-new-cycle'];for(const n of expected){if(!reg.has(n))throw new Error('missing handler: '+n)}console.log('OK',reg.size,'handlers')})"
```

(Adjust the handler-name list during PR14 analysis against the real `buildActionRegistry` output — use the PR14 `action-registry-shape.test.ts` result as ground truth.)

**Acceptance:**
- PR14 suites still green
- No engine file imports from `repair/actions/` or `repair/default-graph.ts` or `journal/event-writer.ts`
- Each file in `actions/` ≤200 lines; engine files ≤500 lines
- `Unit.run()` still works end-to-end (run a scenario fixture with a trivial gap → strategy → resolved, verify via integration test)
- `pnpm typecheck` + `pnpm test` green

---

Runs the full pipeline: **analyze → implement → review → quality**.
