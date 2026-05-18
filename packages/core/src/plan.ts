/**
 * Public planner verb.
 *
 * `plan(opts)` is `run(definePlannerPlaybook(opts), opts)` — a stable,
 * documented entry point on core's public surface. Both the CLI's
 * `converge plan` and the studio's `/api/playbooks/plan` Route Handler
 * call this function directly. There is no CLI in the studio's path.
 */

import { join } from "node:path";
import { run } from "./run/index.js";
import type { RunOptions, RunResult } from "./run/index.js";
import { definePlannerPlaybook, slugifyPrompt } from "./playbooks/planner/index.js";
import type { AgentfnFactory } from "./planning/progressive-decomposition/analyze.js";

export interface PlanOptions extends Omit<RunOptions, "playbookDir"> {
  /** Free-form description of what to plan. */
  goal: string;
  /**
   * Where the produced playbook lands on disk (absolute path).
   * Defaults to `<projectDir>/.converge/playbooks/<derived-slug>`.
   */
  outputDir?: string;
  /** Optional kebab-case slug; if omitted, derived from the goal. */
  name?: string;
  /** Re-plan an existing PLAN.md in place. */
  update?: boolean;
  /**
   * Override the agent factory used by the analyze step. Tests stub
   * this; production callers leave it undefined to use the global
   * default from `@openplaybooks/converge-agentfn`.
   *
   * Note: this is distinct from `RunOptions.agentfn`, which threads
   * through to the runtime's executor pipeline (used when running
   * agent tasks). The planner's analyze step takes its own agent
   * because it pre-dates the runtime's agent injection plumbing.
   */
  plannerAgentfn?: AgentfnFactory;
}

/**
 * Plan a new playbook. Wraps `definePlannerPlaybook` + `run`.
 *
 * Returns the same `RunResult` shape any other playbook does. The
 * produced playbook lives on disk at `outputDir`; consumers can then
 * call `loadPlaybookFromFolder(outputDir)` and `run(...)` to execute it.
 */
export async function plan(opts: PlanOptions): Promise<RunResult> {
  const slug = opts.name ?? slugifyPrompt(opts.goal) ?? "plan";
  const outputDir =
    opts.outputDir ?? join(opts.projectDir, ".converge", "playbooks", slug);

  const playbook = definePlannerPlaybook({
    goal: opts.goal,
    name: opts.name,
    outputDir,
    projectDir: opts.projectDir,
    update: opts.update,
    agentfn: opts.plannerAgentfn,
  });

  return run(playbook, {
    ...opts,
    playbookDir: outputDir,
  });
}
