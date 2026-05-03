/**
 * Playbook-Journal Sync
 * 
 * Manages synchronization between playbook templates and journal execution state.
 * Detects when playbook has changed and prompts user for action.
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { PlaybookHashInfo } from './hash.ts';
import { calculatePlaybookHash } from './hash.ts';

export type PlaybookSyncStatus = 'new' | 'up-to-date' | 'outdated';

export interface PlaybookChanges {
  modified: string[];
  added: string[];
  deleted: string[];
}

export interface PlaybookStatusResult {
  status: PlaybookSyncStatus;
  currentHash: string;
  journalHash: string | null;
  currentHashInfo: PlaybookHashInfo;
  journalHashInfo?: PlaybookHashInfo;
  changes?: PlaybookChanges;
}

/**
 * Check if playbook has changed since journal was created.
 */
export async function checkPlaybookStatus(
  playbookDir: string,
  journalDir: string
): Promise<PlaybookStatusResult> {
  // Calculate current playbook hash
  const currentHashInfo = await calculatePlaybookHash(playbookDir);

  // Read journal's recorded hash
  const journalHashFile = join(journalDir, '.playbook-hash');

  if (!existsSync(journalHashFile)) {
    return {
      status: 'new',
      currentHash: currentHashInfo.hash,
      journalHash: null,
      currentHashInfo,
    };
  }

  const journalHashInfo: PlaybookHashInfo = JSON.parse(
    await readFile(journalHashFile, 'utf-8')
  );

  if (currentHashInfo.hash === journalHashInfo.hash) {
    return {
      status: 'up-to-date',
      currentHash: currentHashInfo.hash,
      journalHash: journalHashInfo.hash,
      currentHashInfo,
      journalHashInfo,
    };
  }

  // Playbook changed - detect what changed
  const changes = detectFileChanges(
    journalHashInfo.files,
    currentHashInfo.files
  );

  return {
    status: 'outdated',
    currentHash: currentHashInfo.hash,
    journalHash: journalHashInfo.hash,
    changes,
    currentHashInfo,
    journalHashInfo,
  };
}

/**
 * Detect which files were added, modified, or deleted.
 */
function detectFileChanges(
  oldFiles: string[],
  newFiles: string[]
): PlaybookChanges {
  const oldSet = new Set(oldFiles);
  const newSet = new Set(newFiles);

  const added: string[] = [];
  const deleted: string[] = [];
  const modified: string[] = [];

  // Find added files
  for (const file of newFiles) {
    if (!oldSet.has(file)) {
      added.push(file);
    }
  }

  // Find deleted files
  for (const file of oldFiles) {
    if (!newSet.has(file)) {
      deleted.push(file);
    }
  }

  // Files in both sets might be modified (we can't tell without content hash)
  // For now, we just track add/delete
  // TODO: Add per-file content hashing for better change detection

  return { added, deleted, modified };
}

/**
 * Sync journal hash to current playbook hash.
 * This marks the journal as up-to-date with the current playbook.
 */
export async function syncJournalHash(
  playbookDir: string,
  journalDir: string
): Promise<PlaybookHashInfo> {
  const hashInfo = await calculatePlaybookHash(playbookDir);

  await mkdir(journalDir, { recursive: true });
  await writeFile(
    join(journalDir, '.playbook-hash'),
    JSON.stringify(hashInfo, null, 2)
  );

  return hashInfo;
}

/**
 * Clear journal directory (for restart).
 * Preserves .playbook-hash file.
 */
export async function clearJournal(journalDir: string): Promise<void> {
  const tasksDir = join(journalDir, 'tasks');
  const sessionsDir = join(journalDir, 'sessions');

  if (existsSync(tasksDir)) {
    await rm(tasksDir, { recursive: true, force: true });
  }

  if (existsSync(sessionsDir)) {
    await rm(sessionsDir, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ */
/*  Playbook → Journal mirror sync                                     */
/* ------------------------------------------------------------------ */

import { copyFile, readdir, stat } from 'node:fs/promises';

/**
 * File / directory names that live ONLY in the journal (runtime state).
 * Sync never overwrites or removes these — they're preserved across syncs so
 * that a re-sync after the playbook changes doesn't blow away in-flight runs.
 */
const RUNTIME_NAMES = new Set([
  'checkpoint.json',
  'status.json',
  'events.jsonl',
  'log.log',
  'logs',
  'attempts',
  'wip',
  'wbs.json',
  'wbs-input.json',
  'wbs-output.json',
  'wbs-logs',
  'sessions',
  'LEARN.md',
  'FEEDBACK.md',
  'CHECK.md',
  'NEEDS.md',
  'NEEDS.result.md',
  'README.md', // generated per-task task-readme
  '.playbook-hash',
  'executions', // execution-scoped task state — never in playbook source
]);

function isRuntimeName(name: string): boolean {
  if (RUNTIME_NAMES.has(name)) return true;
  // Per-attempt log file like `2026-04-25T10-42-...index.jsonl` lands at
  // task-root level only when something's gone wrong; keep them.
  if (/\.(log|jsonl)$/.test(name)) return true;
  return false;
}

export interface SyncResult {
  copied: number;
  skipped: number;
  removed: number;
  changed: boolean;
}

/**
 * Mirror `playbookDir/**` into `journalDir/**` while preserving runtime state.
 *
 * - Files and directories present in playbook are copied into journal (overwrite).
 * - Files in journal that don't exist in playbook are removed UNLESS they're
 *   runtime state (checkpoint.json, attempts/, etc.) or live under a `tasks/`
 *   subtree that the playbook doesn't have (WBS-spawned children).
 * - Skips the journal's `.playbook-hash` and any RUNTIME_NAMES.
 * - Idempotent: running twice with no playbook change is a no-op.
 *
 * After syncing, the journal can serve as the single source of truth for
 * task definitions AND runtime state — readers no longer need to consult
 * `playbooks/` separately.
 */
export async function syncPlaybookToJournal(
  playbookDir: string,
  journalDir: string,
): Promise<SyncResult> {
  if (!existsSync(playbookDir)) {
    return { copied: 0, skipped: 0, removed: 0, changed: false };
  }
  await mkdir(journalDir, { recursive: true });
  const result: SyncResult = { copied: 0, skipped: 0, removed: 0, changed: false };
  await syncDir(playbookDir, journalDir, result);
  // Update hash so downstream `checkPlaybookStatus` reports up-to-date.
  await syncJournalHash(playbookDir, journalDir);
  return result;
}

async function syncDir(
  srcDir: string,
  dstDir: string,
  result: SyncResult,
): Promise<void> {
  await mkdir(dstDir, { recursive: true });

  const srcEntries = await readdir(srcDir, { withFileTypes: true });
  const srcNames = new Set(srcEntries.map((e) => e.name));

  // ── Pass 1: copy each playbook entry into the journal ────────────────
  // Task directories are NOT synced to the shared journal level.
  // Task state (TASK.md snapshots, attempts, logs) lives exclusively under
  // executions/{executionId}/tasks/ — each execution gets its own clean copy.
  for (const entry of srcEntries) {
    if (isRuntimeName(entry.name)) {
      result.skipped++;
      continue;
    }
    // Skip task directories — task content belongs under executions/, not
    // the shared journal. This keeps the journal clean: only playbook.yml
    // and .playbook-hash live at the playbook level.
    if (entry.isDirectory() && entry.name === "tasks") {
      result.skipped++;
      continue;
    }
    const src = join(srcDir, entry.name);
    const dst = join(dstDir, entry.name);

    if (entry.isDirectory()) {
      await syncDir(src, dst, result);
    } else if (entry.isFile()) {
      // Skip overwrite if content is byte-identical (cheap stat comparison
      // first; if same size+mtime, copy anyway because file content may have
      // changed within the second).
      try {
        if (existsSync(dst)) {
          const [srcStat, dstStat] = await Promise.all([stat(src), stat(dst)]);
          if (srcStat.size === dstStat.size && srcStat.mtimeMs <= dstStat.mtimeMs) {
            // Journal copy was written after the playbook source — assume
            // they match (sync is the only way the journal copy gets here,
            // so its mtime is later than the source it was copied from).
            result.skipped++;
            continue;
          }
        }
      } catch {
        // fall through to copy
      }
      await copyFile(src, dst);
      result.copied++;
      result.changed = true;
    }
  }

  // ── Pass 2: remove journal entries that don't exist in playbook ──────
  // Skip runtime state names. Skip directories that look like WBS-spawned
  // task subtrees (their parent has a `wbs.js` and the dir was not in
  // playbook source).
  let dstEntries: import('node:fs').Dirent[];
  try {
    dstEntries = await readdir(dstDir, { withFileTypes: true });
  } catch {
    return;
  }
  const parentHasWbs = existsSync(join(dstDir, 'wbs.js')) ||
    existsSync(join(dstDir, '..', 'wbs.js'));
  for (const entry of dstEntries) {
    if (srcNames.has(entry.name)) continue;
    if (isRuntimeName(entry.name)) continue;
    // Preserve WBS-spawned subtrees. They live under `tasks/<id>/` directories
    // whose parent has wbs.js (the WBS materialized them at runtime).
    if (entry.isDirectory() && entry.name === 'tasks' && parentHasWbs) {
      continue;
    }
    if (entry.isDirectory()) {
      // A directory the playbook removed AND that doesn't house a runtime task
      // (no checkpoint.json descendant) — safe to delete.
      const dst = join(dstDir, entry.name);
      const hasCheckpoint = await dirContainsCheckpoint(dst);
      if (hasCheckpoint) {
        // Has runtime state somewhere inside — preserve.
        continue;
      }
      await rm(dst, { recursive: true, force: true });
      result.removed++;
      result.changed = true;
    } else {
      // File the playbook no longer references — remove unless runtime.
      await rm(join(dstDir, entry.name), { force: true });
      result.removed++;
      result.changed = true;
    }
  }
}

async function dirContainsCheckpoint(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isFile() && e.name === 'checkpoint.json') return true;
      if (e.isDirectory()) {
        if (await dirContainsCheckpoint(join(dir, e.name))) return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Sync ALL playbooks in `.converge/playbooks/` to their corresponding journal
 * directories. Used at the start of every `converge run` and `converge status`
 * so the journal always reflects the latest playbook source.
 *
 * Also runs a one-shot orphan-children reconciliation: when a WBS-driven
 * parent has children at the wrong path (a known historic bug where the
 * spawn writer inserted an extra `tasks/` segment), the children are
 * migrated to the canonical location so rollup can see them.
 *
 * Returns an aggregated summary across all playbooks.
 */
export async function syncAllPlaybooks(
  projectDir: string,
): Promise<{ playbooks: string[]; aggregate: SyncResult; migrated: number }> {
  const playbooksRoot = join(projectDir, '.converge', 'playbooks');
  const journalRoot = join(projectDir, '.converge', 'journal');
  const aggregate: SyncResult = { copied: 0, skipped: 0, removed: 0, changed: false };
  const synced: string[] = [];
  let migrated = 0;
  if (!existsSync(playbooksRoot)) return { playbooks: synced, aggregate, migrated };
  let entries: import('node:fs').Dirent[];
  try {
    entries = await readdir(playbooksRoot, { withFileTypes: true });
  } catch {
    return { playbooks: synced, aggregate, migrated };
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const playbookName = entry.name;
    const playbookDir = join(playbooksRoot, playbookName);
    const journalDir = join(journalRoot, playbookName);
    const r = await syncPlaybookToJournal(playbookDir, journalDir);
    aggregate.copied += r.copied;
    aggregate.skipped += r.skipped;
    aggregate.removed += r.removed;
    aggregate.changed = aggregate.changed || r.changed;
    synced.push(playbookName);

    // Reconcile orphan WBS children: walk parents that have a wbs.json
    // (WBS-driven) and check if their canonical tasks/ dir is empty while
    // an orphan branch exists at the wrong path nearby.
    migrated += await reconcileOrphanChildren(journalDir);
  }
  return { playbooks: synced, aggregate, migrated };
}

/**
 * Walk the journal tree under `journalDir` (a single playbook root) looking
 * for WBS-driven parents whose children landed at a wrong path. The historic
 * bug inserted an extra `tasks/` segment in the spawn write path; this fn
 * detects that exact shape and migrates children to the canonical location.
 *
 * Pattern:
 *   canonical:  <pb-root>/tasks/<phase>/<wbs-parent>/   (parent's checkpoint here)
 *   orphan:     <pb-root>/tasks/<phase>/tasks/<wbs-parent>/tasks/<child>/
 *
 * Migrates each child to `<canonical>/tasks/<child>/` and removes the orphan
 * branch when empty. Returns the number of orphan branches migrated.
 */
async function reconcileOrphanChildren(journalDir: string): Promise<number> {
  let migratedCount = 0;
  const visit = async (dir: string): Promise<void> => {
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    // A WBS-driven parent has any of:
    //   - `wbs.js` file at task root (single-file WBS)
    //   - `wbs/` directory (multi-file WBS with index.js inside)
    //   - `wbs.json` runtime artifact (proves it ran a WBS)
    const hasWbsScript = entries.some(
      (e) =>
        (e.isFile() && (e.name === 'wbs.js' || e.name === 'wbs.json')) ||
        (e.isDirectory() && e.name === 'wbs'),
    );
    if (hasWbsScript) {
      // Canonical children should live in <dir>/tasks/<child>/
      const canonicalTasksDir = join(dir, 'tasks');
      const canonicalChildren = existsSync(canonicalTasksDir)
        ? await readdir(canonicalTasksDir).catch(() => [])
        : [];
      const canonicalEmpty = canonicalChildren.length === 0;
      if (canonicalEmpty) {
        // Look for an orphan: parent of `dir` with `tasks/<basename(dir)>/tasks/...`
        const parentDir = dirname(dir);
        const myName = dir.split('/').pop()!;
        const orphanRoot = join(parentDir, 'tasks', myName, 'tasks');
        if (existsSync(orphanRoot)) {
          const orphanChildren = await readdir(orphanRoot, { withFileTypes: true }).catch(() => [] as import('node:fs').Dirent[]);
          for (const child of orphanChildren) {
            if (!child.isDirectory()) continue;
            const from = join(orphanRoot, child.name);
            const to = join(canonicalTasksDir, child.name);
            if (existsSync(to)) continue; // don't overwrite
            await mkdir(canonicalTasksDir, { recursive: true });
            const { rename } = await import('node:fs/promises');
            try {
              await rename(from, to);
              migratedCount++;
              // Update the child's checkpoint id to match new location.
              const cp = join(to, 'checkpoint.json');
              if (existsSync(cp)) {
                try {
                  const data = JSON.parse(await readFile(cp, 'utf-8'));
                  // Reconstruct id from the canonical path:
                  //   journalDir/tasks/<phase>/<parent>/tasks/<child>/checkpoint.json
                  // → id = "<phase>/<parent>/<child>"
                  const rel = to.startsWith(journalDir + '/') ? to.slice(journalDir.length + 1) : to;
                  const idSegments = rel.split('/').filter((s) => s !== 'tasks' && s.length > 0);
                  const newId = idSegments.join('/');
                  if (data.id !== newId) {
                    data.id = newId;
                    await writeFile(cp, JSON.stringify(data, null, 2));
                  }
                } catch {
                  // ignore parse error
                }
              }
            } catch {
              // ignore rename failure (cross-device, permissions, etc.)
            }
          }
          // If orphan dir is now empty, remove the orphan branch.
          try {
            const remaining = await readdir(orphanRoot);
            if (remaining.length === 0) {
              await rm(join(parentDir, 'tasks', myName), { recursive: true, force: true });
            }
          } catch {
            // ignore
          }
        }
      }
    }
    // Recurse into subdirs (skip runtime dirs to keep this cheap)
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      if (isRuntimeName(e.name)) continue;
      await visit(join(dir, e.name));
    }
  };
  await visit(journalDir);
  return migratedCount;
}
