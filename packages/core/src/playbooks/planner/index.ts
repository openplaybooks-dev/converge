/**
 * The planner expressed as a code-defined playbook.
 *
 * `definePlannerPlaybook(opts)` returns a `Playbook` whose tasks plan a
 * new playbook on disk. Four tasks, granular enough that the studio's
 * `PlanningConsole` shows real progress, simple enough that everything
 * except `analyze` is deterministic JS.
 *
 *   1. scaffold-root      — write stub playbook.yml (deterministic)
 *   2. analyze            — call `runAnalyze` to emit PLAN.md (LLM)
 *   3. parse-plan         — parse PLAN.md frontmatter; spawn() each
 *                            child so the studio's review surface
 *                            populates (deterministic)
 *   4. materialize-children — write tasks/<id>/TASK.md per child
 *                            (deterministic)
 *
 * The studio's `runPlanner` (planner-stream.ts) consumes the
 * `task-start` / `task-complete` / `children-spawned` events the
 * runtime emits as this playbook executes. No special planning
 * protocol — same lifecycle as any other playbook.
 *
 * Tests pass an `agentfn` stub through `opts` so the analyze step
 * runs without an LLM call.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { definePlaybook, taskDef } from "../../playbook.js";
import type { Playbook } from "../../playbook.js";
import { parsePlanMdFrontmatter } from "../../planning/progressive-decomposition/parser.js";
import { readScopePacket } from "../../planning/progressive-decomposition/scope.js";
import { runAnalyze } from "../../planning/progressive-decomposition/analyze.js";
import type { AgentfnFactory } from "../../planning/progressive-decomposition/analyze.js";
import type { PlanMeta } from "../../planning/progressive-decomposition/types.js";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface DefinePlannerPlaybookOpts {
  /** Free-form description of what to plan. */
  goal: string;
  /** Optional kebab-case slug for the produced playbook. */
  name?: string;
  /** Where the produced playbook lands on disk (absolute path). */
  outputDir: string;
  /**
   * Project dir (where `.converge/` lives). Used by `runAnalyze`
   * for scope-packet reads. Defaults to the parent of `outputDir`'s
   * `.converge/playbooks/` ancestor.
   */
  projectDir?: string;
  /** Re-plan an existing PLAN.md in place. */
  update?: boolean;
  /**
   * Override the agent factory. Tests stub this; production callers
   * leave it undefined to use `@converge/agentfn`'s default.
   */
  agentfn?: AgentfnFactory;
}

/**
 * Build the planner-playbook.
 *
 * The returned `Playbook` is interchangeable with any other playbook —
 * `run(playbook, opts)` accepts it. The CLI's `plan` verb and the
 * studio's `/api/playbooks/plan` route both call this via `plan(opts)`.
 */
export function definePlannerPlaybook(
  opts: DefinePlannerPlaybookOpts,
): Playbook {
  const slug = opts.name ?? slugifyPrompt(opts.goal) ?? "plan";
  const outputDir = opts.outputDir;
  const projectDir = opts.projectDir ?? deriveProjectDir(outputDir);
  const update = !!opts.update;
  const agentfn = opts.agentfn;

  return definePlaybook({
    name: `plan-${slug}`,
    description: `Plan a playbook for: ${truncate(opts.goal, 120)}`,
    inputs: {
      goal: { default: opts.goal, required: true },
    },
    run: { mode: "oneoff", maxTaskAttempts: 1 },
    tasks: [
      taskDef()
        .id("scaffold-root")
        .title("Scaffold the playbook root")
        .description(
          "Create the playbook directory with a stub playbook.yml so the " +
            "subsequent analyze step has somewhere to write PLAN.md.",
        )
        .executor(async (ctx: any) => {
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          const ymlPath = join(outputDir, "playbook.yml");
          if (!existsSync(ymlPath)) {
            const stub = [
              `name: ${slug}`,
              `description: ${jsonString(opts.goal)}`,
              "",
              "run:",
              "  mode: oneoff",
              "  maxTaskAttempts: 3",
              "",
              "tasks: []",
              "",
            ].join("\n");
            writeFileSync(ymlPath, stub, "utf8");
            ctx.log?.info?.(`wrote ${ymlPath}`);
          } else {
            ctx.log?.info?.(`${ymlPath} already exists, skipping scaffold`);
          }
        })
        .build(),

      taskDef()
        .id("analyze")
        .title("Analyze the goal and write PLAN.md")
        .description(
          "Phase 1 of progressive decomposition: one agent call that " +
            "reads the scope packet (root → ancestors → me) and writes " +
            "<outputDir>/PLAN.md. The PLAN.md must lead with YAML " +
            "frontmatter listing the layer's children (id + kind).",
        )
        .dependencies(["scaffold-root"])
        .executor(async (ctx: any) => {
          const planLayerOpts = {
            nodePath: outputDir,
            nodeKind: "playbook-root" as const,
            playbookRoot: outputDir,
            projectDir,
            prompt: opts.goal,
            update,
            isRoot: true,
          };
          const scope = readScopePacket(planLayerOpts);
          const logDir = join(projectDir, ".converge", "logs", "plan");
          mkdirSync(logDir, { recursive: true });

          await runAnalyze({
            opts: planLayerOpts,
            mode: update ? "update" : "fresh",
            scope,
            logDir,
            isRoot: true,
            agentfn,
          });
          ctx.log?.info?.(`wrote ${join(outputDir, "PLAN.md")}`);
        })
        .build(),

      taskDef()
        .id("parse-plan")
        .title("Parse PLAN.md and surface drafted children")
        .description(
          "Read the PLAN.md the analyze task just wrote, parse its " +
            "YAML frontmatter, and call ctx.spawn() once per declared " +
            "child. The runtime forwards these as `children-spawned` " +
            "events the studio renders in its plan-review surface.",
        )
        .dependencies(["analyze"])
        .executor(async (ctx: any) => {
          const planMdPath = join(outputDir, "PLAN.md");
          if (!existsSync(planMdPath)) {
            throw new Error(
              `parse-plan: PLAN.md not found at ${planMdPath} — analyze step did not produce it`,
            );
          }
          const planMd = readFileSync(planMdPath, "utf8");
          const meta: PlanMeta = parsePlanMdFrontmatter(planMd);
          ctx.log?.info?.(`parsed PLAN.md kind=${meta.kind}`);
          if (meta.kind === "leaf") {
            ctx.log?.info?.("leaf node — no children to spawn");
            return;
          }
          const children = meta.children ?? [];
          for (const child of children) {
            ctx.spawn({ id: child.id, title: child.title });
          }
          ctx.log?.info?.(`spawned ${children.length} children`);
        })
        .build(),

      taskDef()
        .id("materialize-children")
        .title("Write tasks/<id>/TASK.md for each child")
        .description(
          "Phase 2 of progressive decomposition (deterministic slice): " +
            "create the per-child contract files so the produced " +
            "playbook is runnable. Containers get a TASK.md stub + a " +
            "PLAN.md stub for later expansion; seeds get a SEED.md " +
            "stub. Executable leaves get a TASK.md stub the user " +
            "fills in (or a follow-up planner pass elaborates).",
        )
        .dependencies(["parse-plan"])
        .executor(async (ctx: any) => {
          const planMdPath = join(outputDir, "PLAN.md");
          if (!existsSync(planMdPath)) {
            throw new Error(
              `materialize-children: PLAN.md not found at ${planMdPath}`,
            );
          }
          const planMd = readFileSync(planMdPath, "utf8");
          const meta: PlanMeta = parsePlanMdFrontmatter(planMd);
          if (meta.kind === "leaf" || !meta.children) {
            ctx.log?.info?.("no children to materialize");
            return;
          }

          const tasksDir = join(outputDir, "tasks");
          const seedsDir = join(outputDir, "seeds");

          let written = 0;
          for (const child of meta.children) {
            if (child.kind === "seed") {
              const seedDir = join(seedsDir, child.id);
              mkdirSync(seedDir, { recursive: true });
              writeIfMissing(
                join(seedDir, "SEED.md"),
                buildSeedStub(child.id, child.title),
              );
              writeIfMissing(
                join(seedDir, "index.js"),
                buildSeedScriptStub(child.id),
              );
            } else {
              const childDir = join(tasksDir, child.id);
              mkdirSync(childDir, { recursive: true });
              writeIfMissing(
                join(childDir, "TASK.md"),
                buildTaskStub(child.id, child.title, child.kind),
              );
              if (child.kind === "container") {
                writeIfMissing(
                  join(childDir, "PLAN.md"),
                  buildPlanStub(child.id, child.title),
                );
              }
            }
            written++;
          }

          // Patch playbook.yml's tasks list so `converge run` and the
          // studio's load path see the children. Container children
          // depend on the previous container in declaration order; seeds
          // are independent. Mirrors the legacy implementStructure
          // behavior closely enough for the produced playbook to work.
          const ymlPath = join(outputDir, "playbook.yml");
          const ymlBefore = readFileSync(ymlPath, "utf8");
          const taskLines: string[] = [];
          let prevNonSeed: string | null = null;
          for (const c of meta.children) {
            taskLines.push(`  - id: ${c.id}`);
            if (c.kind !== "seed" && prevNonSeed) {
              taskLines.push(`    depends_on: [${prevNonSeed}]`);
            }
            if (c.kind !== "seed") prevNonSeed = c.id;
          }
          const newTasksBlock = "tasks:\n" + taskLines.join("\n");
          const ymlAfter = ymlBefore.replace(
            /tasks:\s*(\[\s*\]|\n(?:[ \t]+.*\n?)*)?/,
            newTasksBlock + "\n",
          );
          writeFileSync(ymlPath, ymlAfter, "utf8");

          ctx.log?.info?.(`materialized ${written} children`);
        })
        .build(),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Slug helpers (lifted from packages/cli/src/main.ts:1683-1732)      */
/* ------------------------------------------------------------------ */

export function slugifyPrompt(prompt: string): string {
  return (
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || ""
  );
}

export async function suggestPlaybookName(
  prompt: string,
  agentfn: any,
): Promise<string> {
  const fallback = slugifyPrompt(prompt) || "plan";
  try {
    const fn = agentfn({ timeoutMs: 60_000, enableSkills: false });
    const namingPrompt = [
      "You name a new converge playbook from the user's intent.",
      "Reply with ONLY a kebab-case slug, 2-5 words, lowercase a-z and",
      "digits and hyphens, no extension, no quotes, no explanation.",
      "Capture the noun (what is built), not the verb (build/create).",
      "",
      "Examples:",
      '  intent: "create a new playbook to implement mission control for converge"',
      "  name:   mission-control",
      "",
      '  intent: "build a baby-tracker mobile app with sleep and feed logs"',
      "  name:   baby-tracker-app",
      "",
      `intent: "${prompt.replace(/"/g, '\\"')}"`,
      "name:",
    ].join("\n");
    const result = await fn(namingPrompt);
    const raw = String(result.raw ?? result.data ?? "").trim();
    const match = raw.match(/[a-z0-9]+(?:-[a-z0-9]+)+/);
    const slug = match ? match[0] : "";
    if (slug.length >= 3 && slug.length <= 50) return slug;
  } catch {
    // fall through
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  Stub writers                                                       */
/* ------------------------------------------------------------------ */

function buildTaskStub(id: string, title: string | undefined, kind: string): string {
  const t = title ?? id;
  return [
    "---",
    `id: ${id}`,
    `title: ${jsonString(t)}`,
    "description: >",
    `  ${t}`,
    "tags: []",
    "---",
    "",
    `# ${t}`,
    "",
    kind === "container"
      ? "This container can be expanded with `converge plan`."
      : "This task awaits implementation. Run `converge plan` to expand or fill in the body.",
    "",
  ].join("\n");
}

function buildPlanStub(id: string, title: string | undefined): string {
  return [
    "---",
    "kind: container",
    `parent: ${id}`,
    "children: []",
    "---",
    "",
    "# Goal",
    "",
    title ?? id,
    "",
    "# Status",
    "",
    "Awaiting expansion. Run `converge plan` at this path to expand.",
    "",
  ].join("\n");
}

function buildSeedStub(id: string, title: string | undefined): string {
  const t = title ?? id;
  return [
    "---",
    `id: ${id}`,
    `title: ${jsonString(t)}`,
    "description: >",
    `  ${t} (seed — spawns children at runtime)`,
    "driver:",
    "  source: catalog.json",
    "  type: json",
    "tags: [seed, dynamic]",
    "---",
    "",
    `# ${t}`,
    "",
    "This is a seed. Children are spawned at runtime by `index.js`.",
    "",
  ].join("\n");
}

function buildSeedScriptStub(id: string): string {
  return [
    "/**",
    ` * Seed: ${id}`,
    " * TODO: implement the fan-out logic.",
    " */",
    "export default async function run(ctx) {",
    "  // const items = JSON.parse(await ctx.read('catalog.json'));",
    "  // for (const item of items) {",
    "  //   await ctx.spawn({ id: item.id, title: item.name });",
    "  // }",
    "}",
    "",
  ].join("\n");
}

function writeIfMissing(path: string, content: string): void {
  if (existsSync(path)) return;
  writeFileSync(path, content, "utf8");
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function deriveProjectDir(outputDir: string): string {
  const idx = outputDir.lastIndexOf(`/.converge/`);
  if (idx >= 0) return outputDir.slice(0, idx);
  return outputDir;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function jsonString(s: string): string {
  return JSON.stringify(s);
}
