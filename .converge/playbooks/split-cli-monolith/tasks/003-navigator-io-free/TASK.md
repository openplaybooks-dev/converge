---
id: 003-navigator-io-free
title: "PR3a — Make navigator I/O-free (parameterize + inject, still in-core)"
blocking: true
wbs:
  type: nodejs
  path: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js"
vars:
  taskId: 003-navigator-io-free
  title: "PR3a — Make navigator I/O-free (parameterize + inject, still in-core)"
  tier: 1 — Navigator upper-front
  task: "Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./."
  spec: "After PR2, the navigator engine files no longer import from repair actions or journal/event-writer — but they still import `Unit` from `unit/unit.ts`, `Gap`/`GapKind` from `gap/types.ts`, and `getJournalStructure` from `journal/structure.ts`. These residual couplings prevent the zero-dep claim in PR3b.\n\nThis PR makes the navigator **truly domain-agnostic** by generic parameterization + callback injection — still inside core, so the move in PR3b is a pure `git mv`.\n\n**Parameterization:**\n\nIn `navigator/types.ts`:\n```ts\nexport interface NavigatorGraph<TNode, TContext> {\n  addNode(node: GraphNode<TNode>): void;\n  getBufferedNodes(): GraphNode<TNode>[];\n  // ...\n}\n\nexport interface Snapshot<TState, TTrigger> {\n  state: TState;\n  triggers: TTrigger[];\n  iteration: number;\n  stallCount: number;\n  taskContext: TaskContext;\n}\n\nexport type ActionHandler<TState, TTrigger, TNode> =\n  (snap: Snapshot<TState, TTrigger>, graph: NavigatorGraph<TNode, unknown>) => Promise<WalkResult<TNode>>;\n```\n\n`Unit`, `Gap`, `GapKind` become **consumer-side type arguments**, not navigator imports. Call sites in `unit/run.ts` supply `Unit` and `Gap[]` as the concrete `TState`/`TTrigger`.\n\n**Callback injection (journal/structure):**\n\n`task-context.ts` currently calls `getJournalStructure()` from `journal/structure.ts`. Replace with an injected callback:\n```ts\nexport interface TaskContextDeps {\n  getJournalStructure: (epicId: string) => JournalStructure;\n}\n```\nPass via `TaskContext` constructor or navigator options. `unit/run.ts` plugs in the real `getJournalStructure`.\n\n**Grep audit — the invariant that makes PR3b real:**\n```bash\n# No imports from outside the navigator subdir\ngrep -rn \"from ['\\\"]\\\\.\\\\./\" packages/core/src/repair/navigator | grep -vE \"from ['\\\"]\\\\./\" && exit 1 || true\n\n# No imports of Unit / Gap / GapKind / journal types\ngrep -rnE \"import.*(Unit|Gap|GapKind|JournalStructure)\\\\b\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 navigator suites green (generic types don't change runtime behavior)\n- Both grep audits return clean\n- `Unit.run()` works end-to-end\n- `pnpm typecheck` + `pnpm test` green\n- No file moved; only edits in `repair/navigator/*` and `unit/run.ts`"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/003-navigator-io-free"
  itemTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item"
  wbsSection: "wbs:\n  type: nodejs\n  path: \"D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/wbs.js\""
---

# PR3a — Make navigator I/O-free (parameterize + inject, still in-core)

**Tier:** 1 — Navigator upper-front

**Summary:** Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./.

## Full specification

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

---

Runs the full pipeline: **analyze → implement → review → quality**.
