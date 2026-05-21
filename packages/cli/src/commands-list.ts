import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { parseSelector, resolveSelection } from "@openplaybooks/converge-core/select";
import { buildDagFromPlaybook } from "@openplaybooks/converge-core/config";
import { readTaskInventoryState } from "@openplaybooks/converge-core/task/goal";

/** RFC 0033: Human-readable status label from inventory state. */
const INVENTORY_STATUS_LABEL: Record<string, string> = {
  done: "done",
  dropped: "failed",
  blocked: "blocked",
  todo: "todo",
  doing: "running",
};

export interface ListOptions {
  dir: string;
  select?: string;
  state?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const projectDir = resolve(options.dir);
  const playbookName = process.env.CONVERGE_PLAYBOOK || "default";

  const { dag, errors } = buildDagFromPlaybook(projectDir);

  if (errors.length > 0) {
    for (const err of errors) {
      console.error(`${err.type}: ${err.message}`);
    }
    process.exit(1);
  }

  // RFC 0033: Read runtime status from inventory (committed store).
  let inventoryState: Map<string, { status: string; completedAt?: string }> | undefined;
  try {
    const inv = readTaskInventoryState(projectDir, playbookName);
    inventoryState = new Map();
    for (const [id, task] of inv) {
      const raw = (task as any).status ?? "todo";
      inventoryState.set(id, {
        status: INVENTORY_STATUS_LABEL[raw] ?? raw,
        completedAt: (task as any).completedAt,
      });
    }
  } catch {
    // No inventory yet — use manifest-only display (existing behavior).
  }

  let manifest = dag.toManifest();
  let stateManifest: typeof manifest | undefined;

  if (options.state) {
    const compiledPath = join(projectDir, "target", "manifest.json");
    if (existsSync(compiledPath)) {
      manifest = loadCompiledManifest(compiledPath);
    }
    const statePath = join(options.state, "manifest.json");
    if (existsSync(statePath)) {
      stateManifest = loadCompiledManifest(statePath);
    }
  }

  const selector = options.select || undefined;

  if (selector && selector.includes("drifted")) {
    const targetDir = join(projectDir, "target");
    for (const [id, node] of Object.entries(manifest.nodes) as [string, any][]) {
      if (!node.path) continue;
      const hasher = createHash("sha256");
      const taskMdPath = join(node.path, "TASK.md");
      if (existsSync(taskMdPath)) {
        const content = readFileSync(taskMdPath, "utf-8");
        const body = content.includes("---")
          ? content.replace(/^---[\s\S]*?---\r?\n?/, "")
          : content;
        const lines = body.split("\n");
        while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
        const normalized = lines.map((l: string) => l.trimEnd()).join("\n") + "\n";
        hasher.update(`sha256:${createHash("sha256").update(normalized).digest("hex")}`);
      }
      const outputDir = join(targetDir, id);
      if (existsSync(outputDir)) {
        const entries = readdirSync(outputDir, { recursive: true });
        const fileList = entries
          .filter((f: string) => {
            try { return statSync(join(outputDir, f)).isFile(); } catch { return false; }
          })
          .sort();
        for (const rel of fileList) {
          hasher.update(rel);
          hasher.update(readFileSync(join(outputDir, rel)));
        }
      }
      node._compiledDrifted = node.drifted;
      node.drifted = `sha256:${hasher.digest("hex")}`;
    }
    if (stateManifest) {
      for (const [id, node] of Object.entries(stateManifest.nodes) as [string, any][]) {
        node.drifted = (manifest.nodes[id] as any)?._compiledDrifted ?? (manifest.nodes[id] as any)?.drifted;
      }
      for (const [, node] of Object.entries(manifest.nodes) as [string, any][]) {
        delete node._compiledDrifted;
      }
    }
  }

  let ids: string[];
  let frontiers: { parentId: string; reason: string }[];

  if (selector) {
    const parsed = parseSelector(selector);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = resolveSelection(parsed, manifest as any, {
      stateManifest: stateManifest as any,
    });
    ids = [...result.ids];
    frontiers = result.frontiers;
  } else {
    ids = Object.keys(manifest.nodes);
    frontiers = [];
  }

  for (const id of ids) {
    const node = manifest.nodes[id] as Record<string, any> | undefined;
    if (node && node.state === "frontier" && node.seed) {
      const reason = typeof node.seed === "string" ? node.seed : node.seedData.path;
      frontiers.push({ parentId: id, reason });
    }
  }

  if (ids.length === 0) {
    console.log("No tasks match selection");
  } else {
    for (const id of ids) {
      // RFC 0033: Show inventory status if available (authoritative).
      const invTask = inventoryState?.get(id);
      if (invTask && invTask.status !== "todo") {
        console.log(`${id} [${invTask.status}]`);
      } else {
        const node = manifest.nodes[id];
        if (node && node.state !== "concrete") {
          console.log(`${id} [${node.state}]`);
        } else {
          console.log(id);
        }
      }
    }
  }

  for (const f of frontiers) {
    console.error(`${f.parentId}: warning: ${f.reason}`);
  }
}

function loadCompiledManifest(filePath: string) {
  const json = JSON.parse(readFileSync(filePath, "utf-8"));
  const allNodes: Record<string, any> = { ...(json.concrete || {}), ...(json.frontier || {}) };
  const cm: Record<string, string[]> = {};
  const pm: Record<string, string[]> = {};
  for (const [id, node] of Object.entries(allNodes) as [string, any][]) {
    pm[id] = node.depends_on || [];
    if (!cm[id]) cm[id] = [];
    for (const dep of (node.depends_on || [])) {
      if (!cm[dep]) cm[dep] = [];
      cm[dep].push(id);
    }
  }
  return { nodes: allNodes, child_map: cm, parent_map: pm, metadata: json.metadata };
}
