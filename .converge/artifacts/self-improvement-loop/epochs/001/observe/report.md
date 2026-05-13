# Audit Report: Blueprint vs Runtime (Model 1, CLAUDE.md §5)

## Step 1: What the rule REQUIRES

The framework must always treat `.converge/playbooks/` as the authoritative design source and `.converge/journal/` as read-only execution evidence. When behavior is wrong, fixes go into the playbook source (TASK.md, playbook.yml) or the compiler/loader that translates source → runtime state — never into hand-edits of `manifest.json` or `runstate.json`.

## Step 2: Implementation trace

### Files audited

| File | Role |
|---|---|
| `packages/core/src/task/playbook/paths.ts` | Resolves playbook source vs journal paths — clean separation |
| `packages/core/src/journal/structure.ts` | Journal path conventions, `getTargetDir()`, `getJournalRoot()` |
| `packages/core/src/run/index.ts` | Core execution: compile, execute task, output resolution |
| `packages/core/src/dag/dag-tree.ts` | DAG reload, spawn child ingestion from runstate.json |
| `packages/core/src/manifest/writer.ts` | Atomic write of manifest.json and runstate.json |
| `packages/core/src/manifest/run-state-manager.ts` | Runtime state tracking |
| `packages/core/src/navigator/repair/system-prompts.ts` | Repair prompts: "Journal files are READ-ONLY" instruction |
| `packages/core/src/playbook/sync.ts` | Lists manifest.json and runstate.json as "compile artifacts" |
| `packages/cli/skills/converge-control/SKILL.md` | "Don't hand-edit manifest.json or runstate.json" |

### Commands run

```sh
# Trace playbook vs journal path separation
grep -rn "getTargetDir\|getJournalRoot\|resolvePlaybookPaths" packages/core/src/

# Find all manifest.json / runstate.json references in framework
grep -rn "manifest\.json\|runstate\.json" packages/core/src/

# Find hardcoded journal paths outside journal module
grep -rn "\.converge/journal" packages/core/src/run/index.ts
grep -rn "join.*\.converge.*journal" packages/core/src/
```

### Commands output

`getTargetDir` / `getJournalRoot` / `resolvePlaybookPaths` usage across 6 framework files — the path API exists and is available.

Manifest/runstate references appear in 10+ files — both structured access (via `reader.ts`/`writer.ts`) and raw path construction.

In `run/index.ts`, the journal path is hardcoded at 4 locations, bypassing `getTargetDir()`:
- Line 237: `resultsMgr.executionDir` + `fromRunstate.replace(...)`
- Line 244: raw `.converge/journal/` string check
- Line 1155: manual path join with regex
- Line 1243: `join(projectDir, ".converge", "journal", playbookName, "manifest.json")`

In `dag-tree.ts`, lines 330-336: `ingestSpawnedChildrenFromRunstate` constructs the journal path manually with `path.join(projectDir, ".converge", "journal", playbookName, "executions")`.

## Step 3: Gaps found

### Gap 1 (HIGH): Runtime content preferred over blueprint source

`packages/core/src/run/index.ts:968` — The `executeTask` function comment states: "Prefer task content from runstate.json (embedded at compile time). Fall back to filesystem TASK.md only when task_def is unavailable."

This inverts the source-of-truth hierarchy. The blueprint (TASK.md on disk under `.converge/playbooks/`) should be authoritative, but the runtime prefers compiled content embedded in `runstate.json`. If compilation embeds stale content, the runtime silently uses it instead of re-reading the authoritative source.

Evidence:
```
Line 968: // Prefer task content from runstate.json (embedded at compile time).
Line 969: // Fall back to filesystem TASK.md only when task_def is unavailable.
Lines 980-983:
  if (tdPrompt || tdBody) {
    unit = Unit.fromDefinition(node.taskDef as any, null as any, absPath);
  } else if (!isVirtualPath && existsSync(absPath)) {
    unit = await Unit.fromPath(absPath);
```

### Gap 2 (MEDIUM): Journal path hardcoded in compile logic

`packages/core/src/run/index.ts:1243` — `compilePlaybook` hardcodes `.converge/journal/` for manifest discovery:
```
const journalPath = join(projectDir, ".converge", "journal", playbookName, "manifest.json");
```

The `getTargetDir()` function in `packages/core/src/journal/structure.ts:78-83` was created to centralize this path convention, but `compilePlaybook` bypasses it. The same hardcoding appears at lines 237, 244, and 1155 of the same file.

### Gap 3 (LOW): Journal path hardcoded in DAG reload

`packages/core/src/dag/dag-tree.ts:330-336` — `ingestSpawnedChildrenFromRunstate` constructs journal paths manually:
```
const journalRoot = path.join(this.projectDir, ".converge", "journal", playbookName, "executions");
```

Rebuilds the journal path from raw strings instead of using `getTargetDir()`.

## Step 4: Proposed correction

**Test to write:** `tests/compile/blueprint-authority.test.ts` — Verify that when a TASK.md is modified in the playbook source, re-executing the task uses the updated source content, not stale compiled content from a prior runstate.json.

**Code change:** In `run/index.ts:968-983`, reverse the preference order: try TASK.md on disk first, then fall back to the compiled task_def. Add a freshness check comparing TASK.md modification time against the compile timestamp in runstate.json.

**Why this prevents future violations:** Making the blueprint authoritative at every read point, with compiled state as a cache (verified against source freshness), encodes the mental model into the runtime. Future developers cannot accidentally prefer runtime state because the API forces them through the freshness check.
