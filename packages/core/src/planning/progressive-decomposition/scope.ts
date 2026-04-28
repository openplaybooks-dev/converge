/**
 * Scope packet reader.
 *
 * Reads the deterministic O(depth) packet that gets fed to phase 1:
 *   1. Project brief (idea.md)
 *   2. playbook.yml
 *   3. Root PLAN.md
 *   4. Ancestor PLAN.md + TASK.md, in order
 *   5. My own TASK.md (the contract my parent wrote)
 *   6. Previous PLAN.md (update mode only)
 *
 * Never reads siblings. Never reads descendants. The reading rule.
 */

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { PlanLayerOpts, ScopeAncestor, ScopePacket } from "./types.ts";

export function readScopePacket(opts: PlanLayerOpts): ScopePacket {
  const result: ScopePacket = { ancestors: [] };

  const ideaPath = join(opts.projectDir, "idea.md");
  const ideaMd = join(opts.projectDir, "IDEA.md");
  if (existsSync(ideaPath)) result.brief = readFileSync(ideaPath, "utf8");
  else if (existsSync(ideaMd)) result.brief = readFileSync(ideaMd, "utf8");

  const pbYml = join(opts.playbookRoot, "playbook.yml");
  const pbYaml = join(opts.playbookRoot, "playbook.yaml");
  if (existsSync(pbYml)) result.playbookYml = readFileSync(pbYml, "utf8");
  else if (existsSync(pbYaml))
    result.playbookYml = readFileSync(pbYaml, "utf8");

  if (opts.nodePath !== opts.playbookRoot) {
    const rootPlan = join(opts.playbookRoot, "PLAN.md");
    if (existsSync(rootPlan)) result.rootPlan = readFileSync(rootPlan, "utf8");
  }

  if (opts.nodePath !== opts.playbookRoot) {
    const relFromRoot = relative(opts.playbookRoot, opts.nodePath);
    const segments = relFromRoot.split(/[/\\]/);
    let cur = opts.playbookRoot;
    for (let i = 0; i < segments.length - 1; i++) {
      cur = join(cur, segments[i]);
      const anc: ScopeAncestor = { path: cur };
      const ap = join(cur, "PLAN.md");
      const at = join(cur, "TASK.md");
      if (existsSync(ap)) anc.plan = readFileSync(ap, "utf8");
      if (existsSync(at)) anc.task = readFileSync(at, "utf8");
      result.ancestors.push(anc);
    }
  }

  const myTask = join(opts.nodePath, "TASK.md");
  if (existsSync(myTask)) result.myTask = readFileSync(myTask, "utf8");

  const prev = join(opts.nodePath, "PLAN.previous.md");
  if (existsSync(prev)) result.previousPlan = readFileSync(prev, "utf8");

  return result;
}

/** Render a path relative to the project dir for display in prompts. */
export function rel(p: string, projectDir: string): string {
  if (p.startsWith(projectDir + "/")) return p.slice(projectDir.length + 1);
  if (p === projectDir) return ".";
  return p;
}
