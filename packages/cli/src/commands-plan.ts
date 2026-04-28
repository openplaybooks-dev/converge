/**
 * `converge plan <path>` — progressive decomposition.
 *
 * Each invocation plans ONE layer at a node:
 *   1. Build the scope packet (root → ancestors → me) by reading files
 *      from disk. Never reads siblings or descendants.
 *   2. Call the LLM with a templated prompt + Zod schema. The LLM returns
 *      a structured plan: `{ goal, kind: leaf|container, children, ... }`.
 *   3. Write `PLAN.md` (the proposal) at the node.
 *   4. If container: write child `TASK.md` files from the plan.
 *   5. Recurse into static-container children.
 *
 * Recursion is driven by TS, not by the agent. The LLM only writes one
 * structured plan per node; everything else is deterministic file I/O.
 *
 * See docs/design/progressive-decomposition.md for the protocol.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join, relative, resolve as resolvePath } from "node:path";
import { z } from "zod";
import { agentfn } from "@converge/agentfn";

/* ------------------------------------------------------------------ */
/*  Schema                                                             */
/* ------------------------------------------------------------------ */

const CheckSchema = z.object({
  id: z.string(),
  cmd: z.string(),
  description: z.string().optional(),
});

const ChildSchema = z.object({
  id: z
    .string()
    .regex(/^[a-z0-9][a-z0-9-]*$/, "id must be a kebab-case slug"),
  title: z.string(),
  kind: z.enum(["executable", "wbs", "container"]),
  goal: z.string(),
  scope: z.string().optional(),
  // executable-only:
  outputs: z.array(z.string()).optional(),
  checks: z.array(CheckSchema).optional(),
  body: z.string().optional(),
  // wbs-only:
  wbs: z
    .object({
      type: z.enum(["nodejs", "template", "ai"]),
      driver: z.string(),
      path: z.string().optional(),
    })
    .optional(),
});

const PlanLayerSchema = z.object({
  goal: z.string(),
  kind: z.enum(["leaf", "container"]),
  // leaf-only:
  leafPlan: z.string().optional(),
  outputs: z.array(z.string()).optional(),
  checks: z.array(CheckSchema).optional(),
  // container-only:
  children: z.array(ChildSchema).optional(),
  openQuestions: z.array(z.string()).optional(),
});

export type PlanLayerOutput = z.infer<typeof PlanLayerSchema>;
export type PlanChild = z.infer<typeof ChildSchema>;

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface PlanLayerOpts {
  /** Absolute path to the node being planned (playbook root or task dir). */
  nodePath: string;
  /** Whether the node is a playbook root or a task. */
  nodeKind: "playbook-root" | "task";
  /** Absolute path to the playbook root (where playbook.yml lives). */
  playbookRoot: string;
  /** Absolute path to the project directory (cwd). */
  projectDir: string;
  /** Optional user prompt (-p). At a fresh root, substitutes for idea.md. */
  prompt?: string;
  /** Re-plan in place (revise existing PLAN.md and child set). */
  update: boolean;
  /** Recursion depth (internal). */
  depth?: number;
  /** Max recursion depth safety net (internal). */
  maxDepth?: number;
}

const DEFAULT_MAX_DEPTH = 8;

/**
 * Plan one layer at `opts.nodePath`. Recursively plans static-container
 * children (sequentially) until all paths terminate at leaves or WBS.
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

  const mode: "fresh" | "fill-in" | "update" = opts.update
    ? "update"
    : existsSync(join(opts.nodePath, "PLAN.md"))
      ? "fill-in"
      : "fresh";

  const indent = "  ".repeat(depth);
  console.log(
    `\n${indent}📋 ${rel(opts.nodePath, opts.projectDir)} [${opts.nodeKind}, ${mode}]`,
  );

  // 1. Build the scope packet (root → ancestors → me).
  const scope = readScopePacket(opts);

  // 2. Build the prompt and call the LLM.
  const prompt = buildPlanPrompt({ ...opts, mode }, scope);
  const logDir = join(opts.projectDir, ".converge", "logs", "plan");
  await mkdir(logDir, { recursive: true });

  console.log(`${indent}   🧠 calling planner...`);
  const fn = agentfn<PlanLayerOutput>({
    prompt,
    schema: PlanLayerSchema,
    allowedTools: ["Read", "Glob"],
    timeoutMs: 180_000,
    cwd: opts.projectDir,
    logDir,
  });
  const result = await fn();
  const plan = result.data;
  console.log(
    `${indent}   ✓ ${plan.kind}${
      plan.kind === "container"
        ? ` — ${plan.children?.length ?? 0} children`
        : ""
    }`,
  );

  // 3. Write PLAN.md.
  await writePlanMd(opts.nodePath, plan, mode);

  // 4. If leaf: done. Parent's TASK.md is the contract; PLAN.md is the
  //    leaf-level analysis. (We deliberately don't overwrite the parent's
  //    TASK.md here — the user can sync from PLAN.md if they want.)
  if (plan.kind === "leaf") return;

  if (!plan.children || plan.children.length === 0) {
    console.log(
      `${indent}   ⚠️  container declared but no children — nothing to materialize`,
    );
    return;
  }

  // 5. Write child TASK.md files.
  for (const child of plan.children) {
    const childDir = join(opts.nodePath, child.id);
    await writeChildTaskMd(childDir, child, mode);
  }

  // 6. In update mode, mark removed children deprecated. (Detection of
  //    "removed" is comparing plan.children against existing child dirs.)
  if (mode === "update") {
    await markRemovedDeprecated(opts.nodePath, plan.children);
  }

  // 7. Recurse for static-container children. Sequential — order doesn't
  //    matter (siblings can't read each other), but parallelism would
  //    multiply concurrent LLM calls.
  for (const child of plan.children.filter((c) => c.kind === "container")) {
    await runPlanLayer({
      ...opts,
      nodePath: join(opts.nodePath, child.id),
      nodeKind: "task",
      prompt: undefined, // -p does not cascade automatically
      depth: depth + 1,
      maxDepth,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Scope packet                                                       */
/* ------------------------------------------------------------------ */

interface ScopeAncestor {
  path: string;
  plan?: string;
  task?: string;
}

interface ScopePacket {
  brief?: string;
  playbookYml?: string;
  rootPlan?: string;
  ancestors: ScopeAncestor[];
  myTask?: string;
}

function readScopePacket(opts: PlanLayerOpts): ScopePacket {
  const result: ScopePacket = { ancestors: [] };

  // Project brief.
  const ideaPath = join(opts.projectDir, "idea.md");
  if (existsSync(ideaPath)) {
    result.brief = readFileSync(ideaPath, "utf8");
  } else {
    const ideaMd = join(opts.projectDir, "IDEA.md");
    if (existsSync(ideaMd)) result.brief = readFileSync(ideaMd, "utf8");
  }

  // playbook.yml.
  const pbYml = join(opts.playbookRoot, "playbook.yml");
  const pbYaml = join(opts.playbookRoot, "playbook.yaml");
  if (existsSync(pbYml)) result.playbookYml = readFileSync(pbYml, "utf8");
  else if (existsSync(pbYaml))
    result.playbookYml = readFileSync(pbYaml, "utf8");

  // Root PLAN.md (if planning a task — root self-references its own plan
  // separately as "my own").
  if (opts.nodePath !== opts.playbookRoot) {
    const rootPlan = join(opts.playbookRoot, "PLAN.md");
    if (existsSync(rootPlan)) result.rootPlan = readFileSync(rootPlan, "utf8");
  }

  // Ancestor chain (exclude root and self).
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

  // My own TASK.md (the contract my parent wrote for me).
  const myTask = join(opts.nodePath, "TASK.md");
  if (existsSync(myTask)) result.myTask = readFileSync(myTask, "utf8");

  return result;
}

/* ------------------------------------------------------------------ */
/*  Prompt template                                                    */
/* ------------------------------------------------------------------ */

function buildPlanPrompt(
  opts: PlanLayerOpts & { mode: "fresh" | "fill-in" | "update" },
  scope: ScopePacket,
): string {
  const lines: string[] = [];

  lines.push(
    "You are running phase 1 of `converge plan` at one node — **progressive decomposition**.",
    "Plan ONE layer only. Do NOT plan grandchildren. Do NOT read siblings or descendants.",
    "Your output must match the JSON schema you were given.",
    "",
    `**Node**: \`${rel(opts.nodePath, opts.projectDir)}\``,
    `**Kind**: ${opts.nodeKind}`,
    `**Mode**: ${opts.mode}`,
  );

  if (opts.prompt) {
    lines.push("", "## User intent (-p)", "", `"${opts.prompt}"`);
  }

  lines.push("", "## Scope packet (root → ancestors → me)");

  if (scope.brief) {
    lines.push("", "### Project brief (idea.md)", "", scope.brief.trim());
  }
  if (scope.playbookYml) {
    lines.push(
      "",
      "### playbook.yml",
      "",
      "```yaml",
      scope.playbookYml.trim(),
      "```",
    );
  }
  if (scope.rootPlan) {
    lines.push("", "### Root PLAN.md", "", scope.rootPlan.trim());
  }
  for (const anc of scope.ancestors) {
    lines.push("", `### Ancestor: ${rel(anc.path, opts.projectDir)}`);
    if (anc.plan) lines.push("", "#### PLAN.md", "", anc.plan.trim());
    if (anc.task) lines.push("", "#### TASK.md", "", anc.task.trim());
  }
  if (scope.myTask) {
    lines.push("", "### My own TASK.md", "", scope.myTask.trim());
  }

  lines.push(
    "",
    "## Decision",
    "",
    "Decide whether this node is a **leaf** (single executable task) or a",
    "**container** (decomposes into 3-7 children).",
    "",
    "If **leaf**: provide `leafPlan` (one paragraph), `outputs[]`, and",
    "deterministic `checks[]` that gate completion.",
    "",
    "If **container**: provide `children[]` (3-7 entries). For each child:",
    "- `id`: kebab-case slug — becomes the child directory name",
    "- `title`: human title",
    "- `kind`: `executable` | `wbs` | `container`",
    "- `goal`: one sentence",
    "- `scope` (optional): short sketch of what you (the parent) will pack",
    "- For executable children: `outputs[]` and `checks[]` (and optional `body`)",
    "- For wbs children: `wbs.type` (`nodejs`|`template`|`ai`) and `wbs.driver` (one-line description of what drives the fan-out, e.g. \"one per character in assets/sprites.json\")",
    "",
    "## Hard rules",
    "- Do NOT plan grandchildren. Stop at one layer.",
    "- Do NOT read siblings or any node's descendants.",
    "- Prefer 3-7 children. If a single shape repeats (one per character,",
    "  one per command), use ONE `wbs` child, not N hand-written ones.",
    "- Each executable child must have at least one deterministic check.",
    "- If something is missing from the scope packet that you'd need to",
    "  plan well, add it to `openQuestions[]`. Do not invent.",
  );

  if (opts.mode === "update") {
    lines.push(
      "",
      "## Update mode",
      "The existing PLAN.md and child set are drafts to revise. Be explicit",
      "in the new plan about what changed and why. Removed children will be",
      "renamed to `_deprecated/<id>/` by the runtime — do not delete them.",
    );
  } else if (opts.mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      "PLAN.md may already exist. Re-analyse and overwrite it. Existing",
      "child TASK.md files will be preserved by the runtime — do not assume",
      "you are writing fresh contracts for every child.",
    );
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  PLAN.md writer                                                     */
/* ------------------------------------------------------------------ */

async function writePlanMd(
  nodePath: string,
  plan: PlanLayerOutput,
  mode: "fresh" | "fill-in" | "update",
): Promise<void> {
  const lines: string[] = [];

  // YAML frontmatter — machine-readable summary.
  lines.push("---");
  lines.push(`mode: ${mode}`);
  lines.push(`kind: ${plan.kind}`);
  lines.push(`generatedAt: ${new Date().toISOString()}`);
  if (plan.kind === "container" && plan.children) {
    lines.push("children:");
    for (const c of plan.children) {
      lines.push(`  - id: ${c.id}`);
      lines.push(`    kind: ${c.kind}`);
      lines.push(`    title: ${yamlScalar(c.title)}`);
    }
  }
  lines.push("---");
  lines.push("");

  lines.push("# Goal", "", plan.goal.trim(), "");

  if (plan.kind === "leaf") {
    lines.push("# Decision: leaf executable", "");
    if (plan.leafPlan) {
      lines.push(plan.leafPlan.trim(), "");
    }
    if (plan.outputs?.length) {
      lines.push("## Outputs", "");
      for (const o of plan.outputs) lines.push(`- \`${o}\``);
      lines.push("");
    }
    if (plan.checks?.length) {
      lines.push("## Checks", "");
      for (const c of plan.checks) {
        lines.push(
          `- **${c.id}**: \`${c.cmd}\`${c.description ? ` — ${c.description}` : ""}`,
        );
      }
      lines.push("");
    }
  } else {
    lines.push("# Decision: container", "");
    if (plan.children?.length) {
      lines.push(`## Children (${plan.children.length})`, "");
      for (const c of plan.children) {
        lines.push(`### ${c.id} — ${c.title}`);
        lines.push(`- **kind**: ${c.kind}`);
        lines.push(`- **goal**: ${c.goal}`);
        if (c.scope) lines.push(`- **scope**: ${c.scope}`);
        if (c.outputs?.length) {
          lines.push(
            `- **outputs**: ${c.outputs.map((o) => `\`${o}\``).join(", ")}`,
          );
        }
        if (c.checks?.length) {
          lines.push(`- **checks**:`);
          for (const ck of c.checks) {
            lines.push(`  - \`${ck.id}\`: \`${ck.cmd}\``);
          }
        }
        if (c.wbs) {
          lines.push(`- **wbs**: \`${c.wbs.type}\` — ${c.wbs.driver}`);
        }
        lines.push("");
      }
    }
  }

  if (plan.openQuestions?.length) {
    lines.push("# Open questions", "");
    for (const q of plan.openQuestions) lines.push(`- ${q}`);
    lines.push("");
  }

  await mkdir(nodePath, { recursive: true });
  await writeFile(join(nodePath, "PLAN.md"), lines.join("\n"), "utf8");
}

/* ------------------------------------------------------------------ */
/*  Child TASK.md writer                                               */
/* ------------------------------------------------------------------ */

async function writeChildTaskMd(
  childDir: string,
  child: PlanChild,
  parentMode: "fresh" | "fill-in" | "update",
): Promise<void> {
  await mkdir(childDir, { recursive: true });
  const taskPath = join(childDir, "TASK.md");

  // Fill-in: never overwrite an existing TASK.md.
  if (parentMode === "fill-in" && existsSync(taskPath)) return;

  // Update: if the file exists, write next to it as TASK.md.proposed for
  // the user to review, rather than silently overwriting their edits.
  if (parentMode === "update" && existsSync(taskPath)) {
    await writeFile(
      join(childDir, "TASK.md.proposed"),
      renderChildTaskMd(child),
      "utf8",
    );
    return;
  }

  await writeFile(taskPath, renderChildTaskMd(child), "utf8");
}

function renderChildTaskMd(child: PlanChild): string {
  const lines: string[] = ["---"];
  lines.push(`title: ${yamlScalar(child.title)}`);
  if (child.kind === "wbs" && child.wbs) {
    lines.push("wbs:");
    lines.push(`  type: ${child.wbs.type}`);
    if (child.wbs.path) lines.push(`  path: ${child.wbs.path}`);
  }
  if (child.outputs?.length) {
    lines.push("outputs:");
    for (const o of child.outputs) lines.push(`  - ${o}`);
  }
  if (child.checks?.length) {
    lines.push("checks:");
    for (const c of child.checks) {
      lines.push(`  - id: ${c.id}`);
      lines.push(`    cmd: ${yamlScalar(c.cmd)}`);
      if (c.description) lines.push(`    description: ${yamlScalar(c.description)}`);
    }
  }
  lines.push("---");
  lines.push("");
  lines.push(`# ${child.title}`);
  lines.push("");
  lines.push(`**Goal**: ${child.goal}`);
  lines.push("");
  if (child.scope) {
    lines.push("## Scope", "", child.scope.trim(), "");
  }
  if (child.body) {
    lines.push(child.body.trim());
  } else if (child.kind === "wbs" && child.wbs) {
    lines.push("## WBS", "", `Driven by: ${child.wbs.driver}`, "");
  } else if (child.kind === "container") {
    lines.push(
      "## Decomposition",
      "",
      "This task decomposes further. Run `converge plan` at this path to plan its layer.",
      "",
    );
  } else {
    lines.push(
      "## Instructions",
      "",
      "(The parent planner did not pack a body. Add concrete step-by-step instructions before running.)",
    );
  }
  return lines.join("\n") + "\n";
}

/* ------------------------------------------------------------------ */
/*  Update mode helpers                                                */
/* ------------------------------------------------------------------ */

async function markRemovedDeprecated(
  nodePath: string,
  plannedChildren: PlanChild[],
): Promise<void> {
  const { readdir, rename } = await import("node:fs/promises");
  const { statSync } = await import("node:fs");
  let entries: string[];
  try {
    entries = await readdir(nodePath);
  } catch {
    return;
  }
  const plannedIds = new Set(plannedChildren.map((c) => c.id));
  const deprecatedDir = join(nodePath, "_deprecated");
  for (const entry of entries) {
    if (entry.startsWith("_")) continue;
    if (entry.startsWith(".")) continue;
    if (entry === "PLAN.md" || entry === "TASK.md") continue;
    if (entry === "TASK.md.proposed") continue;
    if (plannedIds.has(entry)) continue;
    const full = join(nodePath, entry);
    let isDir = false;
    try {
      isDir = statSync(full).isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    // Looks like a former child directory not in the new plan — deprecate.
    if (!existsSync(deprecatedDir)) await mkdir(deprecatedDir, { recursive: true });
    try {
      await rename(full, join(deprecatedDir, entry));
      console.log(`     ↳ deprecated: ${entry} → _deprecated/${entry}`);
    } catch (e) {
      // best-effort
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function rel(p: string, projectDir: string): string {
  if (p.startsWith(projectDir + "/")) return p.slice(projectDir.length + 1);
  if (p === projectDir) return ".";
  return p;
}

/** Quote a YAML scalar safely for our handwritten frontmatter. */
function yamlScalar(s: string): string {
  // Use double-quoted form, escape backslashes and double-quotes.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Avoid unused-import lint when only `dirname` is referenced for typing.
void dirname;
void resolvePath;
void rm;
