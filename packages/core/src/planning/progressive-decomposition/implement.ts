/**
 * Phase 2 dispatcher.
 *
 * Two modes:
 *   - **implementStructure** (init --from-prompt phase 2): creates folder
 *     skeleton, thin TASK.md for containers, PLAN.md stubs, seed stubs.
 *     No LLM calls except for executable leaves.
 *   - **implementChildren** (per-layer delegation): kind-dispatched LLM
 *     implementers for each child — full TASK.md with checks, body, etc.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { rel } from "./scope.ts";
import { implementContainer } from "./implement-container.ts";
import { implementExecutable } from "./implement-executable.ts";
import type { PlanLayerOpts, PlanMeta, PlanMode } from "./types.ts";

export interface ImplementChildrenArgs {
  opts: PlanLayerOpts;
  mode: PlanMode;
  planMd: string;
  meta: PlanMeta;
  logDir: string;
  indent: string;
}

export async function implementChildren(
  args: ImplementChildrenArgs,
): Promise<void> {
  const { opts, mode, planMd, meta, logDir, indent } = args;
  if (!meta.children) return;

  await Promise.all(
    meta.children.map((child) => {
      const relChild = `${rel(opts.nodePath, opts.projectDir)}/${child.id}`;
      console.log(`${indent}      [${child.kind}] ${relChild}`);

      switch (child.kind) {
        case "executable":
          return implementExecutable({ opts, mode, planMd, child, logDir });
        case "container":
          return implementContainer({ opts, mode, planMd, child, logDir });
        case "seed":
          throw new Error(
            `child.kind 'seed' is removed; rewrite the planner to emit a` +
              ` 'container' with mode: spawner (RFC 0021/0022).`,
          );
      }
    }),
  );

  // Verify each declared child got its contract file.
  const missing = meta.children.filter(
    (c) => !existsSync(join(opts.nodePath, c.id, "TASK.md")),
  );
  if (missing.length > 0) {
    console.log(
      `${indent}      ⚠️  phase 2 missed children: ${missing.map((c) => c.id).join(", ")}`,
    );
  }
}

// ── Structure mode (init --from-prompt phase 2) ──────────────────────

export interface ImplementStructureArgs {
  opts: PlanLayerOpts;
  meta: PlanMeta;
  /** The playbook root PLAN.md raw content (for scope inheritance). */
  planMd: string;
  logDir: string;
}

/**
 * Create the folder skeleton from root PLAN.md — no LLM calls, no expansion.
 *
 * All children get stubs. Containers get PLAN.md stubs for later
 * `converge plan`. Seeds get index.js stubs for `converge compile --seed`.
 * Updates playbook.yml with the top-level task list.
 */
export async function implementStructure(
  args: ImplementStructureArgs,
): Promise<void> {
  const { opts, meta } = args;
  if (!meta.children) return;

  const relNode = rel(opts.nodePath, opts.projectDir);
  const tasksDir = join(opts.playbookRoot, "tasks");
  const seedsDir = join(opts.playbookRoot, "seeds");

  for (const child of meta.children) {
    if (child.kind === "seed") {
      const seedDir = join(seedsDir, child.id);
      mkdirSync(seedDir, { recursive: true });
      console.log(`   🌱 ${relNode}/seeds/${child.id} [seed]`);
      writeSeedStub(seedDir, child);
      writeSeedScriptStub(seedDir, child);
    } else {
      const childDir = join(tasksDir, child.id);
      mkdirSync(childDir, { recursive: true });
      console.log(`   📁 ${relNode}/tasks/${child.id} [${child.kind}]`);

      writeTaskStub(childDir, child);

      if (child.kind === "container") {
        writePlanStubInline(childDir, child);
      }
    }
  }

  updatePlaybookYml(opts.playbookRoot, meta);
}

/** Write a TASK.md stub for any static task (executable or container). */
function writeTaskStub(
  dir: string,
  child: { id: string; title?: string; kind?: string },
): void {
  const title = child.title ?? child.id;
  const taskMd = [
    "---",
    `id: ${child.id}`,
    `title: "${title}"`,
    "description: >",
    `  ${title}`,
    "tags: []",
    "---",
    "",
    `# ${title}`,
    "",
    child.kind === "container"
      ? "This container can be expanded with `converge plan`."
      : "This task awaits implementation. Run `converge plan` to expand.",
    "",
  ].join("\n");
  writeFileSync(join(dir, "TASK.md"), taskMd, "utf8");
}

/** Write a PLAN.md stub for a container awaiting expansion. */
function writePlanStubInline(
  dir: string,
  child: { id: string; title?: string },
): void {
  const content = [
    "---",
    "kind: container",
    `parent: ${child.id}`,
    "children: []",
    "---",
    "",
    "# Goal",
    "",
    child.title ?? child.id,
    "",
    "# Status",
    "",
    "Awaiting expansion. Run `converge plan` at this path to expand.",
    "",
  ].join("\n");
  writeFileSync(join(dir, "PLAN.md"), content, "utf8");
}

/** Write a SEED.md stub for a seed (dynamic — not expanded during init). */
function writeSeedStub(
  dir: string,
  child: { id: string; title?: string },
): void {
  const title = child.title ?? child.id;
  const seedMd = [
    "---",
    `id: ${child.id}`,
    `title: "${title}"`,
    "description: >",
    `  ${title} (seed — spawns children at runtime)`,
    "driver:",
    "  source: catalog.json",
    "  type: json",
    "tags: [seed, dynamic]",
    "---",
    "",
    `# ${title}`,
    "",
    "This is a seed. Children are spawned at runtime by `index.js`.",
    "Run `converge compile --seed` to resolve the frontier.",
    "",
  ].join("\n");
  writeFileSync(join(dir, "SEED.md"), seedMd, "utf8");
}

/** Write an index.js stub for a seed. */
function writeSeedScriptStub(
  dir: string,
  child: { id: string; title?: string },
): void {
  const script = [
    "/**",
    ` * Seed: ${child.id}`,
    " * TODO: implement the fan-out logic.",
    " *",
    " * Read a driver file (JSON catalog, markdown spec, etc.) and call",
    " * ctx.spawn() for each child. Each spawn receives a deterministic id",
    " * and any item-specific vars the template needs.",
    " */",
    "export default async function run(ctx) {",
    "  // const items = JSON.parse(",
    "  //   await ctx.read('catalog.json')",
    "  // );",
    "  // for (const item of items) {",
    "  //   await ctx.spawn({",
    "  //     id: slugify(item.name),",
    "  //     title: item.name,",
    "  //     outputs: [`output/${item.id}.json`],",
    "  //     checks: [{",
    "  //       id: 'exists',",
    "  //       cmd: `test -f output/${item.id}.json`,",
    "  //     }],",
    "  //     body: `Process ${item.name}.`,",
    "  //   });",
    "  // }",
    "}",
    "",
    "function slugify(s) {",
    "  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);",
    "}",
    "",
  ].join("\n");
  writeFileSync(join(dir, "index.js"), script, "utf8");
}

/** Update playbook.yml with tasks and depends_on from root PLAN.md. */
function updatePlaybookYml(playbookRoot: string, meta: PlanMeta): void {
  const ymlPath = join(playbookRoot, "playbook.yml");
  let yml = "";
  try {
    yml = readFileSync(ymlPath, "utf8");
  } catch {
    // playbook.yml doesn't exist — build from scratch.
    yml = [
      "name: default",
      `description: ${meta.children?.map(c => c.title ?? c.id).join(", ") ?? "Generated playbook"}`,
      "run:",
      "  mode: autonomous",
      "  maxTaskAttempts: 3",
      "tasks: []",
      "",
    ].join("\n");
  }

  // If tasks list is empty or only contains placeholder, replace it.
  if (!meta.children || meta.children.length === 0) return;

  // Linear DAG chain: each non-seed task depends on the previous non-seed.
  const nonSeeds = (meta.children ?? []).filter((c) => c.kind !== "seed");
  const prevNonSeed = new Map<string, string | null>();
  for (let i = 0; i < nonSeeds.length; i++) {
    prevNonSeed.set(nonSeeds[i].id, i > 0 ? nonSeeds[i - 1].id : null);
  }

  const taskLines = meta.children.map((c) => {
    if (c.kind === "seed") {
      return `  - id: ${c.id}`;
    }
    const prev = prevNonSeed.get(c.id);
    if (prev) {
      return `  - id: ${c.id}\n    depends_on: [${prev}]`;
    }
    return `  - id: ${c.id}`;
  });

  // Replace tasks section.
  const tasksRe = /^tasks:\s*(\[.*\]|[\s\S]*?)(?=^checks:|^[a-z]|\z)/m;
  const tasksBlock = "tasks:\n" + taskLines.join("\n");
  if (tasksRe.test(yml)) {
    yml = yml.replace(tasksRe, tasksBlock);
  } else {
    yml = yml.trimEnd() + "\n" + tasksBlock + "\n";
  }

  writeFileSync(ymlPath, yml, "utf8");
  console.log(`   📝 Updated playbook.yml with ${meta.children.length} tasks`);
}
