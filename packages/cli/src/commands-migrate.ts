/**
 * `converge migrate` — schema / layout migrations between framework
 * versions. Each migration is gated by `--rfc=<NNNN>`.
 *
 * Currently supported:
 *
 *   --rfc=0030   Drop redundant `inventory/<pb>/spawned/<id>/TASK.md`
 *                files when a canonical EXPANDED.md counterpart exists
 *                under `<execDir>/spawn/<id>/EXPANDED.md`. Refuses to
 *                delete orphans (would lose the only contract on disk).
 *
 * Flags:
 *   --rfc <NNNN>   required — selects the migration
 *   --playbook X   scope to one playbook (default: all under .converge/inventory)
 *   --dry          don't delete anything; print the report
 */

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
interface MigrateArgs {
  positional: string[];
  options: Record<string, unknown>;
}

export interface Migrate0030Report {
  playbook: string;
  inspected: number;
  deleted: string[];
  orphans: string[];
}

function findExpandedMd(
  workspace: string,
  playbook: string,
  childId: string,
): string | null {
  const journalDir = join(workspace, ".converge", "journal", playbook);
  if (!existsSync(journalDir)) return null;

  const search = (dir: string): string | null => {
    let entries: ReturnType<typeof readdirSync>;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return null;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "spawn") {
        const candidate = join(dir, "spawn", childId, "EXPANDED.md");
        if (existsSync(candidate)) return candidate;
      } else {
        const recursed = search(join(dir, entry.name));
        if (recursed) return recursed;
      }
    }
    return null;
  };

  return search(journalDir);
}

// Exported for direct unit testing without spawning the CLI.
export async function migrate0030(
  workspace: string,
  playbookFilter: string | null,
  dry: boolean,
): Promise<Migrate0030Report[]> {
  const inventoryRoot = join(workspace, ".converge", "inventory");
  if (!existsSync(inventoryRoot)) return [];

  const playbookDirs = readdirSync(inventoryRoot, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => !playbookFilter || name === playbookFilter);

  const reports: Migrate0030Report[] = [];

  for (const playbook of playbookDirs) {
    const spawnedDir = join(inventoryRoot, playbook, "spawned");
    if (!existsSync(spawnedDir)) continue;

    const report: Migrate0030Report = {
      playbook,
      inspected: 0,
      deleted: [],
      orphans: [],
    };

    const childDirs = readdirSync(spawnedDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);

    for (const childId of childDirs) {
      const legacyTaskMd = join(spawnedDir, childId, "TASK.md");
      if (!existsSync(legacyTaskMd)) continue;
      report.inspected++;

      const expandedCounterpart = findExpandedMd(workspace, playbook, childId);
      if (!expandedCounterpart) {
        report.orphans.push(childId);
        continue;
      }
      try {
        if (statSync(expandedCounterpart).size === 0) {
          report.orphans.push(childId);
          continue;
        }
      } catch {
        report.orphans.push(childId);
        continue;
      }

      if (!dry) {
        rmSync(join(spawnedDir, childId), { recursive: true, force: true });
      }
      report.deleted.push(childId);
    }

    reports.push(report);
  }

  return reports;
}

export async function migrateCommand(args: MigrateArgs): Promise<void> {
  // The CLI argv parser strips leading zeros from numeric-looking args
  // (--rfc=0030 → "30"). Pad back to 4 digits before dispatch.
  const rfcRaw = args.options.rfc;
  const rfc =
    rfcRaw === undefined ? undefined : String(rfcRaw).padStart(4, "0");
  const playbookFilter = (args.options.playbook as string | undefined) ?? null;
  const dry = args.options.dry === true;

  if (!rfc) {
    console.error("  --rfc=<NNNN> is required (e.g. --rfc=0030)");
    process.exit(64);
  }

  // Find workspace: walk up from cwd looking for .converge/ marker.
  function findWorkspace(start: string): string {
    let dir = start;
    while (true) {
      if (existsSync(join(dir, ".converge"))) return dir;
      const parent = join(dir, "..");
      if (parent === dir) return start;
      dir = parent;
    }
  }
  const workspace = findWorkspace(process.cwd());

  if (rfc === "0030") {
    const reports = await migrate0030(workspace, playbookFilter, dry);
    let totalDeleted = 0;
    let totalOrphans = 0;
    let totalInspected = 0;

    for (const r of reports) {
      totalInspected += r.inspected;
      totalDeleted += r.deleted.length;
      totalOrphans += r.orphans.length;
      console.error(
        `[${r.playbook}] inspected ${r.inspected} legacy spawned copies → ` +
          `${dry ? "would delete" : "deleted"} ${r.deleted.length}, ` +
          `${r.orphans.length} orphan(s) kept`,
      );
      if (r.orphans.length > 0) {
        console.error(
          `  orphans (no EXPANDED.md counterpart — refused):\n` +
            r.orphans.map((id) => `    - ${id}`).join("\n"),
        );
      }
    }
    console.error(
      `\nTotal: inspected ${totalInspected} · ${dry ? "would delete" : "deleted"} ${totalDeleted} · ${totalOrphans} orphans` +
        (dry ? " (dry-run)" : ""),
    );
    process.exit(totalOrphans > 0 ? 2 : 0);
  }

  if (rfc === "0031") {
    const { migrate0031, discoverPlaybooks } =
      await import("./migrate-0031.js");
    const playbooks = playbookFilter
      ? [playbookFilter]
      : discoverPlaybooks(workspace);

    if (playbooks.length === 0) {
      console.error("  No playbooks found to migrate.");
      process.exit(0);
    }

    let totalStatic = 0;
    let totalSpawned = 0;
    let totalAlreadyMigrated = 0;
    let totalErrors = 0;

    for (const pb of playbooks) {
      const report = migrate0031(workspace, pb, dry);
      totalStatic += report.staticTasks;
      totalSpawned += report.spawnedTasks;
      if (report.alreadyMigrated) totalAlreadyMigrated++;

      if (report.errors.length > 0) {
        totalErrors += report.errors.length;
        console.error(`  [${pb}] ERRORS: ${report.errors.join("; ")}`);
      } else if (report.alreadyMigrated) {
        console.error(`  [${pb}] already migrated — skipped`);
      } else {
        console.error(
          `[${pb}] ${dry ? "would migrate" : "migrated"}: ${report.staticTasks} static, ${report.spawnedTasks} spawned`,
        );
        if (report.legacyFilesArchived.length > 0) {
          console.error(
            `    archived: ${report.legacyFilesArchived.join(", ")}`,
          );
        }
      }
    }

    console.error(
      `\nTotal: ${playbooks.length} playbook(s) · ${totalStatic} static + ${totalSpawned} spawned tasks · ${totalAlreadyMigrated} already migrated · ${totalErrors} error(s)` +
        (dry ? " (dry-run)" : ""),
    );
    process.exit(totalErrors > 0 ? 1 : 0);
  }

  if (rfc === "0032") {
    const { migrate0032, discoverPlaybooks } =
      await import("./migrate-0032.js");
    const playbooks = playbookFilter
      ? [playbookFilter]
      : discoverPlaybooks(workspace);

    if (playbooks.length === 0) {
      console.error("  No playbooks found to migrate.");
      process.exit(0);
    }

    let totalMigrated = 0;
    let totalAlreadyValid = 0;
    let totalCompliant = 0;
    let totalErrors = 0;

    for (const pb of playbooks) {
      const report = migrate0032(pb, dry);
      totalMigrated += report.tasksMigrated;
      totalAlreadyValid += report.tasksAlreadyValid;
      if (report.alreadyCompliant) totalCompliant++;

      if (report.errors.length > 0) {
        totalErrors += report.errors.length;
        console.error(
          `  [${report.playbook}] ERRORS: ${report.errors.join("; ")}`,
        );
      } else if (report.alreadyCompliant) {
        console.error(
          `  [${report.playbook}] already compliant — no inline task definitions`,
        );
      } else {
        console.error(
          `[${report.playbook}] ${dry ? "would migrate" : "migrated"}: ${report.tasksMigrated} inline → TASK.md, ${report.tasksAlreadyValid} already valid`,
        );
        if (report.taskMdFilesCreated.length > 0) {
          console.error(`    created: ${report.taskMdFilesCreated.join(", ")}`);
        }
      }
    }

    console.error(
      `\nTotal: ${playbooks.length} playbook(s) · ${totalMigrated} tasks migrated · ${totalAlreadyValid} tasks already valid · ${totalCompliant} already compliant · ${totalErrors} error(s)` +
        (dry ? " (dry-run)" : ""),
    );
    process.exit(totalErrors > 0 ? 1 : 0);
  }

  console.error(`  Unknown migration: --rfc=${rfc}`);
  console.error(`  Supported: 0030, 0031, 0032`);
  process.exit(64);
}
