/**
 * Phase 1 — ANALYZE.
 *
 * One LLM call that reads the scope packet and writes the node's
 * PLAN.md. The PLAN.md must lead with YAML frontmatter that summarises
 * the layer (kind + children with id/kind/title); the body is markdown
 * analysis (objective, decision, per-child contracts, open questions).
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
    "1. **`executable`** — an *atomic* task (one concern, one artifact,",
    "   ~30-150 lines of generated code OR one config file OR one focused",
    "   refactor). Has `outputs` + `checks` + step-by-step body. No children.",
    "   - Right-sized: \"add /healthz route\", \"write panels.json schema\",",
    "     \"scaffold one Express app skeleton\".",
    "   - Too big (split into container or wbs): \"build the server\",",
    "     \"implement all UI panels\", \"wire up CLI + UI + docs\".",
    "   If the body would need >5 distinct file outputs or >3 unrelated",
    "   subtasks, it is NOT executable — make it a `container` or `wbs`.",
    "",
    "2. **`container`** — a *static* container. It decomposes into 3-7",
    "   hand-written children at plan time. After phase 2 writes its",
    "   TASK.md, the planner will be re-invoked recursively on its path",
    "   to plan its layer. (No runtime fan-out.)",
    "",
    "3. **`wbs`** — a *dynamic* container. Its children are spawned at",
    "   **runtime** (not plan time) by a `wbs/index.js` script that reads",
    "   a *driver* and emits one child per item. Use this when the count",
    "   and shape of children depend on data not known at plan time.",
    "   The driver can be:",
    "   - a structured file an upstream sibling produces (`panels.json`,",
    "     `sprites.json`, a directory listing) — read with `ctx.read`/`fs`,",
    "   - or a freeform spec the script extracts from at runtime via",
    "     `ctx.ai.askJson(prompt, zodSchema)` — unstructured-in,",
    "     structured-out. Use this when the source of truth is prose",
    "     (a markdown spec, a README, a transcript) and you don't want",
    "     to author a manifest-producer executable just to flatten it.",
    "   Spawned children are made from a template (`wbs/templates/<name>/`)",
    "   and inherit `vars` packed by the script.",
    "",
    "## How children connect (file-shaped contracts)",
    "",
    "Tasks coordinate through files, not shared memory. Each child gets a",
    "*viewport*: `inputs:` it can read (paths produced by upstream siblings",
    "or already in the project) and `outputs:` it must write (paths the",
    "framework snapshots so downstream siblings can read them). Coherence",
    "is enforced by file paths agreeing — if child B's `inputs:` lists a",
    "path child A's `outputs:` produces, the framework wires them; no",
    "telephone game. Keep each child's `inputs:` tight (only what it",
    "needs to do its slice of the work) — token cost grows with input",
    "count, and a leaky viewport defeats the decomposition.",
    "",
    "## PLAN.md body shape",
    "",
    "After the frontmatter, fill in:",
    "",
    "```markdown",
    "# Goal",
    "",
    "<restate this node's objective in your own words>",
    "",
    "# Decision",
    "",
    "<leaf or container, with one paragraph of reasoning>",
    "",
    "# Children          # only for container",
    "",
    "## <child-id> — <title>",
    "- **id**: <numeric-prefix kebab id, e.g. 00-scaffold, 01-runner —",
    "    must match the `children[].id` you put in frontmatter>",
    "- **kind**: executable | container | wbs",
    "- **objective**: <one sentence — what to deliver>",
    "- **description**: <one paragraph elaborating objective — copied to",
    "    TASK.md `description`. Why and how at a high level. Do NOT",
    "    repeat objective verbatim — they live side-by-side in TASK.md.>",
    "- **scope**: <what this node packs into the child's TASK.md>",
    "- **inputs**: <file paths the child reads — usually outputs of",
    "    earlier siblings, or files already in the project. Required",
    "    for every child. If only pre-existing project files, list them",
    "    explicitly; do not omit.>",
    "- **dependencies**: <sibling ids this child must wait on. Derived",
    "    from `inputs`: any sibling whose `outputs:` produces a path in",
    "    this child's `inputs:` is a dependency. Omit if none.>",
    "- **tags**: <1-3 short kebab tags, e.g. [scaffold, backend]>",
    "- **outputs**: <file paths the child produces>      # executable only",
    "- **checks**:                                        # executable only",
    "  - <id>: `<deterministic shell cmd that returns 0>`",
    "- **wbs**:                                           # wbs only",
    "    type: nodejs | template | ai",
    "    driver: <one-line description, e.g. \"one per character in",
    "      sprites.json\" or \"one per section extracted via ctx.ai.askJson",
    "      from spec.md\">",
    "- **body**: |                                        # executable only",
    "    <step-by-step instructions for the leaf agent>",
    "",
    "    ## Output schema   # REQUIRED if outputs contains a .json/.yaml",
    "    <inline JSON shape as a fenced block>",
    "",
    "    ## Example         # REQUIRED if outputs contains a .json/.yaml",
    "    <one filled-in record as a fenced block>",
    "",
    "# Open questions",
    "",
    "- <thing missing from your scope packet that you would need>",
    "```",
    "",
    "## Hard rules",
    "- Plan ONE layer. Do NOT enumerate grandchildren.",
    "- Every child must list `**inputs**` — the file paths it reads.",
    "  If only pre-existing project files, say so explicitly; do not",
    "  omit the field. Phase 2 copies this verbatim into TASK.md.",
    "- Every child must list `**description**` — one paragraph",
    "  elaborating objective. Phase 2 copies this into TASK.md `description`.",
    "  `objective` is one sentence; `description` is one paragraph; do not",
    "  duplicate them verbatim.",
    "- Every child must list `**tags**` — 1-3 short kebab tags.",
    "- `**dependencies**` is derived from `**inputs**`: if `inputs`",
    "  references a path another sibling's `outputs:` produces, that",
    "  sibling's id appears in `dependencies`. File-gating via `inputs`",
    "  is preferred at runtime, but `dependencies` makes the DAG",
    "  explicit for the runner. Omit only when truly independent.",
    "- When an executable child's `**outputs**` contains a `.json`",
    "  (or `.yaml`/`.toml`) manifest, the `**body**` MUST embed both",
    "  a `## Output schema` block (the JSON shape inline) and a",
    "  `## Example` block (one filled-in record). Reference shape:",
    "  `examples/cinematic-video-production/.converge/playbooks/",
    "  default/tasks/02-cast/001-extract/TASK.md`. Phase 2 copies",
    "  these blocks verbatim into the child's TASK.md.",
    "- Prefer 3-7 children. If N>=3 children share the same shape (one per",
    "  panel, one per command, one per entity), do NOT hand-write them as",
    "  siblings. Use ONE `wbs` child driven by a manifest.",
    "- If the manifest does not yet exist in the scope packet, add an",
    "  earlier sibling executable that *produces* the manifest (e.g.",
    "  `00-panels-manifest` outputs `panels.json`), then a `wbs` sibling",
    "  that fans out from it. Order matters — manifest producer first.",
    "- If unsure whether a shape is repetitive, surface it in",
    "  `# Open questions` rather than enumerating siblings defensively.",
    "- For wbs with no upstream manifest, prefer `ctx.ai.askJson(prompt,",
    "  schema)` over inventing a producer-executable when the source of",
    "  truth is prose. Use a producer-executable when the source is",
    "  already structured (CLI registry, config file, directory walk).",
    "- Wire siblings via files: a child's `inputs:` should reference an",
    "  earlier sibling's `outputs:` (or pre-existing project paths). Do",
    "  not assume children share state any other way.",
    "- Each executable child must have at least one deterministic check",
    "  that (a) FAILS against an empty/placeholder output and (b) PASSES",
    "  against a correctly produced output. Tautologies (`echo ok`,",
    "  `cat file | grep x || true`) will be rejected by the pre-flight",
    "  check linter — don't write them.",
    "- If something is missing from the scope packet that you'd need,",
    "  surface it in `# Open questions`. Do NOT invent.",
    "- The frontmatter `children` list is what TS parses to drive phase 2",
    "  and recursion — make sure every child you describe in the body has",
    "  a frontmatter entry, and vice versa.",
    "",
    "## Anti-patterns (do NOT do these)",
    "- Enumerating panels / screens / pages / commands / entities as",
    "  sibling executables. That is a wbs.",
    "- A single `executable` whose body says \"implement the server\" or",
    "  \"build the UI\". That is a container.",
    "- 5+ executable siblings whose titles differ only by a noun",
    "  (`dashboard`, `journal-viewer`, `playbook-browser`, ...). That is",
    "  a wbs whose driver iterates a manifest.",
    "- Inventing the manifest contents inline. If you need data you don't",
    "  have, add a manifest-producer executable first.",
    "",
    "## Patterns from working playbooks (mimic these shapes)",
    "",
    "**Manifest-driven fan-out** (cinematic-video-production: `05-breakdown`",
    "→ `06-storyboard`). Producer leaf outputs `shots.json`; sibling wbs",
    "reads it and spawns one templated child per shot.",
    "",
    "```js",
    "// wbs/index.js",
    "const shots = JSON.parse(readFileSync('shots.json', 'utf-8'));",
    "for (const shot of shots) {",
    "  await ctx.spawn(",
    "    { _type: 'template-ref', path: 'wbs/templates/shot/TASK.md',",
    "      vars: { shotId: shot.id, sceneId: shot.scene_id, action: shot.action } },",
    "    { id: shot.id });",
    "}",
    "```",
    "",
    "**File-gated chain instead of `dependencies:`** (game-assets-video",
    "scene stages). Each downstream stage's `inputs:` lists the upstream",
    "stage's `outputs:` paths; the runner blocks until they exist on disk.",
    "Prefer this over hand-listing `dependencies:`.",
    "",
    "**Aggregator** (game-assets-video `04-registry-build`). One leaf",
    "depends on multiple sibling phases via `dependencies:` and merges",
    "their outputs into a single `REGISTRY.json` consumed by later wbs",
    "fan-outs.",
    "",
    "**Per-stage child pipeline inside a wbs** (baby-app `03-build-screens`).",
    "Per-item the wbs spawns a parent + N ordered step children",
    "(`spec → design → convert → analyze → split → lift`), chaining via",
    "`dependencies: [prevId]` so steps run sequentially per item but items",
    "themselves run in parallel.",
    "",
    "**Check vocabulary that actually appears in working playbooks** —",
    "use these exact shapes, not invented ones:",
    "",
    "```yaml",
    "- cmd: test -f path/to/output.json                        # exists",
    "- cmd: test -s path/to/output.json                        # exists & non-empty",
    "- cmd: grep -qE \"## (Overview|Features)\" PRD.md           # has sections",
    "- cmd: |                                                  # JSON shape",
    "    node -e \"const r=require('./assets/REGISTRY.json'); for (const k of",
    "    ['characters','shared_props']) if(!r[k]) process.exit(1)\"",
    "- cmd: |                                                  # JSON via python",
    "    python -c \"import json; m=json.load(open('scene.json'));",
    "    assert m['id']=='{{scene_id}}'\"",
    "- cmd: find storyboard -name '*.png' | wc -l |            # count >= N",
    "    node -e \"process.exit(+require('fs').readFileSync(0,'utf8').trim()>=1?0:1)\"",
    "```",
    "",
    "**Scope-packing in `ctx.spawn` vars** (consistent across examples):",
    "pass the *minimum* keys the templated child needs — id, human title,",
    "and any item-specific fields. JSON-stringify nested arrays/objects",
    "(`bg_layers: JSON.stringify(scene.background?.layers || [])`). Provide",
    "defaults for optional fields (`mood: shot.mood || ''`). Don't make",
    "the child re-read the driver — pack the slice it needs.",
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
