/**
 * RFC 0031 Migration: playbook.yml plus spawn.yml to unified tasks.jsonl.
 *
 * Reads playbook.yml as header, spawns from .converge/spawn/, static tasks
 * from tasks directories. Merges runtime state from existing tasks.jsonl.
 *
 * Legacy files are moved to .converge/_archive/rfc-0031/<timestamp>/.
 * Idempotent: no-op when row 1 is already kind: "playbook".
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  mkdirSync,
  renameSync,
  statSync,
  copyFileSync,
} from "node:fs";
import { join, dirname, basename } from "node:path";
import { parse as parseYaml } from "yaml";

import {
  readUnifiedTasksFile,
  writeUnifiedTasksFile,
  type RuntimePlaybookHeader,
  type UnifiedRuntimeTask,
} from "../../core/src/task/goal/unified-tasks.ts";
import type { PlaybookDef } from "../../core/src/task/playbook/types.ts";

export interface Migrate0031Report {
  playbook: string;
  header: RuntimePlaybookHeader | null;
  staticTasks: number;
  spawnedTasks: number;
  migratedFromExisting: number;
  legacyFilesArchived: string[];
  errors: string[];
  alreadyMigrated: boolean;
}

function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Read spawn.yml and return structured data for a spawned task row.
 */
interface SpawnYmlData {
  template: string;
  depends_on: string[];
  params: Record<string, unknown>;
}

function readSpawnYml(path: string): SpawnYmlData | null {
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = parseYaml(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return {
      template: (parsed as any).template ?? "",
      depends_on: Array.isArray((parsed as any).depends_on) ? (parsed as any).depends_on : [],
      params: ((parsed as any).params ?? {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

/**
 * Merge runtime state from existing tasks.jsonl rows.
 */
function mergeRuntimeState(
  taskId: string,
  existingRows: UnifiedRuntimeTask[],
): Partial<UnifiedRuntimeTask> {
  const existing = existingRows.find((r) => r.id === taskId);
  if (!existing) return {};
  return {
    status: existing.status,
    fingerprint: existing.fingerprint,
    completedAt: existing.completedAt,
    metadata: existing.metadata,
  };
}

/**
 * Migrate a single playbook from legacy format to unified tasks.jsonl.
 */
export function migrate0031(
  workspace: string,
  playbookName: string,
  dry: boolean,
): Migrate0031Report {
  const playbookDir = join(workspace, ".converge", "playbooks", playbookName);
  const inventoryDir = join(workspace, ".converge", "inventory", playbookName);
  const tasksFile = join(inventoryDir, "tasks.jsonl");
  const errors: string[] = [];
  const legacyFilesArchived: string[] = [];

  // ── Idempotency check ─────────────────────────────────────────────
  if (existsSync(tasksFile)) {
    const existing = readUnifiedTasksFile(tasksFile);
    if (existing.header !== null && existing.header.kind === "playbook") {
      return {
        playbook: playbookName,
        header: existing.header,
        staticTasks: existing.tasks.filter((t) => t.taskRef.kind === "static").length,
        spawnedTasks: existing.tasks.filter((t) => t.taskRef.kind === "template").length,
        migratedFromExisting: 0,
        legacyFilesArchived: [],
        errors: [],
        alreadyMigrated: true,
      };
    }
  }

  // ── Read existing runtime state from legacy tasks.jsonl ────────────
  const existingTaskRows: UnifiedRuntimeTask[] = [];
  if (existsSync(tasksFile)) {
    try {
      const content = readFileSync(tasksFile, "utf-8");
      const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of lines) {
        try {
          const row = JSON.parse(line);
          if (row && typeof row === "object" && typeof row.id === "string" && row.kind !== "playbook") {
            existingTaskRows.push(row as UnifiedRuntimeTask);
          }
        } catch {
          // skip corrupted line
        }
      }
    } catch {
      errors.push(`Failed to read existing tasks.jsonl for ${playbookName}`);
    }
  }

  // ── Read playbook.yml → header row ─────────────────────────────────
  const playbookYmlPath = join(playbookDir, "playbook.yml");
  let header: RuntimePlaybookHeader | null = null;

  if (existsSync(playbookYmlPath)) {
    try {
      const raw = readFileSync(playbookYmlPath, "utf-8");
      const parsed = parseYaml(raw) as PlaybookDef;

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        errors.push(`Invalid playbook.yml for ${playbookName}`);
      } else {
        header = {
          kind: "playbook",
          schemaVersion: 1,
          name: parsed.name ?? playbookName,
          description: parsed.description,
          seed_api_version: parsed.seed_api_version,
          key: parsed.key,
          inputs: parsed.inputs,
          variables: (parsed as any).variables ?? {},
          run: parsed.run ?? {},
          skills: (parsed as any).skills ?? {},
          checks: parsed.checks ?? [],
          goals: parsed.goals ?? [],
          hooks: parsed.hooks ?? [],
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
      }
    } catch (err: any) {
      errors.push(`Failed to parse playbook.yml for ${playbookName}: ${err?.message ?? err}`);
    }
  } else {
    // Generate minimal header
    header = {
      kind: "playbook",
      schemaVersion: 1,
      name: playbookName,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  if (!header) return {
    playbook: playbookName,
    header: null,
    staticTasks: 0,
    spawnedTasks: 0,
    migratedFromExisting: 0,
    legacyFilesArchived,
    errors: ["Failed to create playbook header"],
    alreadyMigrated: false,
  };

  // ── Discover static tasks from tasks/ directory ────────────────────
  const tasksDir = join(playbookDir, "tasks");
  const staticTasks: UnifiedRuntimeTask[] = [];

  // Also check playbook.yml tasks: block for declared task order
  let declaredTaskOrder: string[] = [];
  if (existsSync(playbookYmlPath)) {
    try {
      const raw = readFileSync(playbookYmlPath, "utf-8");
      const parsed = parseYaml(raw) as PlaybookDef;
      if (parsed?.tasks && Array.isArray(parsed.tasks)) {
        declaredTaskOrder = parsed.tasks
          .map((t: any) => (t.path ?? t.id ?? t.name))
          .filter(Boolean);
      }
    } catch {
      // fall through
    }
  }

  if (existsSync(tasksDir)) {
    try {
      const subdirs = readdirSync(tasksDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const sub of subdirs) {
        const taskMdPath = join(tasksDir, sub, "TASK.md");
        if (existsSync(taskMdPath)) {
          const runtime = mergeRuntimeState(sub, existingTaskRows);
          staticTasks.push({
            kind: "task",
            id: sub,
            taskRef: { kind: "static", dir: join(playbookDir, "tasks", sub) },
            depends_on: [], // Will be filled from TASK.md frontmatter during DAG build
            status: runtime.status ?? "todo",
            source: "static",
            fingerprint: runtime.fingerprint,
            completedAt: runtime.completedAt,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          });
        }
      }
    } catch {
      // skip
    }
  }

  // Order static tasks by declared order (from playbook.yml tasks: block)
  // then append any discovered tasks not in the declaration
  const declaredSet = new Set(declaredTaskOrder);
  const orderedStatic = declaredTaskOrder
    .filter((id) => staticTasks.some((t) => t.id === id))
    .map((id) => staticTasks.find((t) => t.id === id)!)
    .filter(Boolean);
  for (const t of staticTasks) {
    if (!declaredSet.has(t.id)) orderedStatic.push(t);
  }

  // ── Discover spawned tasks from .converge/spawn/ ──────────────────
  const spawnDir = join(workspace, ".converge", "spawn");
  const spawnedTasks: UnifiedRuntimeTask[] = [];

  if (existsSync(spawnDir)) {
    try {
      const childDirs = readdirSync(spawnDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      for (const childDir of childDirs) {
        const spawnYmlPath = join(spawnDir, childDir, "spawn.yml");
        if (!existsSync(spawnYmlPath)) continue;

        const spawnData = readSpawnYml(spawnYmlPath);
        if (!spawnData || !spawnData.template) continue;

        const runtime = mergeRuntimeState(childDir, existingTaskRows);

        spawnedTasks.push({
          kind: "task",
          id: childDir,
          taskRef: { kind: "template", name: spawnData.template },
          params: spawnData.params,
          depends_on: spawnData.depends_on,
          parent: (runtime as any).parent,
          status: runtime.status ?? "todo",
          source: "spawned",
          fingerprint: runtime.fingerprint,
          completedAt: runtime.completedAt,
          createdAt: (runtime as any).createdAt ?? nowIso(),
          updatedAt: nowIso(),
          metadata: runtime.metadata ?? {
            template: spawnData.template,
            renderedHash: "",
          },
        });
      }
    } catch {
      // skip
    }
  }

  // Sort spawned tasks by parent + id for deterministic output
  spawnedTasks.sort((a, b) => {
    const parentA = a.parent ?? "";
    const parentB = b.parent ?? "";
    if (parentA !== parentB) return parentA.localeCompare(parentB);
    return a.id.localeCompare(b.id);
  });

  // ── Write unified tasks.jsonl ──────────────────────────────────────
  const allTasks = [...orderedStatic, ...spawnedTasks];

  if (!dry) {
    mkdirSync(inventoryDir, { recursive: true });
    writeUnifiedTasksFile(tasksFile, header, allTasks);
  }

  // ── Archive legacy files ───────────────────────────────────────────
  const archiveDir = join(workspace, ".converge", "_archive", "rfc-0031", nowIso().replace(/[:.]/g, "-"));

  if (!dry) {
    if (existsSync(playbookYmlPath)) {
      mkdirSync(archiveDir, { recursive: true });
      renameSync(playbookYmlPath, join(archiveDir, "playbook.yml"));
      legacyFilesArchived.push("playbook.yml");
    }
    if (existsSync(spawnDir)) {
      try {
        const spawnEntries = readdirSync(spawnDir, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
        if (spawnEntries.length > 0) {
          mkdirSync(archiveDir, { recursive: true });
          const archiveSpawnDir = join(archiveDir, "spawn");
          renameSync(spawnDir, archiveSpawnDir);
          legacyFilesArchived.push(`spawn/ (${spawnEntries.length} entries)`);
        }
      } catch {
        // best-effort
      }
    }
  }

  return {
    playbook: playbookName,
    header,
    staticTasks: orderedStatic.length,
    spawnedTasks: spawnedTasks.length,
    migratedFromExisting: existingTaskRows.length,
    legacyFilesArchived,
    errors,
    alreadyMigrated: false,
  };
}

/**
 * Discover all playbook names under .converge/playbooks/.
 */
export function discoverPlaybooks(workspace: string): string[] {
  const playbooksDir = join(workspace, ".converge", "playbooks");
  if (!existsSync(playbooksDir)) return [];
  try {
    return readdirSync(playbooksDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
  } catch {
    return [];
  }
}
