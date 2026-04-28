/**
 * PLAN.md frontmatter parser.
 *
 * Phase 1 produces a PLAN.md with YAML frontmatter that gives the
 * structural summary of the layer (kind + children list). TS parses the
 * frontmatter to drive phase 2 dispatch and the recursion decision.
 *
 * The body of PLAN.md is markdown analysis — we don't parse it; we just
 * forward it verbatim to the phase-2 implementers.
 */

import { parse as parseYaml } from "yaml";
import type { PlanMeta } from "./types.ts";

export function parsePlanMdFrontmatter(content: string): PlanMeta {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!m) {
    throw new Error("PLAN.md is missing required YAML frontmatter");
  }
  let parsed: unknown;
  try {
    parsed = parseYaml(m[1]);
  } catch (e: any) {
    throw new Error(`PLAN.md frontmatter is not valid YAML: ${e.message}`);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("PLAN.md frontmatter must be a YAML object");
  }
  const raw = parsed as Record<string, unknown>;
  const kind = raw.kind;
  if (kind !== "leaf" && kind !== "container") {
    throw new Error(
      `PLAN.md frontmatter \`kind\` must be "leaf" or "container", got ${JSON.stringify(kind)}`,
    );
  }
  const out: PlanMeta = { kind };
  if (kind === "container") {
    const children = raw.children;
    if (!Array.isArray(children)) {
      throw new Error(
        "PLAN.md frontmatter `children` must be a list (container kind)",
      );
    }
    out.children = [];
    for (const c of children) {
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      const id = typeof cc.id === "string" ? cc.id : undefined;
      const ckind = cc.kind;
      if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) continue;
      if (ckind !== "executable" && ckind !== "wbs" && ckind !== "container")
        continue;
      out.children.push({
        id,
        kind: ckind,
        title: typeof cc.title === "string" ? cc.title : undefined,
      });
    }
  }
  return out;
}
