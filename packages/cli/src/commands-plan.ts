/**
 * `converge plan <path>` — progressive decomposition.
 *
 * Each invocation plans ONE layer at a node, in two phases:
 *
 *   Phase 1 — ANALYZE
 *     Prompt the LLM with the scope packet (root → ancestors → me) and
 *     have it write `<nodePath>/PLAN.md`. The PLAN.md has YAML
 *     frontmatter that lists the children (id, kind, title) plus a
 *     markdown body describing the goal, decision, per-child contracts,
 *     and open questions.
 *
 *   Phase 2 — IMPLEMENT
 *     Prompt the LLM to read PLAN.md and materialize child TASK.md
 *     files (and `wbs/index.js` for WBS children) under `<nodePath>`.
 *
 * After both phases, TS parses PLAN.md frontmatter and recursively
 * runs the same plan-implement cycle for each static-container child.
 *
 * Two LLM calls per node. Recursion is in-process, sequential, driven
 * by TS — agents do not invoke `converge plan`.
 *
 * See docs/design/progressive-decomposition.md for the protocol.
 */

import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile, rename } from "node:fs/promises";
import { join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { agentfn } from "@converge/agentfn";

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
const PHASE_TIMEOUT_MS = 240_000;

/**
 * Plan one layer at `opts.nodePath`. Runs phase 1 (analyze → PLAN.md),
 * then phase 2 (implement → child TASK.md / wbs.js), then recurses
 * sequentially into static-container children.
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

  const logDir = join(opts.projectDir, ".converge", "logs", "plan");
  await mkdir(logDir, { recursive: true });
  await mkdir(opts.nodePath, { recursive: true });

  // ── Update mode: stash the previous PLAN.md so the analyzer can diff ──
  if (mode === "update" && existsSync(join(opts.nodePath, "PLAN.md"))) {
    await rename(
      join(opts.nodePath, "PLAN.md"),
      join(opts.nodePath, "PLAN.previous.md"),
    );
  }

  // ── Phase 1: ANALYZE ──────────────────────────────────────────────
  console.log(`${indent}   🧠 phase 1: analyze...`);
  const scope = readScopePacket(opts);
  const analyzePrompt = buildAnalyzePrompt({ ...opts, mode }, scope);

  const analyze = agentfn({
    prompt: analyzePrompt,
    allowedTools: ["Read", "Glob", "Grep", "Write"],
    timeoutMs: PHASE_TIMEOUT_MS,
    cwd: opts.projectDir,
    logDir,
  });
  await analyze();

  if (!existsSync(join(opts.nodePath, "PLAN.md"))) {
    throw new Error(
      `phase 1 did not produce ${rel(opts.nodePath, opts.projectDir)}/PLAN.md`,
    );
  }

  const meta = parsePlanMdFrontmatter(
    readFileSync(join(opts.nodePath, "PLAN.md"), "utf8"),
  );
  console.log(
    `${indent}      → ${meta.kind}${
      meta.kind === "container" ? ` (${meta.children?.length ?? 0} children)` : ""
    }`,
  );

  // ── Phase 2: IMPLEMENT ────────────────────────────────────────────
  if (meta.kind === "leaf") {
    // No children to materialize. Phase 2 is a no-op.
    return;
  }

  if (!meta.children || meta.children.length === 0) {
    console.log(
      `${indent}      ⚠️  container declared but PLAN.md has no children frontmatter — skipping phase 2`,
    );
    return;
  }

  console.log(`${indent}   🔨 phase 2: implement (${meta.children.length} children)...`);
  const planMdContent = readFileSync(join(opts.nodePath, "PLAN.md"), "utf8");
  const implementPrompt = buildImplementPrompt(
    { ...opts, mode },
    planMdContent,
    meta,
  );

  const implement = agentfn({
    prompt: implementPrompt,
    allowedTools: ["Read", "Glob", "Write", "Bash"],
    timeoutMs: PHASE_TIMEOUT_MS,
    cwd: opts.projectDir,
    logDir,
  });
  await implement();

  // Verify each declared child got a TASK.md.
  const missing = meta.children.filter(
    (c) => !existsSync(join(opts.nodePath, c.id, "TASK.md")),
  );
  if (missing.length > 0) {
    console.log(
      `${indent}      ⚠️  phase 2 missed children: ${missing.map((c) => c.id).join(", ")}`,
    );
  }

  // ── Recurse: static-container children only ────────────────────────
  const containerChildren = meta.children.filter((c) => c.kind === "container");
  for (const child of containerChildren) {
    const childPath = join(opts.nodePath, child.id);
    if (!existsSync(join(childPath, "TASK.md"))) continue; // phase 2 missed it
    await runPlanLayer({
      ...opts,
      nodePath: childPath,
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
  previousPlan?: string;
}

function readScopePacket(opts: PlanLayerOpts): ScopePacket {
  const result: ScopePacket = { ancestors: [] };

  // Project brief.
  const ideaPath = join(opts.projectDir, "idea.md");
  const ideaMd = join(opts.projectDir, "IDEA.md");
  if (existsSync(ideaPath)) result.brief = readFileSync(ideaPath, "utf8");
  else if (existsSync(ideaMd)) result.brief = readFileSync(ideaMd, "utf8");

  // playbook.yml.
  const pbYml = join(opts.playbookRoot, "playbook.yml");
  const pbYaml = join(opts.playbookRoot, "playbook.yaml");
  if (existsSync(pbYml)) result.playbookYml = readFileSync(pbYml, "utf8");
  else if (existsSync(pbYaml)) result.playbookYml = readFileSync(pbYaml, "utf8");

  // Root PLAN.md (if planning a non-root task).
  if (opts.nodePath !== opts.playbookRoot) {
    const rootPlan = join(opts.playbookRoot, "PLAN.md");
    if (existsSync(rootPlan)) result.rootPlan = readFileSync(rootPlan, "utf8");
  }

  // Ancestor chain (between root and self, exclusive).
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

  // Previous PLAN.md (update mode).
  const prev = join(opts.nodePath, "PLAN.previous.md");
  if (existsSync(prev)) result.previousPlan = readFileSync(prev, "utf8");

  return result;
}

/* ------------------------------------------------------------------ */
/*  PLAN.md frontmatter parser                                         */
/* ------------------------------------------------------------------ */

interface PlanMeta {
  kind: "leaf" | "container";
  children?: Array<{
    id: string;
    kind: "executable" | "wbs" | "container";
    title?: string;
  }>;
}

function parsePlanMdFrontmatter(content: string): PlanMeta {
  // Frontmatter is delimited by leading '---' lines.
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
      throw new Error('PLAN.md frontmatter `children` must be a list (container kind)');
    }
    out.children = [];
    for (const c of children) {
      if (!c || typeof c !== "object") continue;
      const cc = c as Record<string, unknown>;
      const id = typeof cc.id === "string" ? cc.id : undefined;
      const ckind = cc.kind;
      if (!id || !/^[a-z0-9][a-z0-9-]*$/.test(id)) continue;
      if (ckind !== "executable" && ckind !== "wbs" && ckind !== "container") continue;
      out.children.push({
        id,
        kind: ckind,
        title: typeof cc.title === "string" ? cc.title : undefined,
      });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Phase 1 — analyze prompt                                           */
/* ------------------------------------------------------------------ */

function buildAnalyzePrompt(
  opts: PlanLayerOpts & { mode: "fresh" | "fill-in" | "update" },
  scope: ScopePacket,
): string {
  const lines: string[] = [];
  const relNode = rel(opts.nodePath, opts.projectDir);

  lines.push(
    "You are running **phase 1 (ANALYZE)** of `converge plan` at one node.",
    "**Progressive decomposition** — plan ONE layer only. Do NOT plan grandchildren.",
    "Do NOT read siblings or any node's descendants. The scope packet below is exhaustive.",
    "",
    `**Node**: \`${relNode}\``,
    `**Kind**: ${opts.nodeKind}`,
    `**Mode**: ${opts.mode}`,
  );

  if (opts.prompt) {
    lines.push("", "## User intent (-p)", "", `"${opts.prompt}"`);
  }

  lines.push("", "## Scope packet (root → ancestors → me)");
  if (scope.brief) lines.push("", "### Project brief (idea.md)", "", scope.brief.trim());
  if (scope.playbookYml)
    lines.push("", "### playbook.yml", "", "```yaml", scope.playbookYml.trim(), "```");
  if (scope.rootPlan) lines.push("", "### Root PLAN.md", "", scope.rootPlan.trim());
  for (const anc of scope.ancestors) {
    lines.push("", `### Ancestor: ${rel(anc.path, opts.projectDir)}`);
    if (anc.plan) lines.push("", "#### PLAN.md", "", anc.plan.trim());
    if (anc.task) lines.push("", "#### TASK.md", "", anc.task.trim());
  }
  if (scope.myTask) lines.push("", "### My own TASK.md", "", scope.myTask.trim());
  if (scope.previousPlan) {
    lines.push(
      "",
      "### Previous PLAN.md (drafts to revise)",
      "",
      scope.previousPlan.trim(),
    );
  }

  lines.push(
    "",
    "## Your task",
    "",
    `Use the **Write** tool to create the file \`${relNode}/PLAN.md\`.`,
    "It MUST start with YAML frontmatter that gives the layer's structural",
    "summary, followed by markdown analysis. Use this exact shape:",
    "",
    "```",
    "---",
    "kind: leaf | container",
    "children:                       # required if kind=container, omit if leaf",
    "  - id: <kebab-case-slug>       # 3-7 entries",
    "    kind: executable | container | wbs",
    "    title: <human title>",
    "---",
    "```",
    "",
    "## The three child kinds",
    "",
    "Every child is exactly one of these three:",
    "",
    "1. **`executable`** — an atomic task. Runtime runs it directly.",
    "   Has `outputs` + `checks` + a body of step-by-step instructions.",
    "   No children. No further decomposition.",
    "",
    "2. **`container`** — a *static* container. It decomposes into 3-7",
    "   hand-written children at plan time. After phase 2 writes its",
    "   TASK.md, the planner will be re-invoked recursively on its path",
    "   to plan its layer. (No runtime fan-out.)",
    "",
    "3. **`wbs`** — a *dynamic* container. Its children are spawned at",
    "   **runtime** (not plan time) by a `wbs/index.js` script that reads",
    "   data and emits one child per item. Use this when the count and",
    "   shape of children depend on data not known at plan time (one per",
    "   character in `sprites.json`, one per CLI command, etc.).",
    "",
    "## PLAN.md body shape",
    "",
    "After the frontmatter, the body fills in one section per child:",
    "",
    "```markdown",
    "# Goal",
    "",
    "<restate this node's goal in your own words>",
    "",
    "# Decision",
    "",
    "<leaf or container, with one paragraph of reasoning>",
    "",
    "# Children          # only for container",
    "",
    "## <child-id> — <title>",
    "- **kind**: executable | container | wbs",
    "- **goal**: <one sentence>",
    "- **scope**: <what this node packs into the child's TASK.md>",
    "- **outputs**: <file paths the child produces>      # executable only",
    "- **checks**:                                        # executable only",
    "  - <id>: `<deterministic shell cmd that returns 0>`",
    "- **wbs**:                                           # wbs only",
    "    type: nodejs | template | ai",
    "    driver: <one-line description, e.g. \"one per character in sprites.json\">",
    "- **body**: |                                        # executable only",
    "    <step-by-step instructions for the leaf agent>",
    "",
    "# Open questions",
    "",
    "- <thing missing from your scope packet that you would need>",
    "```",
    "",
    "## Hard rules",
    "- Plan ONE layer. Do NOT enumerate grandchildren.",
    "- Prefer 3-7 children. If a single shape repeats (one per character,",
    "  one per command), use ONE `wbs` child, not N hand-written ones.",
    "- Each executable child must have at least one deterministic check.",
    "- If something is missing from the scope packet that you'd need,",
    "  surface it in `# Open questions`. Do NOT invent.",
    "- The frontmatter `children` list is what TS parses to drive phase 2",
    "  and recursion — make sure every child you describe in the body has",
    "  a frontmatter entry, and vice versa.",
  );

  if (opts.mode === "update") {
    lines.push(
      "",
      "## Update mode",
      "The previous PLAN.md is in the scope packet. Treat it as a draft to",
      "revise. Be explicit about what changed and why. Removed children",
      "will be renamed to `_deprecated/<id>/` by the runtime; new children",
      "get materialized; modified children whose TASK.md still matches the",
      "previous PLAN.md get re-materialized.",
    );
  } else if (opts.mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      "PLAN.md may already have existed. Re-analyse from scratch. The",
      "runtime will preserve existing child TASK.md files in phase 2.",
    );
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Phase 2 — implement prompt                                         */
/* ------------------------------------------------------------------ */

function buildImplementPrompt(
  opts: PlanLayerOpts & { mode: "fresh" | "fill-in" | "update" },
  planMdContent: string,
  meta: PlanMeta,
): string {
  const lines: string[] = [];
  const relNode = rel(opts.nodePath, opts.projectDir);

  lines.push(
    "You are running **phase 2 (IMPLEMENT)** of `converge plan` at one node.",
    "Phase 1 wrote the analysis at the path below. Your job is to read it",
    "and materialize the child TASK.md files (and `wbs/index.js` for WBS",
    "children) under this node's directory. **You do not make planning",
    "decisions** — you only translate the analysis into runtime contracts.",
    "",
    `**Node directory**: \`${relNode}/\``,
    `**Mode**: ${opts.mode}`,
    "",
    `## PLAN.md (\`${relNode}/PLAN.md\`)`,
    "",
    planMdContent.trim(),
    "",
    "## Children to materialize",
    "",
  );

  for (const c of meta.children ?? []) {
    lines.push(`- \`${c.id}\` — kind: ${c.kind}${c.title ? ` — ${c.title}` : ""}`);
  }

  lines.push(
    "",
    "## The three child kinds",
    "",
    "Each child is one of:",
    "",
    "1. **`executable`** — atomic task. TASK.md has `outputs` + `checks` + a body.",
    "   Runtime runs it directly. **No** wbs/index.js, **no** further decomposition.",
    "2. **`container`** — *static* container. TASK.md is a thin contract; its",
    "   children are hand-written by the planner that runs on its path next.",
    "   **No** wbs/index.js. The planner will be re-invoked recursively after",
    "   you finish — you do nothing about its grandchildren.",
    "3. **`wbs`** — *dynamic* container. TASK.md has a `wbs:` pointer; you",
    "   ALSO write `wbs/index.js` that the runtime executes to spawn children",
    "   from data.",
    "",
    "## Your task",
    "",
    `For every child listed above, use **Bash** (\`mkdir -p\`) and **Write** to create:`,
    "",
    `- \`${relNode}/<child-id>/TASK.md\` — for **all** children (executable, container, wbs).`,
    `- \`${relNode}/<child-id>/wbs/index.js\` — additionally for **wbs** children.`,
    "",
    "## TASK.md schema",
    "",
    "Use the contract details from PLAN.md. The frontmatter shape:",
    "",
    "```yaml",
    "---",
    "title: <human title>",
    "outputs:                      # executable / leaf",
    "  - <path>",
    "checks:                       # executable / leaf",
    "  - id: <id>",
    "    cmd: <deterministic shell command>",
    "    description: <optional>",
    "wbs:                          # wbs only",
    "  type: nodejs | template | ai",
    "  path: ./wbs/index.js        # for nodejs",
    "---",
    "",
    "# <Title>",
    "",
    "**Goal**: <one sentence>",
    "",
    "## Scope",
    "",
    "<what this child receives from its parent — copy the scope sketch from PLAN.md>",
    "",
    "## Instructions / WBS / Decomposition",
    "",
    "<for executable: step-by-step body from PLAN.md>",
    "<for wbs: short note pointing at wbs/index.js and what drives the fan-out>",
    "<for container: \"This task decomposes further; run `converge plan` at this path.\">",
    "```",
    "",
    "## wbs/index.js shape (for WBS children)",
    "",
    "```js",
    "// Spawned at runtime when this WBS task expands.",
    "// `ctx` provides .vars, .spawn, .ai, .read, etc.",
    "export default async function wbs(ctx) {",
    "  // 1. Read whatever drives the fan-out (the `driver` from PLAN.md).",
    "  // 2. For each item, ctx.spawn(...) one child task with id and vars.",
    "}",
    "```",
    "",
    "## Hard rules",
    "- Write a TASK.md for **every** child listed above. Don't skip any.",
    "- For wbs children, also write `wbs/index.js`.",
    "- Make the directory first (`mkdir -p`), then write the files.",
    "- Do NOT modify or rewrite `PLAN.md` — phase 1 already finalized it.",
    "- Do NOT recurse into grandchildren. TS will re-invoke `runPlanLayer`",
    "  on each static-container child after you finish.",
  );

  if (opts.mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      "If a child's TASK.md already exists, **leave it alone** — do not",
      "overwrite. Only create files that don't yet exist.",
    );
  } else if (opts.mode === "update") {
    lines.push(
      "",
      "## Update mode",
      "If a child's TASK.md already exists, write the new contract to",
      "`<child-id>/TASK.md.proposed` instead of overwriting. The user will",
      "review and decide.",
    );
  }

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function rel(p: string, projectDir: string): string {
  if (p.startsWith(projectDir + "/")) return p.slice(projectDir.length + 1);
  if (p === projectDir) return ".";
  return p;
}

void writeFile;
