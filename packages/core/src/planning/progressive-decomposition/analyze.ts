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
import { agentfn as defaultAgentfn } from "@openplaybooks/agentfn";
import { rel } from "./scope.ts";
import type { PlanLayerOpts, PlanMode, ScopePacket } from "./types.ts";
import { PHASE_TIMEOUT_MS } from "./types.ts";

/**
 * Agent factory the planner uses to drive an LLM call. Matches the
 * shape `@openplaybooks/agentfn`'s default export returns. Tests can pass
 * a stub that writes the expected files and returns immediately.
 */
export type AgentfnFactory = typeof defaultAgentfn;

export interface AnalyzeArgs {
  opts: PlanLayerOpts;
  mode: PlanMode;
  scope: ScopePacket;
  logDir: string;
  /** Root analysis — plans top-level only, identifies delegation pattern. */
  isRoot?: boolean;
  /**
   * Override the agent factory. Defaults to `@openplaybooks/agentfn`'s
   * global default. Tests pass a stub here.
   */
  agentfn?: AgentfnFactory;
}

export async function runAnalyze(args: AnalyzeArgs): Promise<void> {
  const prompt = buildAnalyzePrompt(args);
  const factory = args.agentfn ?? defaultAgentfn;
  const fn = factory({
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
  if (args.isRoot) return buildRootAnalyzePrompt(args);
  return buildLayerAnalyzePrompt(args);
}

function buildLayerAnalyzePrompt(args: AnalyzeArgs): string {
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
    lines.push(
      "",
      "### playbook.yml",
      "",
      "```yaml",
      scope.playbookYml.trim(),
      "```",
    );
  if (scope.rootPlan)
    lines.push("", "### Root PLAN.md", "", scope.rootPlan.trim());
  for (const anc of scope.ancestors) {
    lines.push("", `### Ancestor: ${rel(anc.path, opts.projectDir)}`);
    if (anc.plan) lines.push("", "#### PLAN.md", "", anc.plan.trim());
    if (anc.task) lines.push("", "#### TASK.md", "", anc.task.trim());
  }
  if (scope.myTask)
    lines.push("", "### My own TASK.md", "", scope.myTask.trim());
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
    "kind: task | container",
    "children:                       # required if kind=container, omit if task",
    "  - id: <kebab-case-slug>       # 3-7 entries",
    "    kind: container | seed",
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
    '   - Right-sized: "add /healthz route", "write panels.json schema",',
    '     "scaffold one Express app skeleton".',
    '   - Too big (split into container or seed): "build the server",',
    '     "implement all UI panels", "wire up CLI + UI + docs".',
    "   If the body would need >5 distinct file outputs or >3 unrelated",
    "   subtasks, it is NOT executable — make it a `container` or `seed`.",
    "",
    "2. **`container`** — a *static* container. It decomposes into 3-7",
    "   hand-written children at plan time. After phase 2 writes its",
    "   TASK.md, the planner will be re-invoked recursively on its path",
    "   to plan its layer. (No runtime fan-out.)",
    "",
    "3. **`seed`** — a *dynamic* container. Its children are spawned at",
    "   **runtime** (not plan time) by a `index.js` script that reads",
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
    "   Spawned children are made from a template (`templates/<name>/`)",
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
    "<task or container, with one paragraph of reasoning>",
    "",
    "# Children          # only for container",
    "",
    "## <child-id> — <title>",
    "- **id**: <numeric-prefix kebab id, e.g. 00-scaffold, 01-runner —",
    "    must match the `children[].id` you put in frontmatter>",
    "- **kind**: executable | container | seed",
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
    "- **seed**:                                          # seed only",
    "    type: nodejs | template | ai",
    '    driver: <one-line description, e.g. "one per character in',
    '      sprites.json" or "one per section extracted via ctx.ai.askJson',
    '      from spec.md">',
    "- **seed catalog**: <comma-separated list of kebab-case child ids,",
    "    REQUIRED if the user prompt enumerates the items. e.g. for",
    '    "5 screens (home, product detail, science, faq, checkout)"',
    "    write: `home, product-detail, science, faq, checkout`. Omit",
    "    only when the catalog is genuinely unknown at plan time and",
    "    must come from runtime data.>     # seed only",
    "- **body**: |                                        # executable only",
    "    <step-by-step instructions for the task agent>",
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
    "  `## Example` block (one filled-in record). See any working",
    "  playbook's TASK.md for the reference shape. Phase 2 copies",
    "  these blocks verbatim into the child's TASK.md.",
    "- Prefer 3-7 children. If N>=3 children share the same shape (one per",
    "  panel, one per command, one per entity), do NOT hand-write them as",
    "  siblings. Use ONE seed child driven by a manifest.",
    "- If the manifest does not yet exist in the scope packet, add an",
    "  earlier sibling executable that *produces* the manifest (e.g.",
    "  `00-panels-manifest` outputs `panels.json`), then a `seed` sibling",
    "  that fans out from it. Order matters — manifest producer first.",
    "- If unsure whether a shape is repetitive, surface it in",
    "  `# Open questions` rather than enumerating siblings defensively.",
    "- For seeds with no upstream manifest, prefer `ctx.ai.askJson(prompt,",
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
    "  sibling executables. That is a seed.",
    '- A single `executable` whose body says "implement the server" or',
    '  "build the UI". That is a container.',
    "- 5+ executable siblings whose titles differ only by a noun",
    "  (`dashboard`, `journal-viewer`, `playbook-browser`, ...). That is",
    "  a seed whose driver iterates a manifest.",
    "- Inventing the manifest contents inline. If you need data you don't",
    "  have, add a manifest-producer executable first.",
    "",
    "## Patterns from working playbooks (mimic these shapes)",
    "",
    "**Manifest-driven fan-out**. Producer task outputs a manifest",
    "(e.g. `shots.json`); sibling seed reads it and spawns one",
    "templated child per item.",
    "",
    "```js",
    "// index.js",
    "const shots = JSON.parse(readFileSync('shots.json', 'utf-8'));",
    "for (const shot of shots) {",
    "  await ctx.spawn(",
    "    { _type: 'template-ref', path: 'templates/shot/TASK.md',",
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
    "**Aggregator** (game-assets-video `04-registry-build`). One task",
    "depends on multiple sibling phases via `dependencies:` and merges",
    "their outputs into a single `REGISTRY.json` consumed by later seed",
    "fan-outs.",
    "",
    "**Per-stage child pipeline inside a seed.* (baby-app `03-build-screens`).",
    "Per-item the seed spawns a parent + N ordered step children",
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
    '- cmd: grep -qE "## (Overview|Features)" PRD.md           # has sections',
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

// ── Root analysis prompt (Phase 1 of init --from-prompt) ───────────

function buildRootAnalyzePrompt(args: AnalyzeArgs): string {
  const { opts, mode, scope } = args;
  const lines: string[] = [];
  const relNode = rel(opts.nodePath, opts.projectDir);

  lines.push(
    "You are running **Phase 1 (ANALYZE)** of `converge init --from-prompt`.",
    "This is the ROOT analysis — you see the entire problem and design the",
    "top-level structure. You do NOT plan children's children. You are the",
    "director handing out phase-level contracts.",
    "",
    "**Your job:** read the prompt, identify the delegation pattern, declare",
    "top-level phases, identify which are seeds (dynamic fan-out), and add tests, identify which are seeds (dynamic fan-out), and add tests",
    "dynamic, and identify test points.",
    "",
    `**Node**: \`${relNode}\``,
    `**Kind**: ${opts.nodeKind}`,
    `**Mode**: ${mode}`,
  );

  if (opts.prompt) {
    lines.push("", "## User intent (--from-prompt)", "", `"${opts.prompt}"`);
  }

  lines.push("", "## Scope packet (what exists so far)");
  if (scope.brief)
    lines.push("", "### Project brief (idea.md)", "", scope.brief.trim());
  if (scope.playbookYml)
    lines.push(
      "",
      "### playbook.yml",
      "",
      "```yaml",
      scope.playbookYml.trim(),
      "```",
    );

  lines.push(
    "",
    "## Your task",
    "",
    `Use the **Write** tool to create the file \`${relNode}/PLAN.md\`.`,
    "It MUST start with YAML frontmatter, then markdown body. Use this shape:",
    "",
    "```",
    "---",
    "kind: container",
    "",
    "children:",
    "  - id: <kebab-case-slug>",
    "    kind: container | seed",
    "    title: <human title>",
    "",
    "---",
    "```",
    "",
    "## Delegation patterns (pick one)",
    "",
    "Identify which of the five delegation patterns fits this project:",
    "- **Lifecycle Pipeline** — one artifact, ordered stages, entities replicate",
    "  within a stage (per-screen, per-endpoint). Top-level: prepare → design →",
    "  build → behavior → wire → polish.",
    "- **Process Pipeline** — deterministic stages, atomic leaves. Each stage",
    "  produces a qualitatively different artifact. Linear DAG.",
    "- **Creative Workflow** — sequential creative refinement, late-stage fan-out.",
    "  Early singleton stages → late per-asset seed.",
    "- **Domain Layering** — N parallel pipelines, one per entity. Shared upstream",
    "  specs, then per-character / per-scene / per-prop fan-out.",
    "- **Epoch Loop** — iterative refinement until convergence. One template",
    "  instantiated N times. Stop on a convergence check.",
    "",
    "",
    "## Scale — you may declare more children at root",
    "",
    "Unlike per-layer planning (capped at 3-7 children), the root PLAN.md may",
    "declare **up to 15 top-level children** for complex projects. Each child",
    "is a delegation unit — its own children will be planned by separate agents",
    "at the next delegation level. If you need more than 15, group some into",
    "a container or mark repetitive work as seed.",
    "",
    "## PLAN.md body shape",
    "",
    "After the frontmatter, fill in:",
    "",
    "```markdown",
    "# Goal",
    "",
    "<restate the project's objective from the prompt, one paragraph>",
    "",
    "# Delegation pattern",
    "",
    "<which pattern, why, and the overall DAG shape>",
    "",
    "# Children",
    "",
    "## <child-id> — <title>",
    "- **id**: <kebab-case-slug, must match frontmatter>",
    "- **kind**: executable | container | seed",
    "- **seed driver**: <what drives the fan-out — seed only>",
    "- **objective**: <one sentence — what this phase delivers>",
    "- **description**: <one paragraph — why and how at a high level>",
    "- **inputs**: <file paths this phase reads>",
    "- **dependencies**: <other phase ids this must wait on>",
    "- **tags**: <1-3 kebab tags>",
    "- **outputs**: <file paths this phase produces — executable only>",
    "- **checks**: <shell commands — executable only>",
    "- **seed driver**: <one-line description of what drives the fan-out — seed only>",
    "",
    "# Test points",
    "",
    "- <phase-boundary checks that gate progression>",
    "- <cross-phase invariants for playbook-level checks>",
    "",
    "# Open questions",
    "",
    "- <things you'd need to know to plan deeper levels>",
    "```",
    "",
    "## Hard rules",
    "",
    "- **Plan ONE level.** You are declaring top-level phases only. Each phase's",
    "  internal children will be planned by a delegation agent later. DO NOT",
    "  enumerate grandchildren in the body.",
    "- **Prefer container for top-level phases.** Most phases are too big for a single executable. Only use `executable` for trivial single-file tasks.",
    "- **Seed = dynamic fan-out.** If a phase fans out over a data-driven list (per-screen, per-character), use `kind: seed`. Seeds get SEED.md + index.js stubs resolved via `converge compile --seed`.",
    "  Seeds are NOT expanded during init — they stay as stubs.",
    "- **Every child must have `inputs`** — even if only existing project files.",
    "- **Every executable child must have `outputs` + `checks`.** At least one",
    "  deterministic check per output.",
    "- **Dependencies form a DAG.** The `dependencies` field makes edges explicit.",
    "  Sort order of children in the list is the default execution order;",
    "  `dependencies` override it.",
    "- **Test points at boundaries.** Identify where phase-boundary checks go.",
    "  These become playbook-level checks.",
    "- **Frontiers are honest.** If a seed child's sub-tasks are unknown at plan",
    "  time, say so. Don't invent the list.",
    "- **If unsure, ask in Open questions.** Don't invent.",
    "- **The frontmatter `children` list drives phase 2 and 3.** Make sure every",
    "  child in the body has a frontmatter entry and vice versa.",
    "",
    "## Anti-patterns (do NOT do these)",
    "- Listing 20+ sibling executables at the root. Group into containers.",
    "- Making everything `container`. Leaves should be `executable` or `seed`.",
    "- Numeric prefixes on IDs (`01-foo`) — just use `foo`.",
    "- Inventing sub-task lists for seed children — that happens at runtime, not plan time.",
    '- A single executable whose objective is "build the whole app".',
  );

  if (mode === "update") {
    lines.push(
      "",
      "## Update mode",
      "Review the previous PLAN.md (in scope packet). Revise based on new",
      "understanding. Be explicit about what changed.",
    );
  }

  return lines.join("\n");
}
