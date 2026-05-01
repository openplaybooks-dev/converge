import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";

export interface DebugOptions {
  dir?: string;
  revalidate?: boolean;
}

export async function debugCommand(options: DebugOptions): Promise<void> {
  const projectDir = resolve(options.dir || process.cwd());
  const journalDir = join(projectDir, ".converge", "journal");

  if (!existsSync(journalDir)) {
    process.exit(0);
  }

  let anyFail = false;

  for (const pb of readdirSync(journalDir)) {
    const pbDir = join(journalDir, pb);
    if (!statSync(pbDir).isDirectory()) continue;
    const tasksDir = join(pbDir, "tasks");
    if (!existsSync(tasksDir)) continue;

    for (const taskId of readdirSync(tasksDir)) {
      const taskDir = join(tasksDir, taskId);
      if (!statSync(taskDir).isDirectory()) continue;

      const ckptPath = join(taskDir, "checkpoint.json");
      const taskMdPath = join(taskDir, "TASK.md");

      if (!existsSync(ckptPath) || !existsSync(taskMdPath)) continue;

      const checkpoint = JSON.parse(readFileSync(ckptPath, "utf-8"));
      if (checkpoint.status !== "complete") continue;

      const taskContent = readFileSync(taskMdPath, "utf-8");
      const fmMatch = taskContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      if (!fmMatch) continue;

      const fm = parseYaml(fmMatch[1]) as Record<string, unknown>;
      const checks = fm.checks as Array<{ id: string; cmd?: string }> | undefined;
      if (!checks || !Array.isArray(checks)) continue;

      let taskFailed = false;
      for (const check of checks) {
        if (!check.cmd) continue;
        const r = spawnSync(check.cmd, [], {
          cwd: taskDir,
          shell: true,
          stdio: "ignore",
        });
        if (r.status !== 0) {
          taskFailed = true;
          break;
        }
      }

      if (taskFailed) {
        process.stderr.write(`  ${taskId}: fail\n`);
        anyFail = true;
      } else {
        process.stderr.write(`  ${taskId}: pass\n`);
      }
    }
  }

  if (anyFail) process.exit(1);
}
