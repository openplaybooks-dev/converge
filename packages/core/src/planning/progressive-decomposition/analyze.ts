/**
 * Phase 1 — ANALYZE.
 *
 * One LLM call that reads the scope packet and writes the node's
 * PLAN.md. The PLAN.md must lead with YAML frontmatter that summarises
 * the layer (kind + children with id/kind/title); the body is markdown
 * analysis (goal, decision, per-child contracts, open questions).
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import { agentfn } from "@converge/agentfn";
import { rel } from "./scope.ts";
import type { PlanLayerOpts, PlanMode, ScopePacket } from "./types.ts";
import { PHASE_TIMEOUT_MS } from "./types.ts";

export interface AnalyzeArgs {
  opts: PlanLayerOpts;
  mode: PlanMode;
  scope: ScopePacket;
  logDir: string;
}

export async function runAnalyze(args: AnalyzeArgs): Promise<void> {
  const prompt = buildAnalyzePrompt(args);
  const fn = agentfn({
    prompt,
    allowedTools: ["Read", "Glob", "Grep", "Write"],
    timeoutMs: PHASE_TIMEOUT_MS,
    cwd: args.opts.projectDir,
    logDir: args.logDir,
  });
  await fn();
  if (!existsSync(join(args.opts.nodePath, "PLAN.md"))) {
    throw new Error(
      `phase 1 did not produce ${rel(args.opts.nodePath, args.opts.projectDir)}/PLAN.md`,
    );
  }
}

function buildAnalyzePrompt(args: AnalyzeArgs): string {
  const { opts, mode, scope } = args;
  const lines: string[] = [];
  const relNode = rel(opts.nodePath, opts.projectDir);

  lines.push(
    "You are running **phase 1 (ANALYZE)** of `converge plan` at one node.",
    "**Progressive decomposition** — plan ONE layer only. Do NOT plan grandchildren.",
    "Do NOT read siblings or any node's descendants. The scope packet below is exhaustive.",
    "",
    `**Node**: \`${relNode}\``,
    `**Kind**: ${opts.nodeKind}`,
    `**Mode**: ${mode}`,
  );

  if (opts.prompt) {
    lines.push("", "## User intent (-p)", "", `"${opts.prompt}"`);
  }

  lines.push("", "## Scope packet (root → ancestors → me)");
  if (scope.brief)
    lines.push("", "### Project brief (idea.md)", "", scope.brief.trim());
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
    "After the frontmatter, fill in:",
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

  if (mode === "update") {
    lines.push(
      "",
      "## Update mode",
      "The previous PLAN.md is in the scope packet. Treat it as a draft to",
      "revise. Be explicit about what changed and why.",
    );
  } else if (mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      "PLAN.md may already have existed. Re-analyse from scratch. The",
      "runtime will preserve existing child TASK.md files in phase 2.",
    );
  }

  return lines.join("\n");
}
