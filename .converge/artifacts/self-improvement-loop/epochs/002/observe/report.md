# Audit Report: Blueprint vs Runtime (Model #1)

**Epoch:** 2
**Model:** Blueprint vs Runtime
**Source:** CLAUDE.md §5
**Rule:** `.converge/playbooks/` is source blueprint; `.converge/journal/` is executable run state/evidence. Fix source or loader/compiler behavior; do not hand-edit `manifest.json` or `runstate.json`.

## Step 1: What the rule REQUIRES

Playbook source (`.converge/playbooks/`) is the authoritative design-time blueprint; journal (`.converge/journal/`) is strictly runtime execution artifacts. No code should blur this boundary by treating the journal as the design-time source of truth.

## Step 2: Trace the implementation

### Files audited

| File | Role |
|---|---|
| `packages/core/src/playbook/sync.ts` | Mirrors playbook into journal, blurring boundary |
| `packages/core/src/journal/structure.ts` | Path resolution for target/ vs journal/ |
| `packages/core/src/run/index.ts` | Compile path: playbook → manifest → runstate |
| `packages/core/src/manifest/run-state-manager.ts` | Persists runstate.json at journal root |
| `packages/core/src/dag/dag-tree.ts` | Reads runstate.json from different path (executions/) |
| `packages/core/src/navigator/repair/system-prompts.ts` | Tells agents to read from journal, not playbook |
| `packages/core/src/navigator/repair/context-writer.ts` | Warns agents to edit playbook source, not journal |

### Commands run (evidence-gathering)

```sh
# 1. Trace where journal paths are constructed vs playbook paths
grep -rn "manifest\.json\|runstate\.json\|\.converge/playbooks\|\.converge/journal" packages/core/src/ packages/cli/src/ | grep -v node_modules | head -40

# 2. Find where the journal is declared as "single source of truth"
grep -rn "single source of truth" packages/core/src/ | grep -v node_modules

# 3. Check for path inconsistencies between RunStateManager and ingestSpawnedChildren
grep -rn "executions/" packages/core/src/dag/dag-tree.ts
grep -rn "runstate\.json" packages/core/src/manifest/run-state-manager.ts | head -5
```

### Key findings from trace

**sync.ts:215-217** — `syncPlaybookToJournal()` includes a comment declaring:
> "After syncing, the journal can serve as the single source of truth for task definitions AND runtime state — readers no longer need to consult `playbooks/` separately."

This is a deliberate architectural choice to make the journal the unified source of truth. It mirrors non-task playbook files (playbook.yml, .playbook-hash) into the journal. While task content (TASK.md) is excluded from the shared journal level (line 253-258), the framing of the journal as "single source of truth for task definitions" contradicts the Blueprint vs Runtime model which designates playbooks as the blueprint source.

**dag-tree.ts:335** — `ingestSpawnedChildrenFromRunstate()` constructs the path:
```
join(projectDir, ".converge", "journal", playbookName, "executions")
```
...then iterates entries looking for `runstate.json` inside each. But `RunStateManager` (run-state-manager.ts:48) persists runstate.json at:
```
join(targetDir, "runstate.json")  // = .converge/journal/{playbook}/runstate.json
```

The `executions/` subdirectory path used by the tree-based navigator does not match the root journal path used by the DAG runner. If `executions/` does not exist (which it won't in the single-target model), the function silently returns with no spawned children ingested.

**structure.ts:7-16 vs structure.ts:82** — Docstring describes layout as `target/{playbook}/manifest.json` but implementation writes to `join(projectDir, ".converge", "journal", name)`. The `target/` directory documented in comments does not exist; the compiled artifacts land inside `.converge/journal/`, which is supposed to be the runtime-only directory.

**system-prompts.ts:265-266** — tells repair agents to "Read the compiled task context from `.converge/journal/<playbook>/executions/<runId>/tasks/<taskId>/` — not the playbook source" and "The task body in the compiled journal TASK.md already told you the intent." This instruction encourages agents to treat the journal snapshot as the authoritative intent source, undermining the playbook-as-blueprint principle.

## Step 3: Gaps identified

### Gap 1 [HIGH]: Journal promoted to unified source of truth

**File:** `packages/core/src/playbook/sync.ts:215-217`
**What model requires:** `.converge/playbooks/` is the exclusive design-time source; `.converge/journal/` is runtime state only.
**What code does:** `syncPlaybookToJournal()` mirrors playbook files into the journal and declares the journal becomes "single source of truth for task definitions AND runtime state." This undermines the separation — if the journal is the source of truth for task definitions, the playbook becomes a staging area rather than the authoritative blueprint.

### Gap 2 [MEDIUM]: runstate.json path divergence between runner and navigator

**File:** `packages/core/src/dag/dag-tree.ts:335` vs `packages/core/src/manifest/run-state-manager.ts:48`
**What model requires:** Runtime artifacts should be consistently locatable by all consumers.
**What code does:** `RunStateManager` writes `runstate.json` to `.converge/journal/{playbook}/runstate.json`. `ingestSpawnedChildrenFromRunstate()` reads from `.converge/journal/{playbook}/executions/{entry}/runstate.json`. These are different paths — the tree-based navigator cannot discover spawned children persisted by the DAG runner.

### Gap 3 [LOW]: Stale `target/` documentation in structure.ts

**File:** `packages/core/src/journal/structure.ts:7-16`
**What model requires:** Clear, accurate naming of blueprint vs runtime directories.
**What code does:** The docstring describes `target/{playbook}/manifest.json` but no `target/` directory exists — compiled artifacts land in `.converge/journal/{playbook}/`. The documentation is misleading.

## Step 4: Proposed correction

### For Gap 1 (best finding)

**Test to write:** `tests/playbook-journal-boundary.test.ts` — verifies that the journal directory does NOT contain a copy of `playbook.yml` or other playbook source files at the shared journal level. Ensures `syncPlaybookToJournal()` only copies task snapshots into execution-scoped directories, never into the shared journal root.

**Code change:** In `sync.ts`, remove the mirroring of playbook source files into the shared journal directory. The `syncPlaybookToJournal()` function should only sync execution-scoped task snapshots under `executions/`. The `.playbook-hash` file should live in a separate location (e.g., `.converge/cache/`) rather than polluting the journal.

**Why this prevents future violations:** Once the journal strictly contains runtime state, no future code path can mistakenly treat it as a design-time source. The separation becomes enforceable at the filesystem level rather than relying on developer discipline.
