/**
 * `converge plan <path>` — progressive decomposition.
 *
 * Each invocation plans ONE layer at a node, in two phases:
 *
 *   Phase 1 — ANALYZE
 *     One LLM call. Reads scope packet (root → ancestors → me) and
 *     writes <node>/PLAN.md. PLAN.md has YAML frontmatter (kind +
 *     children list) and markdown body (objective, decision, per-child
 *     contracts, open questions).
 *
 *   Phase 2 — IMPLEMENT  (dispatched per child kind)
 *     For each child declared in PLAN.md frontmatter, call the
 *     kind-specific implementer:
 *       - executable → focused on deterministic checks + clear body
 *       - container  → thin contract (next planner will fill in)
 *       - seed       → SEED.md + index.js with fan-out best practices
 *     One LLM call per child.
 *
 * After phase 2, TS recurses into each `kind: container` child by
 * calling `runPlanLayer` again — in parallel, since each container
 * subtree is independent.
 *
 * ## init --from-prompt (2-phase scaffold)
 *
 *   Phase 1 (analyzeRoot) — one LLM call → root PLAN.md
 *   Phase 2 (implementStructurePhase) — folder skeleton + stubs + playbook.yml
 *
 * No delegation. Containers get PLAN.md stubs (expand later with
 * `converge plan`). Seeds get SEED.md + index.js stubs (`converge
 * compile --seed` to resolve).
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { runAnalyze } from "./analyze.ts";
import { implementChildren, implementStructure } from "./implement.ts";
import { parsePlanMdFrontmatter } from "./parser.ts";
import { readScopePacket, rel } from "./scope.ts";
import { DEFAULT_MAX_DEPTH } from "./types.ts";
import type { PlanLayerOpts, PlanMeta, PlanMode } from "./types.ts";

export type { PlanLayerOpts, ChildKind, PlanMeta } from "./types.ts";
export { implementStructure } from "./implement.ts";

/**
 * Plan one layer at `opts.nodePath`. Runs phase 1 (analyze → PLAN.md),
 * then phase 2 (kind-dispatched implementers → TASK.md / SEED.md),
 * then recurses in parallel into static-container children.
 */
export async function runPlanLayer(opts: PlanLayerOpts): Promise<void> {
  const depth = opts.depth ?? 0;
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  if (depth >= maxDepth) {
    console.log(
      `   ⚠️  Max plan depth (${maxDepth}) reached at ${rel(opts.nodePath, opts.projectDir)} — stopping recursion`,
    );
    return;
  }

  const mode: PlanMode = opts.update
    ? "update"
    : existsSync(join(opts.nodePath, "PLAN.md"))
      ? "fill-in"
      : "fresh";

  const indent = "  ".repeat(depth);
  console.log(
    `\n${indent}📋 ${rel(opts.nodePath, opts.projectDir)} [${opts.nodeKind}, ${mode}]`,
  );

  const logDir = join(opts.projectDir, ".converge", "logs", "plan");
  await mkdir(logDir, { recursive: true });
  await mkdir(opts.nodePath, { recursive: true });

  if (mode === "update" && existsSync(join(opts.nodePath, "PLAN.md"))) {
    await rename(
      join(opts.nodePath, "PLAN.md"),
      join(opts.nodePath, "PLAN.previous.md"),
    );
  }

  // ── Phase 1 — ANALYZE ─────────────────────────────────────────────
  console.log(`${indent}   🧠 phase 1: analyze...`);
  const scope = readScopePacket(opts);
  await runAnalyze({ opts, mode, scope, logDir });

  const planMd = readFileSync(join(opts.nodePath, "PLAN.md"), "utf8");
  const meta = parsePlanMdFrontmatter(planMd);
  console.log(
    `${indent}      → ${meta.kind}${
      meta.kind === "container" ? ` (${meta.children?.length ?? 0} children)` : ""
    }`,
  );

  if (meta.kind === "leaf") return;
  if (!meta.children || meta.children.length === 0) {
    console.log(
      `${indent}      ⚠️  container declared but no children in frontmatter`,
    );
    return;
  }

  // ── Phase 2 — IMPLEMENT (kind-dispatched) ──────────────────────────
  console.log(
    `${indent}   🔨 phase 2: implement (${meta.children.length} children)`,
  );
  await implementChildren({ opts, mode, planMd, meta, logDir, indent });

  // ── Recurse: static-container children only (in parallel) ──────────
  const containerChildren = meta.children.filter((c) => c.kind === "container");
  await Promise.all(
    containerChildren.map((child) => {
      const childPath = join(opts.nodePath, child.id);
      if (!existsSync(join(childPath, "TASK.md"))) return;
      return runPlanLayer({
        ...opts,
        nodePath: childPath,
        nodeKind: "task",
        prompt: undefined,
        depth: depth + 1,
        maxDepth,
      });
    }),
  );
}

// ═══════════════════════════════════════════════════════════════════════
// init --from-prompt: 2-phase scaffold
// ═══════════════════════════════════════════════════════════════════════

/**
 * Phase 1 — ANALYZE (root).
 *
 * One LLM call. Reads the prompt. Produces a root PLAN.md that
 * identifies the delegation pattern and declares top-level phases.
 */
export async function analyzeRoot(opts: PlanLayerOpts): Promise<PlanMeta> {
  const logDir = join(opts.projectDir, ".converge", "logs", "plan");
  await mkdir(logDir, { recursive: true });
  await mkdir(opts.nodePath, { recursive: true });

  console.log(
    `\n📋 Phase 1/2: Analyzing prompt → ${rel(opts.nodePath, opts.projectDir)}/PLAN.md`,
  );

  const scope = readScopePacket(opts);
  await runAnalyze({ opts, mode: "fresh", scope, logDir, isRoot: true });

  const planMd = readFileSync(join(opts.nodePath, "PLAN.md"), "utf8");
  const meta = parsePlanMdFrontmatter(planMd);
  console.log(
    `   ✅ Root PLAN.md: ${meta.kind} (${meta.children?.length ?? 0} top-level tasks)`,
  );
  return meta;
}

/**
 * Phase 2 — SCAFFOLD. No LLM calls.
 *
 * Reads root PLAN.md. Creates folder skeleton with stubs:
 * - executable → TASK.md stub in tasks/{id}/
 * - container  → TASK.md stub + PLAN.md stub in tasks/{id}/
 * - seed       → SEED.md stub + index.js stub in seeds/{id}/
 * - Updates playbook.yml with the task list.
 *
 * Containers get `converge plan <path>` later. Seeds get
 * `converge compile --seed` later.
 */
export async function implementStructurePhase(
  opts: PlanLayerOpts,
  meta: PlanMeta,
): Promise<void> {
  const logDir = join(opts.projectDir, ".converge", "logs", "plan");
  await mkdir(logDir, { recursive: true });

  console.log(`\n📁 Phase 2/2: Creating folder structure...`);

  const planMd = readFileSync(join(opts.nodePath, "PLAN.md"), "utf8");
  await implementStructure({ opts, meta, planMd, logDir });

  const staticCount = meta.children?.filter((c) => c.kind !== "seed").length ?? 0;
  const seedCount = meta.children?.filter((c) => c.kind === "seed").length ?? 0;
  console.log(
    `   ✅ ${meta.children?.length ?? 0} tasks: ${staticCount} static, ${seedCount} seeds`,
  );
}
