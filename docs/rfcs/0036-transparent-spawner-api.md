---
rfc: 0036
title: Transparent Spawner API
status: proposed
type: refactor
source: human
priority_tier: tier1
estimate: "3-4 days"
backwards_compatible: yes
risk: medium
breaks_existing: no
---

# RFC 0036: Transparent Spawner API

## Problem

The spawn pipeline has **three disjoint data pathways** that feed the same DAG
executor, each with a different contract and failure mode:

| Pathway | Content source | How runner finds it | Failure mode |
|---|---|---|---|
| **Static** `tasks/<id>/TASK.md` | File on disk | `node.path` → `Unit.fromPath` | Missing file → clear error |
| **Template** (inventory row) | Rendered in-memory by `resolveTaskFromRow` | `taskDef.prompt` → `Unit.fromDefinition` | Silent drop in `syncLedgerToDag` |
| **Reconcile-hydrated** | Hollow metadata from `inventoryHydratedAsPrevState` | Neither — content missing | Generic skip message |

### Root cause demonstrated with mezon-portal

Template tasks (`chat-03-react` through `chat-07-wire`) are compiled from
inventory (`tasks.jsonl`) into the DAG with rendered prompts, but get
silently dropped during execution:

1. **`syncLedgerToDag` drops tasks silently** (run/index.ts:1981) — when the
   instance TASK.md file doesn't exist on disk, the task is `continue`d with
   no event emitted. Template rows in inventory have `source: "spawned"` but
   no instance file — only a `taskRef.kind: "template"` reference.

2. **Resume merge loses fresh nodes** (run/index.ts:550-567) — stale runstate
   (190 nodes) is merged into fresh DAG (195 nodes). The loop at line 550
   only updates nodes that exist in **both** collections. Template nodes that
   exist in the fresh DAG but not in stale runstate are never added to the
   working state.

3. **Generic error message** (run/index.ts:1515) — "no task content and no
   TASK.md — skipping" fires for 4+ different root causes with no diagnostic
   trail. The AI agent cannot distinguish:
   - Missing template file
   - Empty rendered prompt
   - `syncLedgerToDag` silent drop
   - Stale runstate merge omission

### Secondary issues

- **`loadTaskFile` silently returns `{}`** on parse failure
  (declarative-loader-unified.ts:266) — no diagnostic for malformed TASK.md
- **Template paths break `createTaskContext()`** — `extractEpicId`,
  `extractLeafTaskId`, `extractParentTaskId` don't fully handle `templates/`
  path segments
- **No way to inspect pipeline state** — AI can't tell why a task was skipped
  or what state each pipeline stage is in

## Goals

1. **One pathway** — All spawned tasks write an instance TASK.md to disk.
   No in-memory-only content that can be silently dropped.
2. **Structured diagnostics** — Every skip/fail includes `taskId`,
   `taskPath`, `reason`, and actionable `suggestion`.
3. **Resume-safe** — Fresh DAG nodes are always merged into runstate,
   regardless of stale prior state.
4. **AI-debuggable** — `converge spawn status` shows full pipeline state.

## Design

### 1. `converge task add` always writes instance TASK.md

When the AI spawner skill calls `converge task add`, the command:
1. Resolves the template from `templates/<name>/TASK.md`
2. Renders `{{placeholders}}` with provided params
3. Writes the rendered content to
   `.converge/inventory/<playbook>/spawned/<id>/TASK.md`
4. Appends the ledger row with `taskPath` pointing to the instance file

This ensures `syncLedgerToDag` always finds a TASK.md on disk and the AI
can inspect the exact content that will be executed.

### 2. Structured skip events

Replace the generic skip message with specific, actionable diagnostics:

```ts
// Before (run/index.ts:1512-1516):
reporter?.emit({
  kind: "task-skipped",
  taskId,
  reason: "no task content and no TASK.md — skipping",
});

// After:
reporter?.emit({
  kind: "task-skipped",
  taskId: "chat-03-react",
  taskPath: ".converge/playbooks/mezon-portal/templates/screen-03-react/TASK.md",
  reason: "template-prompt-empty" | "missing-instance-file" | "hollow-node" | "parse-error" | "missing-template",
  detail: "...",
  suggestion: "Run `converge task add chat-03-react --template screen-03-react`",
});
```

Failure matrix:

| Condition | Reason | Detail | Suggestion |
|---|---|---|---|
| `taskRef.kind=template` but template file missing | `missing-template` | Template TASK.md not found at {path} | Check taskRef.name matches templates/ dir |
| Template parsed but `prompt` empty | `template-prompt-empty` | Template parsed but no body after frontmatter | Add content after \`---\` in template TASK.md |
| `syncLedgerToDag` TASK.md not found | `missing-instance-file` | Expected TASK.md at {path} but not found | Run `converge task add {id} --template {name}` |
| Reconcile-hydrated with `source_path=""` | `hollow-node` | Runstate node has no source_path or taskDef content | Delete runstate and re-run: `converge clean` |
| `loadTaskFile` parse error | `parse-error` | TASK.md at {path} failed to parse: {error} | Fix frontmatter syntax |

### 3. Fix `syncLedgerToDag` to emit diagnostics

```ts
// Before (run/index.ts:1981):
if (!existsSync(taskMdAbs)) continue;

// After:
if (!existsSync(taskMdAbs)) {
  reporter?.emit({
    kind: "task-skipped",
    taskId: row.id,
    taskPath: taskMdRel,
    reason: "missing-instance-file",
    detail: `Expected TASK.md at ${taskMdAbs} but not found`,
    suggestion: `Run 'converge task add ${row.id} --template ${row.taskRef?.name}' to materialize`,
  });
  continue;
}
```

### 4. Fix resume merge to include fresh DAG nodes

The stale runstate merge at line 550-567 only updates existing nodes.
Template nodes that exist in the fresh DAG but not in stale runstate are
never added. Fix:

```ts
// After the update loop, add fresh nodes not in stale runstate:
for (const [id, dagNode] of dag.nodes) {
  if (!state.dag.nodes[id]) {
    // Fresh node from compile — add to runstate as-is
    await resultsMgr.addNode(id, dagNode);
  }
}
```

### 5. Fix `loadTaskFile` parse error diagnostics

```ts
// Before (declarative-loader-unified.ts:266):
} catch {
  return {};
}

// After:
} catch (err) {
  errors.push({
    type: "parse_error",
    message: `Failed to parse ${absPath}: ${(err as Error).message}`,
  });
  return {};
}
```

### 6. `converge spawn status` diagnostic command

```bash
$ converge spawn status --playbook=mezon-portal --task=chat-03-react

Task: chat-03-react
─────────────────────────────────────────────────────────────
Inventory row:       ✓ status=todo, source=spawned, taskRef.kind=template
Instance TASK.md:    ✗ not found at .../spawned/chat-03-react/TASK.md
Template TASK.md:    ✓ found at .../templates/screen-03-react/TASK.md (2905 bytes)
Template body:       ✓ 1622 bytes after frontmatter
Params:              ✓ screenId=chat, density=reader, ...
Rendered prompt:     ✓ 1622 bytes (placeholders substituted)
Runstate node:       ✗ not in DAG (dropped by syncLedgerToDag)
─────────────────────────────────────────────────────────────
Fix: Run `converge task add chat-03-react --template screen-03-react --param ...`
```

## Migration

### Phase 1: Structured diagnostics + resume merge fix
Low-risk, no behavioral change — just better error reporting and correct
merge semantics.

- Update `runTask()` in `run/index.ts` with structured skip events
- Update `syncLedgerToDag()` to emit diagnostics instead of silent drops
- Fix resume merge to include fresh DAG nodes
- Fix `loadTaskFile` to report parse errors
- Fix template path handling in `path-utils.ts`

### Phase 2: `converge task add` writes instance TASK.md
Breaking change for the spawn pipeline — requires updating the SKILL.md.

- Update `commands-spawn.ts` `spawnOne()` to render + write instance TASK.md
- Update `appendTaskUpsert()` to always set `taskPath`
- Provide `converge spawn materialize --playbook=X` to backfill existing rows

### Phase 3: `converge spawn status` command
New diagnostic tool for AI and human operators.

### Phase 4: Update SKILL.md
Update `run-spawn-script/SKILL.md` to use `converge task add` instead of
direct JSONL writes.

## Verification

1. `converge run --playbook=mezon-portal --select chat-03-react` executes
   the task (no longer silently skipped)
2. `converge spawn status --playbook=mezon-portal --task=chat-03-react`
   shows full pipeline state
3. `converge reconcile --playbook=mezon-portal` rebuilds runstate with
   full task content
4. Zero "no task content and no TASK.md — skipping" messages for template tasks
5. All skip events have specific `reason` and `suggestion` fields

## File Changes

| File | Change |
|---|---|
| `packages/cli/src/commands-spawn.ts` | `spawnOne()` writes rendered instance TASK.md (Phase 2) |
| `packages/cli/src/commands-spawn-status.ts` | New: diagnostic command (Phase 3) |
| `packages/core/src/task/goal/runtime-ledger.ts` | `appendTaskUpsert()` always sets `taskPath` (Phase 2) |
| `packages/core/src/run/index.ts` | Structured skip events + syncLedgerToDag diagnostics + resume merge fix (Phase 1) |
| `packages/core/src/task/unit/path-utils.ts` | Template path handling (Phase 1 — partial) |
| `packages/core/src/config/declarative-loader-unified.ts` | Parse error diagnostics (Phase 1) |
| `.converge/playbooks/mezon-portal/skills/run-spawn-script/SKILL.md` | Updated to use `converge task add` (Phase 4) |
| `docs/rfcs/0036-transparent-spawner-api.md` | This RFC |

## Progress

| Item | Status | Notes |
|---|---|---|
| RFC document | **proposed** | Written |
| Structured skip events | **done** | Phase 1 — run/index.ts:1511-1548 |
| syncLedgerToDag diagnostics | **done** | Phase 1 — run/index.ts:2010-2037 |
| Resume merge includes fresh nodes | **done** | Phase 1 — run/index.ts:553-574, 666-677 |
| loadTaskFile parse errors | **done** | Phase 1 — declarative-loader-unified.ts:266-268 |
| Template path handling | **partial** | extractJournalTaskId/constructJournalPath/extractEpicId/extractLeafTaskId/extractParentTaskId done |
| `converge task add` writes instance | **done** | Phase 2 — already implemented in commands-spawn.ts:514-561 |
| Backfill migration | **done** | Phase 2 — spawnOne already writes rendered instance TASK.md |
| `converge spawn status` | **done** | Phase 3 — commands-spawn-status.ts |
| SKILL.md updates | pending | Phase 4 |
| `pnpm build` | **done** | TypeScript + DTS clean |
| Tests | pending | TDD |
