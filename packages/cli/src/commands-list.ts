import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import { parseSelector, resolveSelection } from "@converge/core/select/index.ts";

export interface ListOptions {
  dir: string;
  select?: string;
  state?: string;
}

function parseFrontmatter(content: string): { fm: Record<string, unknown>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { fm: {}, body: content.trim() };
  }
  try {
    const fm = parseYaml(match[1]) as Record<string, unknown>;
    return { fm: fm ?? {}, body: match[2] ?? "" };
  } catch {
    return { fm: {}, body: content.trim() };
  }
}

export async function listCommand(options: ListOptions): Promise<void> {
  const projectDir = resolve(options.dir);
  const playbookPath = join(projectDir, "playbook.yml");

  if (!existsSync(playbookPath)) {
    console.error("No playbook.yml found. Run `converge compile` first.");
    process.exit(1);
  }

  const playbookYaml = readFileSync(playbookPath, "utf-8");
  const playbook = parseYaml(playbookYaml) as Record<string, unknown>;
  const tasks = (Array.isArray(playbook.tasks) ? playbook.tasks : []) as Array<Record<string, unknown>>;

  const nodes: Record<string, {
    id: string;
    state: string;
    depends_on: string[];
    depended_on_by: string[];
    wbs: { type: string; path: string } | null;
    tags: string[];
  }> = {};
  const child_map: Record<string, string[]> = {};
  const parent_map: Record<string, string[]> = {};

  for (const task of tasks) {
    const name = task.name ? String(task.name) : task.id ? String(task.id) : undefined;
    if (!name) continue;

    const deps = Array.isArray(task.depends_on) ? task.depends_on.map(String) : [];

    const taskDir = join(projectDir, name);
    let wbs: { type: string; path: string } | null = null;
    let state = "concrete";
    let tags: string[] = [];

    if (existsSync(join(taskDir, "TASK.md"))) {
      const taskContent = readFileSync(join(taskDir, "TASK.md"), "utf-8");
      const { fm } = parseFrontmatter(taskContent);

      if (fm.tags) {
        tags = Array.isArray(fm.tags) ? fm.tags.map(String) : [String(fm.tags)];
      }

      if (fm.wbs !== undefined) {
        const tasksDir = join(taskDir, "tasks");
        const hasSpawnedChildren =
          existsSync(tasksDir) && readdirSync(tasksDir).length > 0;
        if (!hasSpawnedChildren) {
          state = "frontier";
          wbs = { type: "script", path: String(fm.wbs) };
        }
      }
    }

    nodes[name] = {
      id: name,
      state,
      depends_on: deps,
      depended_on_by: [],
      wbs,
      tags,
    };

    child_map[name] = [];
    parent_map[name] = [...deps];
  }

  // Compute depended_on_by and child_map
  for (const [name, node] of Object.entries(nodes)) {
    for (const dep of node.depends_on) {
      if (nodes[dep]) {
        nodes[dep].depended_on_by.push(name);
      }
      if (child_map[dep]) {
        child_map[dep].push(name);
      }
    }
  }

  const selfBuilt = { nodes, child_map, parent_map };

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

  let manifest: typeof selfBuilt & { metadata?: any };
  let stateManifest: typeof manifest | undefined;

  if (options.state) {
    const compiledPath = join(projectDir, "target", "manifest.json");
    if (existsSync(compiledPath)) {
      manifest = loadCompiledManifest(compiledPath);
    } else {
      manifest = selfBuilt;
    }
    const statePath = join(options.state, "manifest.json");
    if (existsSync(statePath)) {
      stateManifest = loadCompiledManifest(statePath);
    }
  } else {
    manifest = selfBuilt;
  }

  const selector = options.select || undefined;

  // For state:modified.drifted, compute current drift hash (body + outputs)
  // and compare against the compile-time drift hash from the last manifest.
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
      // Include output file hashes
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
      // Capture compile-time hash before overwriting with current disk hash
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
    const result = resolveSelection(parsed, manifest, {
      stateManifest,
    });
    ids = [...result.ids];
    frontiers = result.frontiers;
  } else {
    ids = Object.keys(manifest.nodes);
    frontiers = [];
  }

  // Also flag matched nodes that are themselves frontiers
  for (const id of ids) {
    const node = manifest.nodes[id];
    if (node && node.state === "frontier" && node.wbs) {
      const reason = typeof node.wbs === "string" ? node.wbs : node.wbs.path;
      frontiers.push({ parentId: id, reason });
    }
  }

  for (const id of ids) {
    const node = manifest.nodes[id];
    if (node && node.state !== "concrete") {
      console.log(`${id} [${node.state}]`);
    } else {
      console.log(id);
    }
  }

  for (const f of frontiers) {
    console.error(`${f.parentId}: warning: ${f.reason}`);
  }
}
