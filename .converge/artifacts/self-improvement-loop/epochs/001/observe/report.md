# Audit Report: Blueprint vs Runtime (Mental Model #1)

**Epoch:** 1  
**Model:** Blueprint vs Runtime  
**Rule (CLAUDE.md §5):** `.converge/playbooks/` is source blueprint; `.converge/journal/` is executable run state/evidence. Fix source or loader/compiler behavior; do not hand-edit `manifest.json` or `runstate.json`.

---

## Step 1: What the rule REQUIRES

The mental model requires that `.converge/playbooks/` is treated as the single authoritative source (blueprint) and `.converge/journal/` is treated exclusively as derived execution evidence (runtime output). Source definitions must never be modified through journal paths, and runtime state must never be mistaken for configuration.

---

## Step 2: Implementation Trace

### Architecture overview

Two directory trees serve distinct roles:

| Directory | Role | Content |
|-----------|------|---------|
| `.converge/playbooks/{name}/` | Blueprint (source) | `playbook.yml`, `tasks/*/TASK.md`, `skills/` |
| `.converge/journal/{name}/` | Runtime (evidence) | `manifest.json`, `runstate.json`, `events.jsonl`, `tasks/*/attempts/` |

### Key files audited

**Core framework (`packages/core/src/`):**
- `playbook/sync.ts` — Playbook-to-journal synchronization logic
- `run/index.ts` — Main execution orchestrator (`run()`, `compilePlaybook()`)
- `manifest/run-state-manager.ts` — Runtime state mutations (persist, markComplete, markFailed)
- `manifest/writer.ts` — `writeManifest()`, `writeRunState()` atomic writes
- `manifest/reader.ts` — `readManifest()`, `readRunState()` from disk
- `manifest/build-dag.ts` — DAG construction from manifest or playbook object
- `journal/structure.ts` — Journal path resolution (getTargetDir, getJournalRoot)
- `config/declarative-loader.ts` — `buildDagFromPlaybook()` — playbook.yml → DAG

**CLI (`packages/cli/src/`):**
- `commands-compile.ts` — `compileCommand()` — playbook → manifest + runstate
- `commands-run.ts` — `runAutonomousCommand()` — DAG execution entry point
- `commands-journal.ts` — `journalCommand()` — display execution history
- `commands-reset.ts` — `resetCommand()` — wipe journal state
- `main.ts` — CLI entry point, auto-sync dispatch

### Commands executed for evidence

```sh
# Find .converge/ path references in framework
grep -rn '.converge/' packages/core/src/ packages/cli/src/ | grep -E '(playbook|journal|manifest|runstate)'

# Find direct manifest/runstate file I/O
grep -rn 'readFileSync.*manifest|readFileSync.*runstate' packages/core/src/ packages/cli/src/

# Find playbook directory references
grep -rn '.converge/playbooks' packages/core/src/ packages/cli/src/

# Trace sync call sites
grep -rn 'syncPlaybookToJournal|syncAllPlaybooks' packages/core/src/ packages/cli/src/

# Compare path conventions across code
grep -rn '.converge/target' packages/core/src/ packages/cli/src/
grep -rn '.converge/journal' packages/core/src/ packages/cli/src/
```

---

## Step 3: Findings

### Finding 1 (HIGH): `syncPlaybookToJournal` copies blueprint source into journal

**File:** `packages/core/src/playbook/sync.ts`, lines 219-232  
**Evidence:** Lines 215-217 state the design intent: *"After syncing, the journal can serve as the single source of truth for task definitions AND runtime state — readers no longer need to consult `playbooks/` separately."*

The function `syncPlaybookToJournal` mirrors the entire playbook source tree into the journal:
- Lines 248-287: `syncDir()` iterates playbook entries and copies each file into the journal directory
- Lines 264-286: Files are copied from `playbookDir` → `journalDir` with content comparison
- Lines 289-327: Journal entries not in playbook are removed (unless they are runtime artifacts)

**Gap:** The journal is no longer just runtime evidence — it contains a full copy of the playbook source. This erases the blueprint/runtime distinction that the mental model requires. If a user edits a TASK.md in the journal path, the next sync overwrites it silently. If they edit it in the playbook path, the sync propagates it to the journal. The two directories become indistinguishable for source content.

### Finding 2 (MEDIUM): CLI auto-syncs on every command, dissolving the boundary at every invocation

**File:** `packages/cli/src/main.ts`, lines 405-432  
**Evidence:** Lines 411-423 define `SYNC_COMMANDS` as a set of 11 commands:
```
run, status, tree, show, inspect, verify, metrics, benchmark, next, step, playbook
```
Lines 424-432: On every one of these commands, `syncAllPlaybooks()` is called, which calls `syncPlaybookToJournal()` for each playbook, mirroring source into journal.

**Gap:** The sync runs on read-only commands (`status`, `tree`, `inspect`, `show`, `metrics`) that should only inspect state, not modify it. Running `converge tree` shouldn't copy files — it should read the playbook directly. This expands the scope of sync beyond execution (where it might be justified for caching) into observation, making the journal a continuously-maintained mirror rather than execution evidence.

### Finding 3 (HIGH): `converge journal` reads from wrong target directory

**File:** `packages/cli/src/commands-journal.ts`, line 30  
**Evidence:**
- `commands-journal.ts` line 30: `join(projectDir, ".converge", "target")`
- `commands-compile.ts` line 182: `join(projectRoot, ".converge", "journal", playbookName)`
- `journal/structure.ts` line 82: `join(projectDir, ".converge", "journal", name)`

Three different path conventions coexist:
1. `.converge/target/` — used by `commands-journal.ts` to read runtime state
2. `.converge/journal/` — used by `commands-compile.ts` and `journal/structure.ts` to write runtime state
3. `projectDir/target/` — used by legacy `commands-build.ts` (line 157)

**Gap:** The `converge journal` command reads from `.converge/target/` but `converge compile` and `converge run` write to `.converge/journal/`. Since these are different directories, the journal command cannot display execution history from recent runs — it finds nothing. This is a correctness bug that undermines the usability of the journal as execution evidence.

---

## Step 4: Correction (for best finding: #1)

### What test to write

```typescript
// tests/playbook-journal-separation.test.ts
import { syncPlaybookToJournal } from "../src/playbook/sync";
import { existsSync } from "node:fs";
import { join } from "node:path";

test("syncPlaybookToJournal does not copy source files into journal", async () => {
  const playbookDir = setupTestPlaybook({
    "playbook.yml": "name: test",
    "tasks/my-task/TASK.md": "# My Task\n...",
  });
  const journalDir = setupTestJournal();

  await syncPlaybookToJournal(playbookDir, journalDir);

  // Journal must NOT contain a copy of playbook.yml
  expect(existsSync(join(journalDir, "playbook.yml"))).toBe(false);
  // Journal must NOT contain a copy of TASK.md
  expect(existsSync(join(journalDir, "tasks", "my-task", "TASK.md"))).toBe(false);
  // Journal SHOULD contain runtime artifacts
  expect(existsSync(join(journalDir, ".playbook-hash"))).toBe(true);
});
```

### What code change

In `packages/core/src/playbook/sync.ts`, `syncPlaybookToJournal()` should:
1. Stop mirroring source files into the journal
2. Only write the `.playbook-hash` reference (for change detection) and do not copy playbook.yml, TASK.md, or other source files
3. The journal should contain ONLY runtime artifacts: `runstate.json`, `manifest.json`, `events.jsonl`, `attempts/`, `logs/`, and `.playbook-hash`

### Why this prevents future violations

Removing the source mirroring means:
- There is ONE place to edit task definitions: `.converge/playbooks/`
- The journal cannot be mistaken for configuration
- No risk of editing the journal copy only to have it overwritten by the next sync
- The codebase forces authors to respect the blueprint/runtime boundary
