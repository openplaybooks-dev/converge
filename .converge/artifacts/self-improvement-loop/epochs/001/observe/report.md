# Audit: Blueprint vs Runtime (CLAUDE.md §5)

**Model rule:** `.converge/playbooks/` is source blueprint; `.converge/journal/` is executable run state/evidence. Fix source or loader/compiler behavior; do not hand-edit `manifest.json` or `runstate.json`.

## Step 1: What the rule REQUIRES

The framework must treat `playbooks/` as the sole source of truth for task definitions and DAG structure, and `journal/` as a read-only execution record. Compilation and execution must drive from playbook source, never from journal artifacts.

## Step 2: Trace the implementation

### Files audited

- `packages/core/src/run/index.ts` — compile-time orchestration and task content resolution
- `packages/core/src/journal/structure.ts` — journal/target path layout
- `packages/core/src/manifest/build-dag.ts` — DAG construction from manifest
- `packages/core/src/manifest/writer.ts` — manifest/runstate serialization
- `packages/core/src/manifest/run-state-manager.ts` — runstate lifecycle
- `packages/core/src/navigator/repair/context-writer.ts` — repair prompt generation (enforces boundary)
- `packages/core/src/navigator/repair/system-prompts.ts` — repair system prompts (enforces boundary)

### Commands run

```sh
grep -rn "manifest.json\|runstate.json" packages/core/src/ packages/cli/src/ | head -40
```

**Results (relevant excerpts):**
```
packages/core/src/run/index.ts:1243:  const journalPath = join(projectDir, ".converge", "journal", playbookName, "manifest.json");
packages/core/src/run/index.ts:1244:  if (existsSync(journalPath)) {
packages/core/src/run/index.ts:1245:    manifestPath = journalPath;
packages/core/src/run/index.ts:968:  // Prefer task content from runstate.json (embedded at compile time).
packages/core/src/run/index.ts:969:  // Fall back to filesystem TASK.md only when task_def is unavailable.
packages/core/src/journal/structure.ts:82:  return join(projectDir, ".converge", "journal", name);
packages/core/src/navigator/repair/context-writer.ts:198:  **CRITICAL: Journal files are READ-ONLY.**
packages/core/src/navigator/repair/system-prompts.ts:281:  **CRITICAL: Journal files are READ-ONLY.**
```

### Boundary enforcement locations (working correctly)

- `context-writer.ts:198` — "Journal files are READ-ONLY. Do NOT edit them — they will be overwritten on the next attempt."
- `system-prompts.ts:281` — "Journal files are READ-ONLY. FEEDBACK.md, CHECK.md, CHECK.result.md under `.converge/journal/` are generated snapshots — do NOT edit them."
- `system-prompts.ts:289` — "These are READ-ONLY snapshots from the journal — do NOT edit them. When a check command or output declaration needs changing, edit the playbook TASK.md source under `.converge/playbooks/`."

## Step 3: Findings

### Finding 1 (HIGH): compilePlaybook reads journal manifest.json as compilation source

**File:** `packages/core/src/run/index.ts:1242-1245`

The `compilePlaybook` function has a fallback path that reads `manifest.json` from `.converge/journal/<playbook>/` when the target directory doesn't have one:

```ts
let manifestPath = join(targetDir, "manifest.json");
if (!existsSync(manifestPath)) {
  const journalPath = join(projectDir, ".converge", "journal", playbookName, "manifest.json");
  if (existsSync(journalPath)) {
    manifestPath = journalPath;
  }
}
```

This violates the blueprint/runtime boundary because `journal/` is runtime state/evidence, not a compilation source. If `manifest.json` is missing from target, the framework should recompile from playbook source, not reach into journal artifacts. Using journal artifacts as a compilation source means that stale or corrupted journal state can infect the DAG.

### Finding 2 (HIGH): Task content prefers runstate.json over playbook source TASK.md

**File:** `packages/core/src/run/index.ts:968-969`

The task unit construction code explicitly prefers runtime state as the primary task content source:

```ts
// Prefer task content from runstate.json (embedded at compile time).
// Fall back to filesystem TASK.md only when task_def is unavailable.
```

This inverts the blueprint/runtime relationship. The playbook source TASK.md should be primary; `runstate.json` should only supply content for tasks that were spawned at runtime (seed children). When both sources exist, a divergence between them means the journal is stale — and the rule says playbook source wins.

### Finding 3 (MEDIUM): Framework enforcement is self-contradicting

The repair prompt generators (`context-writer.ts:198`, `system-prompts.ts:281`) correctly tell users that journal files are READ-ONLY snapshots and to edit playbook source instead. But the compile-time code at `run/index.ts:1243` and `run/index.ts:968` does the opposite — it reads journal artifacts as authoritative compilation sources. The boundary is enforced on users but violated by the framework's own compilation path.

## Step 4: Proposed correction

**For Finding 1:** Remove the journal manifest fallback at `run/index.ts:1242-1245`. When the target manifest is missing, recompile from playbook source. The `hasPlaybookYml` check already guards this path — if a playbook.yml exists, recompilation from source is fast and deterministic.

**Test to write:** `tests/compile-does-not-read-journal.test.ts` — compile a playbook, delete the target manifest, then run a corrupting mutation inside the journal directory. Recompile and verify the DAG matches the playbook source, not the corrupted journal.

**Why this prevents future violations:** Removing the journal fallback makes the data flow one-directional: playbook → compile → manifest → runstate. No runtime artifact can influence compilation, so the boundary is structurally enforced.
