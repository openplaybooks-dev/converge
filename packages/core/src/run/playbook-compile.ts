import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { TaskDag } from "../dag/task-dag.js";
import {
  buildDagFromPlaybookObject,
  injectRootNodes,
} from "../manifest/build-dag.js";
import { hashUnifiedPlaybook, compileUnified } from "./compile-unified.js";
import { getInventoryDir } from "../journal/structure.js";
import {
  writeUnifiedTasksFile,
  type UnifiedRuntimeTask,
  type RuntimePlaybookHeader,
} from "../task/goal/unified-tasks.ts";
import type { Playbook } from "../playbook.js";
import type { LoaderError } from "../config/declarative-loader-unified.js";
import type { Check } from "../config/task-definition.js";

export async function compilePlaybook(
  playbook: Playbook,
  playbookDir: string,
  playbookName: string,
  targetDir: string,
  projectDir: string,
): Promise<{ dag: TaskDag; errors: LoaderError[]; playbookHash: string }> {
  const hasInMemoryTasks = playbook.tasks.size > 0;
  const inventoryDir = getInventoryDir(projectDir);

  // Bootstrap: a folder playbook with no inventory yet (fresh clone, or
  // `inventory/` wiped by a clean script) gets its `tasks.jsonl` created from
  // the `tasks/` folder here, so the run always takes the unified-inventory
  // path. Without this the runner used to fall back to a legacy folder loader
  // that dropped fields like `handoff:` from the task definition. Skipped for
  // code-defined (in-memory) playbooks, which build their DAG from objects.
  if (!hasInMemoryTasks) {
    bootstrapInventoryFromDisk(playbookDir, inventoryDir, playbookName);
  }

  // Reconcile: any `tasks/<id>/TASK.md` directory added since the
  // inventory was last written shows up as a new row. Without this, an
  // author can drop a new task on disk and the runner stays blind to it
  // until they manually re-run `converge migrate --rfc=0031`.
  syncStaticTasksFromDisk(playbookDir, inventoryDir, playbookName);

  let manifestPath = join(targetDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    const journalPath = join(
      projectDir,
      ".converge",
      "journal",
      playbookName,
      "manifest.json",
    );
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
        const { buildDagFromManifest } =
          await import("../manifest/build-dag.js");
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
    const { dag, errors, playbookHash } = compileUnified(
      playbookDir,
      inventoryDir,
    );

    // RFC 0049 Phases B/C: the unified inventory already contains every
    // static-nested row with `parent` set, and `TaskDag.childrenOf` derives
    // children from that. There is no longer any runtime filesystem rescan
    // (`discoverStaticChildren`) or container-split pass
    // (`splitContainerNodes`) — those were the layers that conflated
    // filesystem subtask children with DAG downstream dependents. The
    // inventory is now the single source of truth; the DAG is a pure
    // projection of it. Root bookends stay (pure depends_on edges).
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

  return {
    dag: new TaskDag(),
    errors: [],
    playbookHash: hashUnifiedPlaybook(playbookDir, inventoryDir),
  };
}

/**
 * Build a DAG for a folder playbook through the unified inventory — the single
 * folder-based loader. Bootstraps `tasks.jsonl` if missing, reconciles any new
 * `tasks/<id>/` dirs, compiles the unified inventory, and discovers static
 * children. Returns declared/static topology only (no synthetic root/converge
 * nodes — those are injected at run time). This is what CLI commands like
 * `compile` and `list` use in place of the deleted legacy folder loader.
 */
export function buildDagFromInventory(
  playbookDir: string,
  inventoryDir: string,
  playbookName: string,
): {
  dag: TaskDag;
  errors: LoaderError[];
  globalChecks: Check[];
  playbookHash: string;
} {
  bootstrapInventoryFromDisk(playbookDir, inventoryDir, playbookName);
  syncStaticTasksFromDisk(playbookDir, inventoryDir, playbookName);
  const { dag, errors, globalChecks, playbookHash } = compileUnified(
    playbookDir,
    inventoryDir,
  );
  // RFC 0049 Phase B: no rescan, no split — the unified inventory already
  // carries every nested row, and TaskDag.childrenOf derives the children
  // map from each row's `parent` field. This loader is now a pure
  // projection.
  return { dag, errors, globalChecks, playbookHash };
}

/* ------------------------------------------------------------------ */
/*  Enumerate tasks/ tree (RFC 0049 Phase A)                          */
/* ------------------------------------------------------------------ */

interface EnumeratedTask {
  /** Directory basename — the row id. */
  id: string;
  /** Path relative to the playbook dir (e.g. `tasks/01-brief/tasks/01-product-brief`). */
  dir: string;
  /** Parent id when nested under another task's `tasks/` wrapper, undefined for top-level. */
  parent: string | undefined;
}

/**
 * Recursively walk the playbook's `tasks/` directory and emit one
 * `EnumeratedTask` per TASK.md. Inside a `tasks/<id>/tasks/` wrapper, any
 * name with `TASK.md` qualifies (kebab-case allowed). The
 * `seeds`/`templates`/`_*` directories are skipped at every level.
 *
 * Bare-dir recursion (one level deep into a non-`tasks/` subdir) is NOT
 * supported here — every fixture uses the explicit `tasks/` wrapper.
 */
function enumerateTasksTree(playbookDir: string): EnumeratedTask[] {
  const tasksRoot = join(playbookDir, "tasks");
  if (!existsSync(tasksRoot)) return [];
  const out: EnumeratedTask[] = [];
  walkTasksDir(tasksRoot, /* parent */ undefined, "tasks", out);
  return out;
}

function walkTasksDir(
  absDir: string,
  parent: string | undefined,
  relPrefix: string,
  out: EnumeratedTask[],
): void {
  if (!existsSync(absDir)) return;
  for (const entry of readdirSync(absDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (
      entry.name === "seeds" ||
      entry.name === "templates" ||
      entry.name.startsWith("_")
    )
      continue;

    const childAbs = join(absDir, entry.name);
    const taskMd = join(childAbs, "TASK.md");
    if (!existsSync(taskMd)) continue;

    const childRel = join(relPrefix, entry.name);
    out.push({ id: entry.name, dir: childRel, parent });

    // Recurse into the child's `tasks/` wrapper.
    const nestedWrapper = join(childAbs, "tasks");
    if (existsSync(nestedWrapper)) {
      walkTasksDir(nestedWrapper, entry.name, join(childRel, "tasks"), out);
    }
  }
}

/**
 * Group enumerated tasks by parent (undefined = top-level), sort each group
 * alphabetically, and emit `depends_on: [prevSibling]` for the i > 0 children.
 * This is RFC 0034 sibling chaining per parent group, applied uniformly to
 * top-level and nested rows.
 */
function buildSiblingChains(enumerated: EnumeratedTask[]): {
  id: string;
  dir: string;
  parent: string | undefined;
  dependsOn: string[];
}[] {
  const groups = new Map<string | undefined, EnumeratedTask[]>();
  for (const entry of enumerated) {
    const key = entry.parent;
    let g = groups.get(key);
    if (!g) {
      g = [];
      groups.set(key, g);
    }
    g.push(entry);
  }
  const out: {
    id: string;
    dir: string;
    parent: string | undefined;
    dependsOn: string[];
  }[] = [];
  for (const g of groups.values()) {
    g.sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < g.length; i++) {
      out.push({
        id: g[i].id,
        dir: g[i].dir,
        parent: g[i].parent,
        dependsOn: i === 0 ? [] : [g[i - 1].id],
      });
    }
  }
  return out;
}

/**
 * Create `<inventoryDir>/tasks.jsonl` from a folder playbook's `tasks/`
 * directory when no inventory exists yet. This is the bootstrap that makes the
 * unified inventory the single source of truth for folder playbooks: once the
 * file exists, `compilePlaybook` always takes the unified path and
 * `syncStaticTasksFromDisk` keeps it reconciled.
 *
 * No-op when `tasks.jsonl` already exists (append-only reconcile owns that) or
 * when there's no `tasks/` directory to scan.
 *
 * RFC 0034: tasks are auto-chained alphabetically — each row's `depends_on`
 * points at its previous sibling. RFC 0049: the chain is per parent group, so
 * a row's `parent` field is set when nested and its `depends_on` is the
 * previous sibling among rows sharing the same parent. Top-level rows have
 * `parent: undefined` and chain among themselves.
 */
export function bootstrapInventoryFromDisk(
  playbookDir: string,
  inventoryDir: string,
  playbookName: string,
): void {
  const tasksFile = join(inventoryDir, "tasks.jsonl");
  if (existsSync(tasksFile)) return;

  const enumerated = enumerateTasksTree(playbookDir);
  if (enumerated.length === 0) return;

  const now = new Date().toISOString();
  const header = buildHeaderFromPlaybookYml(playbookDir, playbookName, now);

  const rows: UnifiedRuntimeTask[] = buildSiblingChains(enumerated).map(
    (entry) => ({
      kind: "task",
      id: entry.id,
      taskRef: { kind: "static", dir: entry.dir },
      parent: entry.parent,
      depends_on: entry.dependsOn,
      status: "todo",
      source: "static",
      playbook: playbookName,
      createdAt: now,
      updatedAt: now,
    }),
  );

  writeUnifiedTasksFile(tasksFile, header, rows);
}

/**
 * Build the unified `kind:"playbook"` header from `playbook.yml`. Global
 * `checks:`, `goals:`, hooks, inputs, etc. live on the header — the unified
 * loader sources them from here, not from `playbook.yml` directly. Falls back
 * to a minimal header when `playbook.yml` is absent or unparseable.
 */
function buildHeaderFromPlaybookYml(
  playbookDir: string,
  playbookName: string,
  now: string,
): RuntimePlaybookHeader {
  const ymlPath = join(playbookDir, "playbook.yml");
  if (existsSync(ymlPath)) {
    try {
      const parsed = parseYaml(readFileSync(ymlPath, "utf-8")) as any;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return {
          kind: "playbook",
          schemaVersion: 1,
          name: parsed.name ?? playbookName,
          description: parsed.description,
          seed_api_version: parsed.seed_api_version,
          key: parsed.key,
          inputs: parsed.inputs,
          variables: parsed.variables ?? {},
          run: parsed.run ?? {},
          skills: parsed.skills ?? {},
          checks: parsed.checks ?? [],
          goals: parsed.goals ?? [],
          hooks: parsed.hooks ?? [],
          createdAt: now,
          updatedAt: now,
        };
      }
    } catch {
      // fall through to minimal header
    }
  }
  return {
    kind: "playbook",
    schemaVersion: 1,
    name: playbookName,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Append rows to `tasks.jsonl` for any `tasks/<id>/TASK.md` directories
 * (top-level OR nested) that exist on disk but are not yet recorded in
 * the inventory. No-op when the inventory file is missing (initial-state
 * playbook) or when the `tasks/` directory doesn't exist.
 *
 * Implementation note: we read raw JSONL lines (not the parsed/filtered
 * task list) so that legacy rows the strict parser would skip — like
 * synthetic `root-converge`/`root-diverge` sentinels that lack `taskRef`
 * — survive the rewrite. New rows get `depends_on: []` (sync is
 * append-only and does not re-derive the sibling chain — that lives in
 * `bootstrapInventoryFromDisk`).
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
  try {
    raw = readFileSync(tasksFile, "utf-8");
  } catch {
    return;
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

  const knownIds = new Set<string>();
  let hasHeader = false;
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row?.kind === "playbook") hasHeader = true;
      else if (row?.kind === "task" && typeof row.id === "string")
        knownIds.add(row.id);
    } catch {
      /* skip malformed */
    }
  }

  const newRows: UnifiedRuntimeTask[] = [];
  const now = new Date().toISOString();
  for (const entry of enumerateTasksTree(playbookDir)) {
    if (knownIds.has(entry.id)) continue;
    newRows.push({
      kind: "task",
      id: entry.id,
      taskRef: { kind: "static", dir: entry.dir },
      parent: entry.parent,
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
    const synthHeader: import("../task/goal/unified-tasks.ts").RuntimePlaybookHeader =
      {
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
  console.error(
    `[compile] discovered new tasks: ${newRows.map((t) => t.id).join(", ")}`,
  );
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
    const { gitCommitHook, prCreateHook } =
      await import("../hooks/builtins/git.js");
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
        else if (entry.name === "TASK.md")
          hash.update(readFileSync(full, "utf-8"));
      }
    };
    walk(tasksDir);
  }
  return `sha256:${hash.digest("hex")}`;
}
