import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { parseSelector, resolveSelection } from "@converge/core/select/index.ts";

export interface TestOptions {
  dir?: string;
  select?: string;
  exclude?: string;
}

interface CheckDef {
  id: string;
  cmd: string;
}

export async function testCommand(options: TestOptions): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const playbookName = process.env.CONVERGE_PLAYBOOK || "default";

  const playbookDir = join(projectDir, ".converge", "playbooks", playbookName);

  // Load playbook
  let playbook: Record<string, unknown> | null = null;
  const playbookPath = join(playbookDir, "playbook.yml");
  const altPath = join(playbookDir, "playbook.yaml");
  const rootPb = join(projectDir, "playbook.yml");

  if (existsSync(playbookPath)) {
    playbook = parseYaml(readFileSync(playbookPath, "utf-8")) as Record<string, unknown>;
  } else if (existsSync(altPath)) {
    playbook = parseYaml(readFileSync(altPath, "utf-8")) as Record<string, unknown>;
  } else if (existsSync(rootPb)) {
    playbook = parseYaml(readFileSync(rootPb, "utf-8")) as Record<string, unknown>;
  }

  if (!playbook) {
    console.error("No playbook found.");
    return;
  }

  const tasks = (Array.isArray(playbook.tasks) ? playbook.tasks : []) as Array<Record<string, unknown>>;

  const nodes: Record<string, Record<string, unknown>> = {};
  const child_map: Record<string, string[]> = {};
  const parent_map: Record<string, string[]> = {};

  for (const task of tasks) {
    const name = String(task.name || task.id || "");
    if (!name) continue;

    const taskDir = join(playbookDir, "tasks", name);
    const taskMdPath = join(taskDir, "TASK.md");

    let tags: string[] = [];
    if (existsSync(taskMdPath)) {
      const content = readFileSync(taskMdPath, "utf-8");
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (fmMatch) {
        try {
          const fm = parseYaml(fmMatch[1]) as Record<string, unknown>;
          if (Array.isArray(fm.tags)) tags = fm.tags.map(String);
        } catch { /* ignore malformed frontmatter */ }
      }
    }

    nodes[name] = {
      id: name,
      state: "concrete",
      depends_on: [],
      depended_on_by: [],
      seed: null,
      tags,
    };
    child_map[name] = [];
    parent_map[name] = [];
  }

  const manifest = { nodes, child_map, parent_map };

  // Resolve selection
  let selectedIds: Set<string>;
  if (options.select) {
    const selector = parseSelector(options.select);
    const result = resolveSelection(selector, manifest, {
      ...(options.exclude ? { exclude: parseSelector(options.exclude) } : {}),
    });
    selectedIds = result.ids;
  } else {
    selectedIds = new Set(Object.keys(nodes));
  }

  // Collect checks from selected tasks
  interface TaskCheck {
    taskId: string;
    check: CheckDef;
  }
  const taskChecks: TaskCheck[] = [];
  for (const id of selectedIds) {
    const taskDir = join(playbookDir, "tasks", id);
    const taskMdPath = join(taskDir, "TASK.md");
    if (!existsSync(taskMdPath)) continue;

    const content = readFileSync(taskMdPath, "utf-8");
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) continue;

    try {
      const fm = parseYaml(fmMatch[1]) as Record<string, unknown>;
      const checks = Array.isArray(fm.checks) ? fm.checks as CheckDef[] : [];
      for (const check of checks) {
        taskChecks.push({ taskId: id, check });
      }
    } catch { /* skip */ }
  }

  // Run checks and report
  let passed = 0;
  let failed = 0;

  for (const { taskId, check } of taskChecks) {
    try {
      execSync(check.cmd, { cwd: projectDir, stdio: "pipe" });
      console.log(`  PASS ${taskId}/${check.id}`);
      passed++;
    } catch {
      console.log(`  FAIL ${taskId}/${check.id}`);
      failed++;
    }
  }

  console.log(`\nPASS: ${passed}  FAIL: ${failed}`);
  console.log(`${passed} passed`);
}
