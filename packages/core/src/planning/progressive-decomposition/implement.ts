/**
 * Phase 2 dispatcher.
 *
 * After phase 1 produces PLAN.md, TS reads its frontmatter to learn
 * the children list and kinds. For each child this dispatcher routes
 * to a kind-specific implementer:
 *
 *   - executable → write a single high-quality TASK.md with checks
 *   - container  → write a thin contract TASK.md, no execution detail
 *   - wbs        → write TASK.md + wbs/index.js fan-out script
 *
 * One LLM call per child, each with a focused prompt. Sequential.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { rel } from "./scope.ts";
import { implementContainer } from "./implement-container.ts";
import { implementExecutable } from "./implement-executable.ts";
import { implementWbs } from "./implement-wbs.ts";
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

  for (const child of meta.children) {
    const relChild = `${rel(opts.nodePath, opts.projectDir)}/${child.id}`;
    console.log(`${indent}      [${child.kind}] ${relChild}`);

    switch (child.kind) {
      case "executable":
        await implementExecutable({ opts, mode, planMd, child, logDir });
        break;
      case "container":
        await implementContainer({ opts, mode, planMd, child, logDir });
        break;
      case "wbs":
        await implementWbs({ opts, mode, planMd, child, logDir });
        break;
    }
  }

  // Verify each declared child got a TASK.md.
  const missing = meta.children.filter(
    (c) => !existsSync(join(opts.nodePath, c.id, "TASK.md")),
  );
  if (missing.length > 0) {
    console.log(
      `${indent}      ⚠️  phase 2 missed children: ${missing.map((c) => c.id).join(", ")}`,
    );
  }
}
