---
id: 001-execute
title: "Execute: Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./."
---

Implement the PR.

**Summary:** Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./.

**Spec:**
After PR2, the navigator engine files no longer import from repair actions or journal/event-writer — but they still import `Unit` from `unit/unit.ts`, `Gap`/`GapKind` from `gap/types.ts`, and `getJournalStructure` from `journal/structure.ts`. These residual couplings prevent the zero-dep claim in PR3b.

This PR makes the navigator **truly domain-agnostic** by generic parameterization + callback injection — still inside core, so the move in PR3b is a pure `git mv`.

**Parameterization:**

In `navigator/types.ts`:
```ts
export interface NavigatorGraph<TNode, TContext> {
  addNode(node: GraphNode<TNode>): void;
  getBufferedNodes(): GraphNode<TNode>[];
  // ...
}

export interface Snapshot<TState, TTrigger> {
  state: TState;
  triggers: TTrigger[];
  iteration: number;
  stallCount: number;
  taskContext: TaskContext;
}

export type ActionHandler<TState, TTrigger, TNode> =
  (snap: Snapshot<TState, TTrigger>, graph: NavigatorGraph<TNode, unknown>) => Promise<WalkResult<TNode>>;
```

`Unit`, `Gap`, `GapKind` become **consumer-side type arguments**, not navigator imports. Call sites in `unit/run.ts` supply `Unit` and `Gap[]` as the concrete `TState`/`TTrigger`.

**Callback injection (journal/structure):**

`task-context.ts` currently calls `getJournalStructure()` from `journal/structure.ts`. Replace with an injected callback:
```ts
export interface TaskContextDeps {
  getJournalStructure: (epicId: string) => JournalStructure;
}
```
Pass via `TaskContext` constructor or navigator options. `unit/run.ts` plugs in the real `getJournalStructure`.

**Grep audit — the invariant that makes PR3b real:**
```bash
# No imports from outside the navigator subdir
grep -rn "from ['\"]\\.\\./" packages/core/src/repair/navigator | grep -vE "from ['\"]\\./" && exit 1 || true

# No imports of Unit / Gap / GapKind / journal types
grep -rnE "import.*(Unit|Gap|GapKind|JournalStructure)\\b" packages/core/src/repair/navigator && exit 1 || true
```

**Acceptance:**
- PR1 navigator suites green (generic types don't change runtime behavior)
- Both grep audits return clean
- `Unit.run()` works end-to-end
- `pnpm typecheck` + `pnpm test` green
- No file moved; only edits in `repair/navigator/*` and `unit/run.ts`

**Analysis:** `D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/analyze/plan.md`
