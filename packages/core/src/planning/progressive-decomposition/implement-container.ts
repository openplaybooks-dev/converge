/**
 * Phase 2 implementer for **container** (static container) children.
 *
 * A container child decomposes further at plan time — `runPlanLayer`
 * will be re-invoked on its path right after this implementer returns.
 * That means the TASK.md we write here is a **thin contract**: just the
 * objective, scope, and a pointer to the planner. We do NOT enumerate the
 * grandchildren — that's the next planner's job.
 *
 * Quality bar:
 *   - **Thin** — no `outputs`, no `checks` at this level (those belong
 *     to the descendant leaves). No `driver:`. No body that pretends to
 *     describe execution.
 *   - **Scope is verbatim** — copy the `scope` field from PLAN.md so
 *     the next planner has exactly what the parent meant to pack.
 *   - **Goal is restated** — short, clear, in the parent's words.
 */

import { agentfn } from "@converge/agentfn";
import { rel } from "./scope.ts";
import { taskMdSchemaBlock } from "./task-md-schema.ts";
import type { PlanLayerOpts, PlanMode } from "./types.ts";
import { PHASE_TIMEOUT_MS } from "./types.ts";

export interface ImplementContainerArgs {
  opts: PlanLayerOpts;
  mode: PlanMode;
  planMd: string;
  child: { id: string; title?: string };
  logDir: string;
}

export async function implementContainer(
  args: ImplementContainerArgs,
): Promise<void> {
  const prompt = buildContainerPrompt(args);
  const fn = agentfn({
    prompt,
    allowedTools: ["Read", "Glob", "Write", "Bash"],
    timeoutMs: PHASE_TIMEOUT_MS,
    cwd: args.opts.projectDir,
    logDir: args.logDir,
  });
  await fn();
}

function buildContainerPrompt(args: ImplementContainerArgs): string {
  const { opts, mode, planMd, child } = args;
  const relNode = rel(opts.nodePath, opts.projectDir);
  const lines: string[] = [];

  lines.push(
    "You are running **phase 2 (IMPLEMENT)** of `converge plan` for ONE",
    "**static container** child. A container child decomposes further at",
    "plan time — the planner will be re-invoked on its path right after",
    "you return. So the TASK.md you write here is a **thin contract**:",
    "the objective and the scope. No execution details. No outputs/checks (those",
    "belong to descendants). No driver.",
    "",
    `**Parent node**: \`${relNode}/\``,
    `**Child id**: \`${child.id}\``,
    `**Mode**: ${mode}`,
    "",
    `## PLAN.md (\`${relNode}/PLAN.md\`)`,
    "",
    "Phase 1 wrote this. Find the section for this child and use its",
    "objective and scope verbatim:",
    "",
    planMd.trim(),
    "",
    "## Your task",
    "",
    `Use **Bash** (\`mkdir -p\`) and **Write** to create exactly one file:`,
    "",
    `- \`${relNode}/${child.id}/TASK.md\``,
    "",
    "## TASK.md schema",
    "",
    taskMdSchemaBlock("container"),
    "",
    "## Quality bar",
    "",
    "**Thin contract — keep it minimal.** A container's TASK.md is read",
    "by two readers: humans skimming the tree, and the next planner",
    "looking at this node as an ancestor. Both want the objective + scope.",
    "Neither wants speculation about how the work breaks down — that's",
    "what the next plan layer is for.",
    "",
    "**Do NOT write:**",
    "- `outputs:` — descendant leaves have outputs; the container itself",
    "  doesn't produce a single artifact.",
    "- `checks:` — descendant leaves have checks; layer-level success is",
    "  the conjunction of descendant checks.",
    "- `driver:` — that's the dynamic-container kind, not this one.",
    "- Step-by-step instructions in the body — there are no steps to",
    "  enumerate at this level. The next planner enumerates them.",
    "",
    "**Do write:**",
    "- Frontmatter: `id`, `title`, `description` always. Add",
    "  `dependencies`, `inputs`, `tags` whenever PLAN.md lists them.",
    "- A clear `# <Title>` and `**Goal**: <one sentence>`.",
    "- A `## Scope` section with the parent-supplied context, verbatim.",
    "- An `### Inherited context` subsection (max 5 bullets) inside",
    "  Scope. Extract these facts from the PLAN.md already in this",
    "  prompt — do not invent. The bullets exist so the next planner",
    "  (and human readers) immediately see what's already decided",
    "  upstream that binds this subtree (package paths, transports,",
    "  manifest paths, naming conventions). Cap at 5 bullets — more",
    "  than that bloats every descendant's scope packet.",
    "- A short `## Decomposition` note pointing at `converge plan`.",
    "",
    "## Hard rules",
    "- Write **exactly** the one file above. No `wbs/index.js`. No",
    "  sub-directories. No grandchildren.",
    "- Frontmatter MUST NOT contain `outputs`, `checks`, or `driver:` —",
    "  those don't belong on a static container at this stage.",
    "- Cap `### Inherited context` at 5 bullets. If there are more",
    "  candidate facts, keep the ones that bind decisions (paths,",
    "  protocols, contracts) over the ones that describe state.",
    "- `description` is one paragraph (high-level why/how). `objective` is",
    "  one sentence (what to deliver). Do not duplicate verbatim.",
  );

  if (mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      `If \`${relNode}/${child.id}/TASK.md\` already exists, **leave it**`,
      "**alone** — do not overwrite.",
    );
  } else if (mode === "update") {
    lines.push(
      "",
      "## Update mode",
      `If \`${relNode}/${child.id}/TASK.md\` already exists, write the new`,
      `contract to \`${relNode}/${child.id}/TASK.md.proposed\` instead.`,
    );
  }

  return lines.join("\n");
}
