/**
 * Phase 2 implementer for **wbs** (dynamic container) children.
 *
 * A wbs child fans out at *runtime*: a `wbs/index.js` script reads data
 * (the "driver" — sprites.json, a list of CLI commands, etc.) and
 * spawns one child per item via `ctx.spawn(...)`. That makes the wbs
 * implementer the trickiest of the three: the agent has to write both
 * a TASK.md **and** a working JS script that reads data, names children,
 * and packs each spawn's vars.
 *
 * Quality bar:
 *   - **TASK.md has `wbs:` pointer.** Type + path. No `outputs` /
 *     `checks` at the wbs-task level (those apply per spawned child).
 *   - **wbs/index.js is correct ESM.** Default-exports an async
 *     function. Uses `ctx.vars`, `ctx.read`, `ctx.spawn`, `ctx.ai`.
 *   - **Idempotent.** Re-running the wbs script with the same driver
 *     data must produce the same set of children with stable ids.
 *   - **Names children deterministically.** Use a slug derived from
 *     the driver item, not Math.random() or Date.now().
 *   - **Packs scope.** Each `ctx.spawn(...)` includes the vars the
 *     child needs — paths, slices of the driver data, parent context.
 */

import { agentfn } from "@converge/agentfn";
import { rel } from "./scope.ts";
import { taskMdSchemaBlock } from "./task-md-schema.ts";
import type { PlanLayerOpts, PlanMode } from "./types.ts";
import { PHASE_TIMEOUT_MS } from "./types.ts";

export interface ImplementWbsArgs {
  opts: PlanLayerOpts;
  mode: PlanMode;
  planMd: string;
  child: { id: string; title?: string };
  logDir: string;
}

export async function implementWbs(args: ImplementWbsArgs): Promise<void> {
  const prompt = buildWbsPrompt(args);
  const fn = agentfn({
    prompt,
    allowedTools: ["Read", "Glob", "Write", "Bash"],
    timeoutMs: PHASE_TIMEOUT_MS,
    cwd: args.opts.projectDir,
    logDir: args.logDir,
  });
  await fn();
}

function buildWbsPrompt(args: ImplementWbsArgs): string {
  const { opts, mode, planMd, child } = args;
  const relNode = rel(opts.nodePath, opts.projectDir);
  const lines: string[] = [];

  lines.push(
    "You are running **phase 2 (IMPLEMENT)** of `converge plan` for ONE",
    "**wbs** (dynamic container) child. A wbs child fans out at runtime:",
    "a `wbs/index.js` script reads data — the *driver* — and spawns one",
    "child task per item. You must write **both**:",
    "",
    `- \`${relNode}/${child.id}/TASK.md\` — the wbs-task contract`,
    `- \`${relNode}/${child.id}/wbs/index.js\` — the runtime fan-out script`,
    "",
    `**Parent node**: \`${relNode}/\``,
    `**Child id**: \`${child.id}\``,
    `**Mode**: ${mode}`,
    "",
    `## PLAN.md (\`${relNode}/PLAN.md\`)`,
    "",
    "Phase 1 wrote this. Find the section for this child and use its",
    "`wbs.driver` (what data drives the fan-out) and `scope` verbatim:",
    "",
    planMd.trim(),
    "",
    "## Your task",
    "",
    `Use **Bash** (\`mkdir -p ${relNode}/${child.id}/wbs\`) and **Write**`,
    "to create exactly two files:",
    "",
    `- \`${relNode}/${child.id}/TASK.md\``,
    `- \`${relNode}/${child.id}/wbs/index.js\``,
    "",
    "## TASK.md schema",
    "",
    taskMdSchemaBlock("wbs"),
    "",
    "## wbs/index.js shape",
    "",
    "```js",
    "// ESM. Default-exports an async function. Receives `ctx` from the",
    "// runtime; returns nothing (children are emitted via ctx.spawn).",
    "export default async function wbs(ctx) {",
    "  // 1. Read whatever drives the fan-out. Use ctx.read(path) when",
    "  //    the driver is a file inside the project; otherwise fall back",
    "  //    to plain fs.",
    "  const data = JSON.parse(await ctx.read('path/to/driver.json'));",
    "",
    "  // 2. For each item, spawn a child. The child id MUST be a stable",
    "  //    kebab-slug derived from the item — never Math.random() or",
    "  //    Date.now(). Re-running the wbs with the same data must produce",
    "  //    the same set of children.",
    "  for (const item of data.items) {",
    "    const id = slugify(item.name);",
    "    await ctx.spawn({",
    "      id,                                  // kebab slug",
    "      title: item.name,                    // human title",
    "      template: 'item-task',               // optional template name",
    "      vars: {                              // pack the scope",
    "        itemId: item.id,",
    "        itemName: item.name,",
    "        // ... whatever this child needs from the driver record",
    "      },",
    "    });",
    "  }",
    "}",
    "",
    "function slugify(s) {",
    "  return String(s)",
    "    .toLowerCase()",
    "    .replace(/[^a-z0-9]+/g, '-')",
    "    .replace(/^-|-$/g, '')",
    "    .slice(0, 64);",
    "}",
    "```",
    "",
    "## Quality bar",
    "",
    "**Idempotent.** Running the wbs script twice with the same driver",
    "data must produce the same set of children with the same ids. No",
    "Math.random(). No Date.now(). No \"new entry every run.\" If the",
    "driver doesn't have a stable identifier per item, derive one (slug",
    "of the name, hash of the content, index — anything stable).",
    "",
    "**Pack scope explicitly.** Every variable the spawned child needs",
    "to do its job goes into the `vars:` block of `ctx.spawn`. Don't",
    "rely on the child re-reading the driver — the child should be able",
    "to do its work from the vars alone. (Cross-tree reads are forbidden",
    "in the agent surface — the parent packs, the child unpacks.)",
    "",
    "**Handle the empty case.** If the driver has zero items, the wbs",
    "script spawns zero children and returns cleanly. No throws. No",
    "\"placeholder\" children.",
    "",
    "**Read the driver, don't infer it.** Use `ctx.read(path)` or",
    "`fs.readFile` — never assume the driver's content. If the driver",
    "doesn't exist yet (depends on an upstream task that hasn't run),",
    "log a clear message and return; the runtime will retry.",
    "",
    "## Hard rules",
    "- Write **both** files above. Make the `wbs/` directory first",
    "  (`mkdir -p`).",
    "- TASK.md frontmatter: `id`, `title`, `description`, `wbs:`,",
    "  `tags` always. Add `dependencies` and `inputs` whenever PLAN.md",
    "  lists them. **Do NOT** add `outputs:` or `checks:` — those",
    "  apply per spawned child, not to the wbs task itself.",
    "- The body MUST include `## Per-spawn child shape` — a concrete",
    "  list of the `id`, `title`, and `vars` keys each `ctx.spawn`",
    "  emits. The keys MUST match what `wbs/index.js` actually packs",
    "  into `ctx.spawn(...).vars`. These two sources of truth must",
    "  agree — if you add a var to one, add it to the other.",
    "- The wbs/index.js must be ESM (`export default async function`),",
    "  not CommonJS (`module.exports`).",
    "- Do NOT enumerate the spawned children's TASK.md content here —",
    "  that's runtime's job when the wbs expands.",
    "- `description` is one paragraph (high-level). `goal` is one",
    "  sentence. Do not duplicate verbatim.",
  );

  if (mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      "If either file already exists, **leave it alone** — do not",
      "overwrite. Only create files that don't yet exist.",
    );
  } else if (mode === "update") {
    lines.push(
      "",
      "## Update mode",
      "If either file already exists, write the new content next to it",
      "with a `.proposed` suffix (e.g. `TASK.md.proposed`,",
      "`wbs/index.js.proposed`) instead of overwriting.",
    );
  }

  return lines.join("\n");
}
