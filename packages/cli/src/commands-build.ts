import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import {
  hashTaskFrontmatter,
  hashTaskBody,
  hashTaskChecks,
  hashUpstream,
} from "@converge/core/hash/index.ts";
import { writeManifest } from "@converge/core/manifest/index.ts";
import { parseSelector } from "@converge/core/select/index.ts";

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

export interface BuildOptions {
  dir: string;
  select?: string;
  exclude?: string;
  /** Default true — stop on first uncorrectable failure */
  failFast?: boolean;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const projectDir = resolve(options.dir);
  const playbookPath = join(projectDir, "playbook.yml");

  if (!existsSync(playbookPath)) {
    console.error(`No playbook.yml found at ${projectDir}`);
    process.exit(1);
  }

  const playbookYaml = readFileSync(playbookPath, "utf-8");
  const playbook = parseYaml(playbookYaml) as Record<string, unknown>;
  const playbookName = String(playbook.name || "default");
  const tasks = (Array.isArray(playbook.tasks) ? playbook.tasks : []) as Array<Record<string, unknown>>;

  // Build task name → depends_on map
  const taskMap = new Map<string, string[]>();
  for (const task of tasks) {
    const name = task.name ? String(task.name) : task.id ? String(task.id) : undefined;
    if (!name) continue;
    const deps = Array.isArray(task.depends_on) ? task.depends_on.map(String) : [];
    taskMap.set(name, deps);
  }

  // Compute depended_on_by for each task
  const depMap = new Map<string, { depends_on: string[]; depended_on_by: string[] }>();
  for (const [taskName, deps] of taskMap) {
    const depended_on_by: string[] = [];
    for (const [otherName, otherDeps] of taskMap) {
      if (otherDeps.includes(taskName)) {
        depended_on_by.push(otherName);
      }
    }
    depMap.set(taskName, { depends_on: deps, depended_on_by });
  }

  const concreteNodes: Record<string, unknown> = {};
  const frontierNodes: Record<string, unknown> = {};

  function hasSpawnedChildren(taskName: string): boolean {
    const projectTaskChildrenDir = join(projectDir, taskName, "tasks");
    if (existsSync(projectTaskChildrenDir) && readdirSync(projectTaskChildrenDir).length > 0) {
      return true;
    }
    return false;
  }

  for (const [taskName, { depends_on, depended_on_by }] of depMap) {
    const taskDir = join(projectDir, taskName);
    const taskMdPath = join(taskDir, "TASK.md");

    if (!existsSync(taskMdPath)) {
      mkdirSync(taskDir, { recursive: true });
      writeFileSync(taskMdPath, `# ${taskName}\n`);
    }

    const content = readFileSync(taskMdPath, "utf-8");
    const { fm, body } = parseFrontmatter(content);

    const hasWbs = fm.wbs !== undefined;
    const spawned = hasSpawnedChildren(taskName);

    const checksArr = Array.isArray(fm.checks) ? fm.checks as Array<Record<string, unknown>> : [];
    const inputsArr = Array.isArray(fm.inputs) ? fm.inputs : [];
    const tagsArr = Array.isArray(fm.tags) ? fm.tags.map(String) : [];

    const baseNode = {
      id: taskName,
      depends_on,
      depended_on_by,
      tags: tagsArr,
      checks: checksArr,
      inputs: inputsArr,
      outputs: [],
      frontmatter_hash: hashTaskFrontmatter(fm),
      body_hash: hashTaskBody(body),
      checks_hash: hashTaskChecks(checksArr),
      inputs_hash: hashTaskChecks(inputsArr as Array<Record<string, unknown>>),
      upstream_hash: "",
    };

    if (hasWbs && !spawned) {
      frontierNodes[taskName] = {
        ...baseNode,
        state: "frontier",
        wbs_parent: playbookName,
      };
    } else {
      concreteNodes[taskName] = {
        ...baseNode,
        state: "concrete",
        path: taskDir,
        wbs: fm.wbs ? String(fm.wbs) : null,
      };
    }
  }

  // Compute upstream hashes
  function computeUpstreamHash(taskName: string, depends_on: string[]) {
    const node = (concreteNodes[taskName] ?? frontierNodes[taskName]) as Record<string, unknown> | undefined;
    if (!node || depends_on.length === 0) return;

    const parentHashes = depends_on
      .filter((d) => concreteNodes[d] || frontierNodes[d])
      .map((d) => {
        const parent = (concreteNodes[d] ?? frontierNodes[d]) as Record<string, unknown>;
        return {
          frontmatter: String(parent.frontmatter_hash),
          body: String(parent.body_hash),
          inputs: String(parent.inputs_hash),
        };
      });

    if (parentHashes.length > 0) {
      node.upstream_hash = hashUpstream(parentHashes);
    }
  }

  for (const [taskName, { depends_on }] of depMap) {
    computeUpstreamHash(taskName, depends_on);
  }

  // Compute drifted hash for each concrete node
  const targetDir = join(projectDir, "target");
  for (const [taskName, node] of Object.entries(concreteNodes)) {
    const n = node as Record<string, unknown>;
    const hasher = createHash("sha256");
    hasher.update(String(n.body_hash));
    const outputDir = join(targetDir, taskName);
    if (existsSync(outputDir)) {
      const entries = readdirSync(outputDir, { recursive: true });
      const fileList = entries
        .filter((f) => statSync(join(outputDir, f)).isFile())
        .sort();
      for (const rel of fileList) {
        hasher.update(rel);
        hasher.update(readFileSync(join(outputDir, rel)));
      }
    }
    n.drifted = `sha256:${hasher.digest("hex")}`;
  }

  const frontierCount = Object.keys(frontierNodes).length;

  const playbookHash = `sha256:${createHash("sha256").update(playbookYaml).digest("hex")}`;

  const manifest = {
    metadata: {
      playbook: playbookName,
      playbook_hash: playbookHash,
      manifest_version: 1,
      generated_at: new Date().toISOString(),
      converge_version: "0.1.0",
      frontier_count: frontierCount,
    },
    concrete: concreteNodes,
    frontier: frontierNodes,
  };

  await writeManifest(projectDir, manifest as Parameters<typeof writeManifest>[1]);
}
