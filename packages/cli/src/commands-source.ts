import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve, join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { FreshnessSpec, FreshnessResult } from "@converge/core/freshness/types.ts";
import { evaluateFreshness } from "@converge/core/freshness/index.ts";

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

export interface SourceFreshnessOptions {
  dir: string;
  select?: string;
}

export async function sourceFreshnessCommand(options: SourceFreshnessOptions): Promise<void> {
  const projectDir = resolve(options.dir);
  const playbookPath = join(projectDir, "playbook.yml");

  if (!existsSync(playbookPath)) {
    console.error(`No playbook.yml found at ${projectDir}`);
    process.exit(1);
  }

  const playbookYaml = readFileSync(playbookPath, "utf-8");
  const playbook = parseYaml(playbookYaml) as Record<string, unknown>;
  const tasks = (Array.isArray(playbook.tasks) ? playbook.tasks : []) as Array<Record<string, unknown>>;

  const now = Date.now();
  let hasError = false;

  for (const task of tasks) {
    const taskName = task.name ? String(task.name) : undefined;
    if (!taskName) continue;

    if (options.select) {
      const [key, value] = options.select.split(":");
      if (key === "name" && taskName !== value) continue;
    }

    const taskDir = join(projectDir, taskName);
    const taskMdPath = join(taskDir, "TASK.md");

    if (!existsSync(taskMdPath)) continue;

    const content = readFileSync(taskMdPath, "utf-8");
    const { fm } = parseFrontmatter(content);
    const freshnessCfg = fm.freshness as Record<string, unknown> | undefined;

    if (!freshnessCfg) continue;

    const fileStat = statSync(taskMdPath);
    const loaded_at_mtime =
      typeof freshnessCfg.loaded_at_mtime === "number"
        ? freshnessCfg.loaded_at_mtime
        : fileStat.mtimeMs;

    const spec: FreshnessSpec = {
      loaded_at_mtime: loaded_at_mtime as number,
      warn_after: freshnessCfg.warn_after as [number, string],
      error_after: freshnessCfg.error_after as [number, string],
    };

    const result: FreshnessResult = evaluateFreshness(spec, now);
    const delta = now - spec.loaded_at_mtime;

    console.log(`${taskName}   ${result}   ${delta}ms`);

    if (result === "error") hasError = true;
  }

  if (hasError) process.exit(1);
}
