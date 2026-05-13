/**
 * Phase 2 implementer for **executable** children.
 *
 * An executable child is an atomic, leaf-level task: runtime runs it
 * directly, no further decomposition. The TASK.md it gets must be
 * runnable by an agent without further planning.
 *
 * Quality bar:
 *   - **Deterministic checks** — exit-coded shell commands the runtime
 *     can run to gate completion. No fuzzy "looks right" predicates.
 *   - **Clear instructions** — step-by-step body, name the tools, name
 *     the inputs, name the outputs. No vague "make it work."
 *   - **All inputs explicit** — every file/var the child needs comes
 *     from the parent's contract; the child does not go hunting.
 */

import { agentfn } from "@converge/agentfn";
import { rel } from "./scope.ts";
import { taskMdSchemaBlock } from "./task-md-schema.ts";
import type { PlanLayerOpts, PlanMode } from "./types.ts";
import { PHASE_TIMEOUT_MS } from "./types.ts";

export interface ImplementExecutableArgs {
  opts: PlanLayerOpts;
  mode: PlanMode;
  planMd: string;
  child: { id: string; title?: string };
  logDir: string;
}

export async function implementExecutable(
  args: ImplementExecutableArgs,
): Promise<void> {
  const prompt = buildExecutablePrompt(args);
  const fn = agentfn({
    prompt,
    allowedTools: ["Read", "Glob", "Write", "Bash"],
    timeoutMs: PHASE_TIMEOUT_MS,
    cwd: args.opts.projectDir,
    logDir: args.logDir,
  });
  await fn();
}

function buildExecutablePrompt(args: ImplementExecutableArgs): string {
  const { opts, mode, planMd, child } = args;
  const relNode = rel(opts.nodePath, opts.projectDir);
  const lines: string[] = [];

  lines.push(
    "You are running **phase 2 (IMPLEMENT)** of `converge plan` for ONE",
    "**executable** child. An executable child is atomic — runtime runs",
    "its TASK.md directly. No children. No further planning.",
    "",
    `**Parent node**: \`${relNode}/\``,
    `**Child id**: \`${child.id}\``,
    `**Mode**: ${mode}`,
    "",
    `## PLAN.md (\`${relNode}/PLAN.md\`)`,
    "",
    "Phase 1 wrote this. Find the section for this child and use its",
    "contract (objective, scope, outputs, checks, body) verbatim:",
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
    taskMdSchemaBlock("executable"),
    "",
    "## Quality bar (this is the whole reason this prompt exists)",
    "",
    "**Checks must be deterministic.** A check passes when its shell",
    "command exits 0; fails when it exits non-zero. Good examples:",
    "",
    "- `test -f path/to/output.json` — file exists",
    "- `test -s path/to/output.json` — file exists and is non-empty",
    "- `jq -e '.items | length >= 1' path/to/output.json` — JSON has at least one item",
    "- `python -c 'import json,sys; json.load(open(sys.argv[1]))' path/to/output.json` — valid JSON",
    "- `grep -q 'export default' src/App.tsx` — file contains required export",
    "- `npx tsc --noEmit` — TypeScript compiles",
    "- `npm test -- --passWithNoTests` — tests pass",
    "",
    "Bad examples (do NOT write checks like this):",
    "",
    "- `echo 'looks good'` — always passes, gates nothing",
    "- `cat output.json | grep something || true` — never fails",
    "- `# manual review` — not a command",
    "",
    "**Every output declared in `outputs:` should have at least one check",
    "that verifies it.** File-exists is the floor; non-empty / schema-valid",
    "/ structurally-correct are better. Layer them: presence → non-empty",
    "→ valid format → semantic correctness.",
    "",
    "**Instructions must be concrete.** Numbered steps. Name the tools.",
    "Name the file paths. Don't write \"figure out the data structure\" —",
    "write \"read `inputs/sprites.json`, parse with `JSON.parse`, iterate",
    "`.characters[]`.\" If you're not sure how the body should read, copy",
    "the `body:` field from PLAN.md verbatim — do not paraphrase it down.",
    "",
    "**Manifest producers MUST embed schema + example.** If `outputs:`",
    "contains a `.json` (or `.yaml`/`.toml`) file, the body MUST include",
    "both a `## Output schema` block (the shape inline as a fenced JSON",
    "block) and a `## Example` block (one filled-in record). Copy these",
    "verbatim from PLAN.md's per-child `body` field. See any working",
    "playbook's TASK.md for the reference shape. If PLAN.md omitted the schema",
    "but `outputs:` contains a manifest, add a one-line note at the",
    "bottom of the body flagging the gap so the user can fix PLAN.md.",
    "",
    "**Conservative frontmatter set.** Emit `id`, `title`, `description`,",
    "`outputs`, `checks`, `tags` always. Emit `dependencies` and",
    "`inputs` whenever PLAN.md lists them. Do NOT emit `vars`,",
    "`materials`, `agent`, `skills`, `allowed-tools` — those are easy",
    "to mis-infer and the conservative subset above is what curated",
    "playbooks consistently use.",
    "",
    "**`description` vs `objective`**: `objective` is one sentence (\"what to",
    "deliver\"). `description` is one paragraph (\"why and how, at a",
    "high level\"). Do not duplicate verbatim. Both come from PLAN.md.",
    "",
    "## Hard rules",
    "- Write **exactly** the one file above. No `index.js`. No",
    "  sub-directories. No grandchildren.",
    "- The frontmatter must be valid YAML. Quote any value that contains",
    "  `:`, `#`, or `'` to keep the parser happy.",
    "- If PLAN.md's contract for this child is missing required fields",
    "  (no checks, no outputs), still produce the best TASK.md you can",
    "  from what's there — but add a note at the bottom flagging the gap",
    "  so the user can fix it before running.",
  );

  if (mode === "fill-in") {
    lines.push(
      "",
      "## Fill-in mode",
      `If \`${relNode}/${child.id}/TASK.md\` already exists, **leave it**`,
      "**alone** — do not overwrite. Print one line acknowledging skip and stop.",
    );
  } else if (mode === "update") {
    lines.push(
      "",
      "## Update mode",
      `If \`${relNode}/${child.id}/TASK.md\` already exists, write the new`,
      `contract to \`${relNode}/${child.id}/TASK.md.proposed\` instead of`,
      "overwriting. The user reviews the diff and decides.",
    );
  }

  return lines.join("\n");
}
