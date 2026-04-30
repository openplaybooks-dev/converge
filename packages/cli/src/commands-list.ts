import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import { parseSelector, resolveSelection } from "@converge/core/select/index.ts";

export interface ListOptions {
  dir: string;
  select?: string;
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

  const manifest = { nodes, child_map, parent_map };

  const selector = options.select || undefined;
  let ids: string[];
  let frontiers: { parentId: string; reason: string }[];

  if (selector) {
    const parsed = parseSelector(selector);
    const result = resolveSelection(parsed, manifest);
    ids = [...result.ids];
    frontiers = result.frontiers;
  } else {
    ids = Object.keys(nodes);
    frontiers = [];
  }

  // Also flag matched nodes that are themselves frontiers
  for (const id of ids) {
    const node = nodes[id];
    if (node && node.state === "frontier" && node.wbs) {
      frontiers.push({ parentId: id, reason: node.wbs.path });
    }
  }

  for (const id of ids) {
    const node = nodes[id];
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
