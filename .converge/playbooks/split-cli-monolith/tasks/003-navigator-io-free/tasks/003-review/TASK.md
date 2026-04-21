---
id: 003-review
title: "Review — PR3a — Make navigator I/O-free (parameterize + inject, still in-core)"
checks:
  - id: review-approved
    description: Code review passed
    cmd: "grep -q 'APPROVED' D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/review/report.md"
vars:
  taskId: 003-review
  parentId: 003-navigator-io-free
  title: "PR3a — Make navigator I/O-free (parameterize + inject, still in-core)"
  tier: 1 — Navigator upper-front
  task: "Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./."
  spec: "After PR2, the navigator engine files no longer import from repair actions or journal/event-writer — but they still import `Unit` from `unit/unit.ts`, `Gap`/`GapKind` from `gap/types.ts`, and `getJournalStructure` from `journal/structure.ts`. These residual couplings prevent the zero-dep claim in PR3b.\n\nThis PR makes the navigator **truly domain-agnostic** by generic parameterization + callback injection — still inside core, so the move in PR3b is a pure `git mv`.\n\n**Parameterization:**\n\nIn `navigator/types.ts`:\n```ts\nexport interface NavigatorGraph<TNode, TContext> {\n  addNode(node: GraphNode<TNode>): void;\n  getBufferedNodes(): GraphNode<TNode>[];\n  // ...\n}\n\nexport interface Snapshot<TState, TTrigger> {\n  state: TState;\n  triggers: TTrigger[];\n  iteration: number;\n  stallCount: number;\n  taskContext: TaskContext;\n}\n\nexport type ActionHandler<TState, TTrigger, TNode> =\n  (snap: Snapshot<TState, TTrigger>, graph: NavigatorGraph<TNode, unknown>) => Promise<WalkResult<TNode>>;\n```\n\n`Unit`, `Gap`, `GapKind` become **consumer-side type arguments**, not navigator imports. Call sites in `unit/run.ts` supply `Unit` and `Gap[]` as the concrete `TState`/`TTrigger`.\n\n**Callback injection (journal/structure):**\n\n`task-context.ts` currently calls `getJournalStructure()` from `journal/structure.ts`. Replace with an injected callback:\n```ts\nexport interface TaskContextDeps {\n  getJournalStructure: (epicId: string) => JournalStructure;\n}\n```\nPass via `TaskContext` constructor or navigator options. `unit/run.ts` plugs in the real `getJournalStructure`.\n\n**Grep audit — the invariant that makes PR3b real:**\n```bash\n# No imports from outside the navigator subdir\ngrep -rn \"from ['\\\"]\\\\.\\\\./\" packages/core/src/repair/navigator | grep -vE \"from ['\\\"]\\\\./\" && exit 1 || true\n\n# No imports of Unit / Gap / GapKind / journal types\ngrep -rnE \"import.*(Unit|Gap|GapKind|JournalStructure)\\\\b\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 navigator suites green (generic types don't change runtime behavior)\n- Both grep audits return clean\n- `Unit.run()` works end-to-end\n- `pnpm typecheck` + `pnpm test` green\n- No file moved; only edits in `repair/navigator/*` and `unit/run.ts`"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/003-navigator-io-free"
  phaseTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/review"
  wbsSection: 
---

# Code review — PR3a — Make navigator I/O-free (parameterize + inject, still in-core)

Review the diff against the PR spec and acceptance criteria.

## Inputs

- **PR summary:** Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./.
- **Full spec:**

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

- Analysis: `D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/analyze/plan.md`
- Implementation plan: `D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/implement/plan.md`

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

Write `D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/review/report.md`:
- If acceptable: `APPROVED` on its own line, followed by brief notes.
- If not: `REJECTED` on its own line, followed by specific, actionable feedback so the implement phase knows what to fix.
