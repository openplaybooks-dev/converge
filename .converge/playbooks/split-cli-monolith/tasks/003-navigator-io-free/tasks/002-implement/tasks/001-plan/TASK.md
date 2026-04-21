---
id: 001-plan
title: "Plan implementation — PR3a — Make navigator I/O-free (parameterize + inject, still in-core)"
checks:
  - id: impl-plan-written
    description: Implementation plan exists
    cmd: "test -f D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/implement/plan.md"
vars:
  taskId: 001-plan
  title: "PR3a — Make navigator I/O-free (parameterize + inject, still in-core)"
  task: "Parameterize NavigatorGraph<TNode, TContext> and Snapshot<TState, TTrigger>. Inject getJournalStructure via callback. Navigator subdir imports only from ./."
  spec: "After PR2, the navigator engine files no longer import from repair actions or journal/event-writer — but they still import `Unit` from `unit/unit.ts`, `Gap`/`GapKind` from `gap/types.ts`, and `getJournalStructure` from `journal/structure.ts`. These residual couplings prevent the zero-dep claim in PR3b.\n\nThis PR makes the navigator **truly domain-agnostic** by generic parameterization + callback injection — still inside core, so the move in PR3b is a pure `git mv`.\n\n**Parameterization:**\n\nIn `navigator/types.ts`:\n```ts\nexport interface NavigatorGraph<TNode, TContext> {\n  addNode(node: GraphNode<TNode>): void;\n  getBufferedNodes(): GraphNode<TNode>[];\n  // ...\n}\n\nexport interface Snapshot<TState, TTrigger> {\n  state: TState;\n  triggers: TTrigger[];\n  iteration: number;\n  stallCount: number;\n  taskContext: TaskContext;\n}\n\nexport type ActionHandler<TState, TTrigger, TNode> =\n  (snap: Snapshot<TState, TTrigger>, graph: NavigatorGraph<TNode, unknown>) => Promise<WalkResult<TNode>>;\n```\n\n`Unit`, `Gap`, `GapKind` become **consumer-side type arguments**, not navigator imports. Call sites in `unit/run.ts` supply `Unit` and `Gap[]` as the concrete `TState`/`TTrigger`.\n\n**Callback injection (journal/structure):**\n\n`task-context.ts` currently calls `getJournalStructure()` from `journal/structure.ts`. Replace with an injected callback:\n```ts\nexport interface TaskContextDeps {\n  getJournalStructure: (epicId: string) => JournalStructure;\n}\n```\nPass via `TaskContext` constructor or navigator options. `unit/run.ts` plugs in the real `getJournalStructure`.\n\n**Grep audit — the invariant that makes PR3b real:**\n```bash\n# No imports from outside the navigator subdir\ngrep -rn \"from ['\\\"]\\\\.\\\\./\" packages/core/src/repair/navigator | grep -vE \"from ['\\\"]\\\\./\" && exit 1 || true\n\n# No imports of Unit / Gap / GapKind / journal types\ngrep -rnE \"import.*(Unit|Gap|GapKind|JournalStructure)\\\\b\" packages/core/src/repair/navigator && exit 1 || true\n```\n\n**Acceptance:**\n- PR1 navigator suites green (generic types don't change runtime behavior)\n- Both grep audits return clean\n- `Unit.run()` works end-to-end\n- `pnpm typecheck` + `pnpm test` green\n- No file moved; only edits in `repair/navigator/*` and `unit/run.ts`"
  projectDir: "D:/converge"
  artifactsDir: "D:/converge/.converge/artifacts/split-cli/003-navigator-io-free"
  subTemplateDir: "D:/converge/.converge/playbooks/split-cli-monolith/wbs/templates/item/tasks/implement/tasks/plan"
  wbsSection: 
---

# Plan implementation — PR3a — Make navigator I/O-free (parameterize + inject, still in-core)

Read the analysis and produce a concrete, file-level implementation plan.

## Steps

1. Read `D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/analyze/plan.md`.
2. Reconcile the analysis against current code state — the analysis may have been written minutes or hours ago, but files may have drifted. Re-check line ranges and grep counts if they're load-bearing.
3. Write the final implementation plan. Be specific: file paths, exact lines, what becomes what.

## Output

Write `D:/converge/.converge/artifacts/split-cli/003-navigator-io-free/implement/plan.md`:

```markdown
# PR3a — Make navigator I/O-free (parameterize + inject, still in-core) — Implementation Plan

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
