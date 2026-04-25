/**
 * Migrate Command — V1 → V2 playbook structure migration.
 *
 * V1: spawned tasks live under `.converge/playbooks/{pb}/tasks/{parent}/tasks/{child}/`
 * V2: spawned tasks live under `.converge/journal/{pb}/tasks/{parent}/spawned/{child}/`
 *
 * Usage:
 *   converge migrate             # dry-run report (safe)
 *   converge migrate --apply     # move files + write journal hash
 *   converge migrate --apply --force   # overwrite conflicting journal entries
 */

import { existsSync } from "node:fs";
import { mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { resolve } from "node:path";
import type { CommonOptions } from "./commands.ts";
import { syncJournalHash } from "@converge/core/playbook/sync.ts";

export interface MigrateOptions extends CommonOptions {
  /** Actually move files. Without this, runs as dry-run. */
  apply?: boolean;
  /** Overwrite conflicting journal destinations. */
  force?: boolean;
}

interface SpawnFinding {
  playbook: string;
  /** Parent task id (last segment of the parent task directory). */
  parentId: string;
  /** Child spawned task id. */
  childId: string;
  /** Absolute source path in playbook. */
  from: string;
  /** Absolute target path in journal. */
  to: string;
}

const TASK_FILES = ["TASK.md", "TASK.yaml", "TASK.yml"];

function hasTaskFile(dir: string): boolean {
  return TASK_FILES.some((f) => existsSync(join(dir, f)));
}

/**
 * Walk `{playbookDir}/tasks` and collect every directory that looks like a V1
 * spawned task: a task directory whose parent directory is named `tasks` and
 * whose grandparent is itself a task (has a TASK.md). That second condition
 * is what separates V1 spawns from ordinary nested playbook tasks.
 */
async function findSpawnedTasks(
  playbookDir: string,
  playbookName: string,
  journalRoot: string,
): Promise<SpawnFinding[]> {
  const findings: SpawnFinding[] = [];
  const rootTasks = join(playbookDir, "tasks");
  if (!existsSync(rootTasks)) return findings;

  async function walk(dir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry);
      let st;
      try {
        st = await stat(full);
      } catch {
        continue;
      }
      if (!st.isDirectory()) continue;

      // V1 spawn: <parentTaskDir>/tasks/<childTaskDir>/TASK.md, where the
      // grandparent is itself a task (has TASK.md). That second check
      // separates V1 spawns from ordinary nested playbook tasks.
      const dirBase = dir.split(/[\\/]/).pop();
      const grandparent = join(dir, "..");
      if (
        dirBase === "tasks" &&
        hasTaskFile(grandparent) &&
        hasTaskFile(full)
      ) {
        // Flatten: V2 uses flat parent id (last segment), not nested path.
        const parentId = grandparent.split(/[\\/]/).pop() || "";
        const childId = entry;
        const to = join(
          journalRoot,
          playbookName,
          "tasks",
          parentId,
          "spawned",
          childId,
        );
        findings.push({
          playbook: playbookName,
          parentId,
          childId,
          from: full,
          to,
        });
        // Keep descending: a spawn may contain deeper V1 spawns of its own.
        // Those nest under the current child id (flattened) once moved.
        await walk(full);
        continue;
      }

      await walk(full);
    }
  }

  await walk(rootTasks);
  return findings;
}

async function listPlaybooks(projectDir: string): Promise<string[]> {
  const pbRoot = join(projectDir, ".converge", "playbooks");
  if (!existsSync(pbRoot)) return [];
  const entries = await readdir(pbRoot);
  const result: string[] = [];
  for (const entry of entries) {
    const pbDir = join(pbRoot, entry);
    const st = await stat(pbDir).catch(() => null);
    if (st?.isDirectory()) result.push(entry);
  }
  return result;
}

export async function migrateCommand(
  options: MigrateOptions = {},
): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const convergeDir = join(projectDir, ".converge");
  const journalRoot = join(convergeDir, "journal");

  if (!existsSync(convergeDir)) {
    console.error(`\n❌ No .converge directory at: ${projectDir}`);
    console.error(`   Run "converge init" first.\n`);
    process.exit(1);
  }

  const playbooks = await listPlaybooks(projectDir);
  if (playbooks.length === 0) {
    console.log("\n✓ No playbooks found — nothing to migrate.\n");
    return;
  }

  // Collect findings across all playbooks.
  const allFindings: SpawnFinding[] = [];
  for (const pb of playbooks) {
    const pbDir = join(convergeDir, "playbooks", pb);
    const found = await findSpawnedTasks(pbDir, pb, journalRoot);
    allFindings.push(...found);
  }

  if (allFindings.length === 0) {
    console.log("\n✓ Project already on V2 structure — no spawned tasks to migrate.\n");
    // Still ensure each playbook has a journal hash so future runs detect changes.
    if (options.apply) {
      for (const pb of playbooks) {
        const pbDir = join(convergeDir, "playbooks", pb);
        const jDir = join(journalRoot, pb);
        if (!existsSync(join(jDir, ".playbook-hash"))) {
          await mkdir(jDir, { recursive: true });
          await syncJournalHash(pbDir, jDir);
          console.log(`  ✓ Wrote .playbook-hash for ${pb}`);
        }
      }
      console.log("");
    }
    return;
  }

  // Group by playbook for reporting.
  const byPb = new Map<string, SpawnFinding[]>();
  for (const f of allFindings) {
    const list = byPb.get(f.playbook) || [];
    list.push(f);
    byPb.set(f.playbook, list);
  }

  console.log(`\n🔎 V1 structure detected in ${byPb.size} playbook(s):\n`);
  for (const [pb, items] of byPb) {
    console.log(`  ${pb}  (${items.length} spawned task${items.length === 1 ? "" : "s"})`);
    for (const f of items) {
      const relFrom = relative(projectDir, f.from);
      const relTo = relative(projectDir, f.to);
      console.log(`    • ${f.parentId}/${f.childId}`);
      console.log(`        from: ${relFrom}`);
      console.log(`        to:   ${relTo}`);
    }
  }

  // Detect conflicts (destination already exists).
  const conflicts = allFindings.filter((f) => existsSync(f.to));
  if (conflicts.length > 0) {
    console.log(`\n⚠️  ${conflicts.length} destination(s) already exist in journal:`);
    for (const c of conflicts) {
      console.log(`    - ${relative(projectDir, c.to)}`);
    }
    if (options.apply && !options.force) {
      console.error(`\n❌ Refusing to overwrite. Re-run with --force to replace them.\n`);
      process.exit(1);
    }
  }

  if (!options.apply) {
    console.log(`\n  Dry-run only. Re-run with --apply to execute the migration.`);
    if (conflicts.length > 0) {
      console.log(`  Add --force to overwrite conflicting journal destinations.`);
    }
    console.log("");
    return;
  }

  // Apply. Move deepest paths first so a nested spawn ships before its
  // ancestor spawn is renamed out from under it.
  console.log(`\n🚚 Applying migration...\n`);
  const ordered = [...allFindings].sort((a, b) => b.from.length - a.from.length);
  const leftoverTasksDirs = new Set<string>();
  let moved = 0;
  for (const f of ordered) {
    if (existsSync(f.to)) {
      if (!options.force) continue; // should be unreachable — we checked above
      await rm(f.to, { recursive: true, force: true });
    }
    await mkdir(join(f.to, ".."), { recursive: true });
    await rename(f.from, f.to);
    moved++;
    leftoverTasksDirs.add(join(f.from, ".."));
    if (options.verbose) {
      console.log(`  ✓ ${f.parentId}/${f.childId}`);
    }
  }

  // Sweep now-empty `tasks/` directories, deepest first.
  const sweepOrder = [...leftoverTasksDirs].sort((a, b) => b.length - a.length);
  for (const d of sweepOrder) {
    try {
      const remaining = await readdir(d);
      if (remaining.length === 0) {
        await rm(d, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }

  // Write journal hash for each migrated playbook.
  for (const pb of byPb.keys()) {
    const pbDir = join(convergeDir, "playbooks", pb);
    const jDir = join(journalRoot, pb);
    await mkdir(jDir, { recursive: true });
    await syncJournalHash(pbDir, jDir);
  }

  console.log(`\n✅ Migration complete — moved ${moved} spawned task${moved === 1 ? "" : "s"} to journal.`);
  console.log(`   Wrote .playbook-hash for ${byPb.size} playbook(s).\n`);
}
