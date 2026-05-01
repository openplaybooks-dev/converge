import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { parse as parseYaml } from "yaml";
import {
  hashTaskFrontmatter,
  hashTaskBody,
  hashTaskChecks,
  hashInputs,
  hashUpstream,
} from "@converge/core/hash/index.ts";
import { writeManifest } from "@converge/core/manifest/index.ts";

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

export interface CompileOptions {
  dir: string;
  seed?: boolean;
  select?: string;
}

export async function compileCommand(options: CompileOptions): Promise<void> {
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

  // When --seed is set, execute WBS for matching tasks to materialize children
  if (options.seed) {
    const selection = options.select;
    if (!selection) {
      console.error("--seed requires --select to specify which task(s) to seed");
      process.exit(1);
    }

    for (const [taskName] of depMap) {
      if (taskName !== selection) continue;
      const taskDir = join(projectDir, taskName);
      const taskMdPath = join(taskDir, "TASK.md");
      if (!existsSync(taskMdPath)) continue;

      const content = readFileSync(taskMdPath, "utf-8");
      const { fm } = parseFrontmatter(content);
      if (!fm.wbs) {
        console.error(`Task "${taskName}" has no wbs to seed`);
        process.exit(1);
      }

      const wbsRelPath = String(fm.wbs);
      const wbsAbsPath = resolve(taskDir, wbsRelPath);
      if (!existsSync(wbsAbsPath)) {
        console.error(`WBS script not found: ${wbsAbsPath}`);
        process.exit(1);
      }

      const playbookTasksDir = join(projectDir, ".converge", "playbooks", playbookName, "tasks");
      const playbookParentDir = join(playbookTasksDir, taskName);

      // Load the WBS module (handles both ESM and CJS).
      // Detect CJS by reading the file — avoids parse errors from import().
      const wbsSource = readFileSync(wbsAbsPath, "utf-8");
      const isCjs =
        /\bmodule\.exports\b/.test(wbsSource) ||
        /\brequire\s*\(/.test(wbsSource);

      let wbsFn: Function | undefined;
      if (isCjs) {
        // createRequire still respects nearest package.json "type": "module",
        // which would treat .js files as ESM. Write a .cjs copy so require
        // picks the CJS loader unconditionally.
        const { mkdtempSync, rmSync } = await import("node:fs");
        const { tmpdir } = await import("node:os");
        const tmpDir = mkdtempSync(join(tmpdir(), "converge-wbs-"));
        const cjsPath = join(tmpDir, "wbs.cjs");
        writeFileSync(cjsPath, wbsSource, "utf-8");
        try {
          const req = createRequire(cjsPath);
          const cjsMod = req(cjsPath);
          wbsFn =
            typeof cjsMod === "function"
              ? cjsMod
              : cjsMod.default ?? cjsMod.run ?? cjsMod.wbs;
        } finally {
          rmSync(tmpDir, { recursive: true, force: true });
        }
      } else {
        const fileUrl = pathToFileURL(wbsAbsPath);
        fileUrl.searchParams.set("t", String(Date.now()));
        const mod = await import(fileUrl.href);
        wbsFn = mod.default ?? mod.run ?? mod.wbs;
      }

      if (typeof wbsFn !== "function") {
        console.error(`WBS script at ${wbsRelPath} does not export a function`);
        process.exit(1);
      }

      // Build a minimal WBS context that writes children to the playbook tasks dir
      const spawnedTasks: Array<{ id: string; title?: string }> = [];
      const ctx = {
        projectDir,
        vars: {} as Record<string, unknown>,
        log: {
          info: (msg: string) => console.log(`[wbs:${taskName}] ${msg}`),
          warn: (msg: string) => console.warn(`[wbs:${taskName}] ${msg}`),
          error: (msg: string) => console.error(`[wbs:${taskName}] ${msg}`),
        },
        spawn: async (target: any, opts?: any) => {
          const childId = opts?.id ?? target?.id ?? target?.name;
          if (!childId) throw new Error("spawn target missing id/name");
          const childDir = join(playbookParentDir, childId);
          mkdirSync(childDir, { recursive: true });
          const title = opts?.label ?? target?.title ?? childId;
          writeFileSync(join(childDir, "TASK.md"), `# ${title}\n`);
          spawnedTasks.push({ id: childId, title });
        },
      };

      try {
        const result = await wbsFn(ctx);
        // Handle array-return pattern
        if (Array.isArray(result)) {
          for (const child of result) {
            const childId = child.id ?? child.name;
            if (!childId) continue;
            const childDir = join(playbookParentDir, childId);
            mkdirSync(childDir, { recursive: true });
            const title = child.title ?? childId;
            writeFileSync(join(childDir, "TASK.md"), `# ${title}\n`);
            spawnedTasks.push({ id: childId, title });
          }
        }
        console.log(`[wbs:${taskName}] Seeded ${spawnedTasks.length} task(s)`);
      } catch (err: any) {
        console.error(`WBS execution failed for "${taskName}": ${err.message}`);
        process.exit(1);
      }
    }
  }

  // Ensure TASK.md exists for every task and parse
  const concreteNodes: Record<string, unknown> = {};
  const frontierNodes: Record<string, unknown> = {};

  const playbookTasksDir = join(projectDir, ".converge", "playbooks", playbookName, "tasks");

  function hasSpawnedChildren(taskName: string): boolean {
    // Check projectDir/taskName/tasks/
    const projectTaskChildrenDir = join(projectDir, taskName, "tasks");
    if (existsSync(projectTaskChildrenDir) && readdirSync(projectTaskChildrenDir).length > 0) {
      return true;
    }
    // Check .converge/playbooks/<name>/tasks/<taskName>/ — but only during
    // --seed to avoid stale artifacts from a prior run confusing the frontier.
    if (!options.seed) return false;
    const playbookTaskDir = join(playbookTasksDir, taskName);
    if (!existsSync(playbookTaskDir)) return false;
    const entries = readdirSync(playbookTaskDir, { withFileTypes: true });
    return entries.some(
      (e) =>
        e.isDirectory() &&
        e.name !== "wbs" &&
        e.name !== "tasks" &&
        existsSync(join(playbookTaskDir, e.name, "TASK.md")),
    );
  }

  function discoverChildren(taskName: string): Array<{ id: string; title: string }> {
    const children: Array<{ id: string; title: string }> = [];
    const playbookTaskDir = join(playbookTasksDir, taskName);
    if (!existsSync(playbookTaskDir)) return children;

    const entries = readdirSync(playbookTaskDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === "wbs" || entry.name === "tasks") continue;
      const childTaskMd = join(playbookTaskDir, entry.name, "TASK.md");
      if (!existsSync(childTaskMd)) continue;

      const childContent = readFileSync(childTaskMd, "utf-8");
      const { body: childBody } = parseFrontmatter(childContent);
      // Title is first heading or the directory name
      const headingMatch = childBody.match(/^#\s+(.+)$/m);
      children.push({
        id: entry.name,
        title: headingMatch ? headingMatch[1].trim() : entry.name,
      });
    }
    return children;
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

    const baseNode = {
      id: taskName,
      depends_on,
      depended_on_by,
      tags: [],
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

      // Discover children for WBS parents that have spawned
      if (hasWbs && spawned) {
        const children = discoverChildren(taskName);
        for (const child of children) {
          const childId = `${taskName}/${child.id}`;
          concreteNodes[childId] = {
            id: childId,
            depends_on: [taskName],
            depended_on_by: [],
            tags: [],
            checks: [],
            inputs: [],
            outputs: [],
            frontmatter_hash: hashTaskFrontmatter({}),
            body_hash: hashTaskBody(child.title),
            checks_hash: hashTaskChecks([]),
            inputs_hash: hashTaskChecks([]),
            upstream_hash: "",
            state: "concrete",
            path: join(projectDir, taskName),
            wbs: null,
          };
        }
      }
    }
  }

  // Compute upstream hashes for all nodes (including WBS-spawned children)
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

  // Also compute for WBS-spawned children (not in depMap)
  const allNodeIds = [
    ...Object.keys(concreteNodes),
    ...Object.keys(frontierNodes),
  ];
  for (const taskName of allNodeIds) {
    if (depMap.has(taskName)) continue; // already computed above
    const node = (concreteNodes[taskName] ?? frontierNodes[taskName]) as Record<string, unknown>;
    const deps = (node?.depends_on as string[]) ?? [];
    computeUpstreamHash(taskName, deps);
  }

  // Compute drifted hash (body + output files) for each concrete node
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

  const allNodes: Record<string, unknown> = {
    ...concreteNodes,
    ...frontierNodes,
  };
  const parent_map: Record<string, string[]> = {};
  const child_map: Record<string, string[]> = {};
  for (const [id, node] of Object.entries(allNodes)) {
    const n = node as { depends_on?: string[]; depended_on_by?: string[] };
    parent_map[id] = (n.depends_on ?? []).slice();
    child_map[id] = (n.depended_on_by ?? []).slice();
  }

  const manifest = {
    metadata: {
      playbook: playbookName,
      playbook_hash: playbookHash,
      manifest_version: 1,
      generated_at: new Date().toISOString(),
      converge_version: "0.1.0",
      frontier_count: frontierCount,
    },
    nodes: allNodes,
    parent_map,
    child_map,
    concrete: concreteNodes,
    frontier: frontierNodes,
  };

  await writeManifest(projectDir, manifest as Parameters<typeof writeManifest>[1]);

  // Ensure journal/<playbook>/target/ exists and stale subdirs are removed
  // so the journal only contains target/ after compile.
  const journalDir = join(projectDir, ".converge", "journal", playbookName);
  if (existsSync(journalDir)) {
    const entries = readdirSync(journalDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        rmSync(join(journalDir, entry.name), { recursive: true, force: true });
      }
    }
  }
  mkdirSync(join(journalDir, "target"), { recursive: true });
}
