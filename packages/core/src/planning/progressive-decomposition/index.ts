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
 *       - wbs        → TASK.md + wbs/index.js with fan-out best practices
 *     One LLM call per child.
 *
 * After phase 2, TS recurses into each `kind: container` child by
 * calling `runPlanLayer` again — in parallel, since each container
 * subtree is independent. Executable and wbs children stop the
 * recursion (executable runs at runtime; wbs fans out at runtime and
 * its spawned children get re-planned then).
 *
 * See docs/design/progressive-decomposition.md for the protocol.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import { runAnalyze } from "./analyze.ts";
import { implementChildren } from "./implement.ts";
import { parsePlanMdFrontmatter } from "./parser.ts";
import { readScopePacket, rel } from "./scope.ts";
import { DEFAULT_MAX_DEPTH } from "./types.ts";
import type { PlanLayerOpts, PlanMode } from "./types.ts";

export type { PlanLayerOpts, ChildKind, PlanMeta } from "./types.ts";

/**
 * Plan one layer at `opts.nodePath`. Runs phase 1 (analyze → PLAN.md),
 * then phase 2 (kind-dispatched implementers → child TASK.md / wbs.js),
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

  // Update mode: stash the previous PLAN.md so the analyzer can diff.
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
      if (!existsSync(join(childPath, "TASK.md"))) return; // implementer missed it
      return runPlanLayer({
        ...opts,
        nodePath: childPath,
        nodeKind: "task",
        prompt: undefined, // -p does not cascade automatically
        depth: depth + 1,
        maxDepth,
      });
    }),
  );
}
