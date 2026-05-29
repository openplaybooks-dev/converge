import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { TaskDag } from "../dag/task-dag.js";
import { buildDagFromPlaybookObject, injectRootNodes, splitContainerNodes } from "../manifest/build-dag.js";
import { buildDagFromPlaybook } from "../config/declarative-loader.js";
import { discoverStaticChildren } from "../task/discovery/static-children.js";
import { hashUnifiedPlaybook } from "./compile-unified.js";
import { getInventoryDir } from "../journal/structure.js";
import type { UnifiedRuntimeTask } from "../task/goal/unified-tasks.ts";
import type { Playbook } from "../playbook.js";
import type { LoaderError } from "../config/declarative-loader.js";

export async function compilePlaybook(
  playbook: Playbook,
  playbookDir: string,
  playbookName: string,
  targetDir: string,
  projectDir: string,
): Promise<{ dag: TaskDag; errors: LoaderError[]; playbookHash: string }> {
  const hasInMemoryTasks = playbook.tasks.size > 0;
  const inventoryDir = getInventoryDir(projectDir);

  // Reconcile: any `tasks/<id>/TASK.md` directory added since the
  // inventory was last written shows up as a new row. Without this, an
  // author can drop a new task on disk and the runner stays blind to it
  // until they manually re-run `converge migrate --rfc=0031`.
  syncStaticTasksFromDisk(playbookDir, inventoryDir, playbookName);

  let manifestPath = join(targetDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    const journalPath = join(projectDir, ".converge", "journal", playbookName, "manifest.json");
    if (existsSync(journalPath)) {
      manifestPath = journalPath;
    }
  }

  if (existsSync(manifestPath)) {
    try {
      const manifestRaw = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestRaw);
      const currentHash = hashUnifiedPlaybook(playbookDir, inventoryDir);
      const manifestHash = manifest.metadata?.playbook_hash;
      if (manifestHash && manifestHash === currentHash) {
        const { buildDagFromManifest } = await import("../manifest/build-dag.js");
        const result = buildDagFromManifest(manifest);
        await expandHooksFromPlaybook(playbook, result.dag);
        return {
          dag: result.dag,
          errors: result.errors,
          playbookHash: manifestHash,
        };
      }
    } catch {
      // Stale or corrupt manifest: fall through to recompile
    }
  }

  const tasksFile = join(inventoryDir, "tasks.jsonl");
  if (existsSync(tasksFile)) {
    const { compileUnified } = await import("./compile-unified.js");
    const { dag, errors, playbookHash } = compileUnified(playbookDir, inventoryDir);

    const idToPath = new Map<string, string>();
    discoverStaticChildren(dag, idToPath);
    splitContainerNodes(dag);
    injectRootNodes(dag, playbookName, playbookDir);
    await expandHooksFromPlaybook(playbook, dag);
    return { dag, errors, playbookHash };
  }

  if (hasInMemoryTasks) {
    const result = buildDagFromPlaybookObject(playbook);
    await expandHooksFromPlaybook(playbook, result.dag);
    return {
      dag: result.dag,
      errors: result.errors,
      playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
    };
  }

  if (existsSync(join(playbookDir, "tasks"))) {
    const { dag, errors } = buildDagFromPlaybook(playbookDir);
    await expandHooksFromPlaybook(playbook, dag);
    return {
      dag,
      errors,
      playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
    };
  }

  return {
    dag: new TaskDag(),
    errors: [],
    playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
  };
}

/**
 * Append rows to `tasks.jsonl` for any `tasks/<id>/TASK.md` directories
 * that exist on disk but are not yet recorded in the inventory. No-op
 * when the inventory file is missing (initial-state playbook) or when
 * the `tasks/` directory doesn't exist.
 *
 * Implementation note: we read raw JSONL lines (not the parsed/filtered
 * task list) so that legacy rows the strict parser would skip — like
 * synthetic `root-converge`/`root-diverge` sentinels that lack `taskRef`
 * — survive the rewrite.
 */
export function syncStaticTasksFromDisk(
  playbookDir: string,
  inventoryDir: string,
  playbookName: string,
): void {
  const tasksFile = join(inventoryDir, "tasks.jsonl");
  if (!existsSync(tasksFile)) return;
  const tasksDir = join(playbookDir, "tasks");
  if (!existsSync(tasksDir)) return;

  let raw: string;
  try { raw = readFileSync(tasksFile, "utf-8"); } catch { return; }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const knownIds = new Set<string>();
  let hasHeader = false;
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row?.kind === "playbook") hasHeader = true;
      else if (row?.kind === "task" && typeof row.id === "string") knownIds.add(row.id);
    } catch { /* skip malformed */ }
  }

  const newRows: UnifiedRuntimeTask[] = [];
  const now = new Date().toISOString();
  for (const ent of readdirSync(tasksDir, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const sub = ent.name;
    if (knownIds.has(sub)) continue;
    if (!existsSync(join(tasksDir, sub, "TASK.md"))) continue;
    newRows.push({
      kind: "task",
      id: sub,
      taskRef: { kind: "static", dir: `tasks/${sub}` },
      depends_on: [],
      status: "todo",
      source: "static",
      playbook: playbookName,
      createdAt: now,
      updatedAt: now,
    });
  }

  if (newRows.length === 0) return;

  const out: string[] = [];
  if (!hasHeader) {
    const synthHeader: import("../task/goal/unified-tasks.ts").RuntimePlaybookHeader = {
      kind: "playbook",
      schemaVersion: 1,
      name: playbookName,
      createdAt: now,
      updatedAt: now,
    };
    out.push(JSON.stringify(synthHeader));
  }
  out.push(...lines);
  for (const row of newRows) out.push(JSON.stringify(row));

  writeFileSync(tasksFile, out.join("\n") + "\n");
  console.error(`[compile] discovered new tasks: ${newRows.map((t) => t.id).join(", ")}`);
}

export async function expandHooksFromPlaybook(
  playbook: Playbook,
  dag: TaskDag,
): Promise<void> {
  const hooks = playbook.def.hooks;
  if (!hooks || hooks.length === 0) return;

  await ensureBuiltinsLoaded();

  for (const hook of hooks) {
    const builtinName = (hook.config as any)?.__builtin as string | undefined;
    if (builtinName) {
      const resolved = resolveBuiltinHook(builtinName, hook.config);
      if (resolved) {
        (hook as any).fn = resolved;
      }
    }
  }

  const { expandHooks } = await import("../dag/hook-nodes.js");
  expandHooks(hooks, dag);
}

const _builtinHookFactories: Record<
  string,
  (config?: Record<string, unknown>) => any
> = {};

let _builtinsLoaded = false;

async function ensureBuiltinsLoaded(): Promise<void> {
  if (_builtinsLoaded) return;
  _builtinsLoaded = true;
  try {
    const { gitCommitHook, prCreateHook } = await import(
      "../hooks/builtins/git.js"
    );
    _builtinHookFactories["git-commit"] = (cfg) => gitCommitHook(cfg as any);
    _builtinHookFactories["pr-create"] = (cfg) => prCreateHook(cfg as any);
  } catch {
    // builtins are optional
  }
}

function resolveBuiltinHook(
  name: string,
  config?: Record<string, unknown>,
): any | null {
  const factory = _builtinHookFactories[name];
  if (!factory) {
    console.warn(`[hooks] Unknown builtin hook: "${name}". Skipping.`);
    return null;
  }
  return factory(config);
}

export function hashPlaybook(playbookDir: string): string {
  const hash = createHash("sha256");
  const ymlPath = join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    hash.update(readFileSync(ymlPath, "utf-8"));
  }
  const tasksDir = join(playbookDir, "tasks");
  if (existsSync(tasksDir)) {
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name === "TASK.md") hash.update(readFileSync(full, "utf-8"));
      }
    };
    walk(tasksDir);
  }
  return `sha256:${hash.digest("hex")}`;
}
