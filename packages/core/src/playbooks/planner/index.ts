/**
 * The planner expressed as a code-defined playbook.
 *
 * `definePlannerPlaybook(opts)` returns a `Playbook` whose tasks plan a
 * new playbook on disk. Four tasks, granular enough that the studio's
 * `PlanningConsole` shows real progress, simple enough that everything
 * except `analyze` is deterministic JS.
 *
 *   1. scaffold-root      — write stub playbook.yml (deterministic)
 *   2. analyze            — call `runAnalyze` to emit PLAN.md (LLM)
 *   3. parse-plan         — parse PLAN.md frontmatter; spawn() each
 *                            child so the studio's review surface
 *                            populates (deterministic)
 *   4. materialize-children — write tasks/<id>/TASK.md per child,
 *                            harvesting per-child contracts + checks +
 *                            real DAG dependencies + seed catalogs
 *                            from the PLAN.md body (deterministic)
 *
 * The studio's `runPlanner` (planner-stream.ts) consumes the
 * `task-start` / `task-complete` / `children-spawned` events the
 * runtime emits as this playbook executes. No special planning
 * protocol — same lifecycle as any other playbook.
 *
 * Tests pass an `agentfn` stub through `opts` so the analyze step
 * runs without an LLM call.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { definePlaybook, taskDef } from "../../playbook.js";
import type { Playbook } from "../../playbook.js";
import { parsePlanMdFrontmatter } from "../../planning/progressive-decomposition/parser.js";
import { readScopePacket } from "../../planning/progressive-decomposition/scope.js";
import { runAnalyze } from "../../planning/progressive-decomposition/analyze.js";
import type { AgentfnFactory } from "../../planning/progressive-decomposition/analyze.js";
import type { PlanMeta } from "../../planning/progressive-decomposition/types.js";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface DefinePlannerPlaybookOpts {
  /** Free-form description of what to plan. */
  goal: string;
  /** Optional kebab-case slug for the produced playbook. */
  name?: string;
  /** Where the produced playbook lands on disk (absolute path). */
  outputDir: string;
  /**
   * Project dir (where `.converge/` lives). Used by `runAnalyze`
   * for scope-packet reads. Defaults to the parent of `outputDir`'s
   * `.converge/playbooks/` ancestor.
   */
  projectDir?: string;
  /** Re-plan an existing PLAN.md in place. */
  update?: boolean;
  /**
   * Override the agent factory. Tests stub this; production callers
   * leave it undefined to use `@converge/agentfn`'s default.
   */
  agentfn?: AgentfnFactory;
}

/**
 * Build the planner-playbook.
 *
 * The returned `Playbook` is interchangeable with any other playbook —
 * `run(playbook, opts)` accepts it. The CLI's `plan` verb and the
 * studio's `/api/playbooks/plan` route both call this via `plan(opts)`.
 */
export function definePlannerPlaybook(
  opts: DefinePlannerPlaybookOpts,
): Playbook {
  const slug = opts.name ?? slugifyPrompt(opts.goal) ?? "plan";
  const outputDir = opts.outputDir;
  const projectDir = opts.projectDir ?? deriveProjectDir(outputDir);
  const update = !!opts.update;
  const agentfn = opts.agentfn;

  return definePlaybook({
    name: `plan-${slug}`,
    description: `Plan a playbook for: ${truncate(opts.goal, 120)}`,
    inputs: {
      goal: { default: opts.goal, required: true },
    },
    run: { mode: "oneoff", maxTaskAttempts: 1 },
    tasks: [
      taskDef()
        .id("scaffold-root")
        .title("Scaffold the playbook root")
        .description(
          "Create the playbook directory with a stub playbook.yml so the " +
            "subsequent analyze step has somewhere to write PLAN.md.",
        )
        .executor(async (ctx: any) => {
          if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
          }
          const ymlPath = join(outputDir, "playbook.yml");
          if (!existsSync(ymlPath)) {
            const stub = [
              `name: ${slug}`,
              `description: ${jsonString(opts.goal)}`,
              "",
              "run:",
              "  mode: oneoff",
              "  maxTaskAttempts: 3",
              "",
              "tasks: []",
              "",
            ].join("\n");
            writeFileSync(ymlPath, stub, "utf8");
            ctx.log?.info?.(`wrote ${ymlPath}`);
          } else {
            ctx.log?.info?.(`${ymlPath} already exists, skipping scaffold`);
          }
        })
        .build(),

      taskDef()
        .id("analyze")
        .title("Analyze the goal and write PLAN.md")
        .description(
          "Phase 1 of progressive decomposition: one agent call that " +
            "reads the scope packet (root → ancestors → me) and writes " +
            "<outputDir>/PLAN.md. The PLAN.md must lead with YAML " +
            "frontmatter listing the layer's children (id + kind).",
        )
        .dependencies(["scaffold-root"])
        .executor(async (ctx: any) => {
          const planLayerOpts = {
            nodePath: outputDir,
            nodeKind: "playbook-root" as const,
            playbookRoot: outputDir,
            projectDir,
            prompt: opts.goal,
            update,
            isRoot: true,
          };
          const scope = readScopePacket(planLayerOpts);
          const logDir = join(projectDir, ".converge", "logs", "plan");
          mkdirSync(logDir, { recursive: true });

          await runAnalyze({
            opts: planLayerOpts,
            mode: update ? "update" : "fresh",
            scope,
            logDir,
            isRoot: true,
            agentfn,
          });
          ctx.log?.info?.(`wrote ${join(outputDir, "PLAN.md")}`);
        })
        .build(),

      taskDef()
        .id("parse-plan")
        .title("Parse PLAN.md and surface drafted children")
        .description(
          "Read the PLAN.md the analyze task just wrote, parse its " +
            "YAML frontmatter, and call ctx.spawn() once per declared " +
            "child. The runtime forwards these as `children-spawned` " +
            "events the studio renders in its plan-review surface.",
        )
        .dependencies(["analyze"])
        .executor(async (ctx: any) => {
          const planMdPath = join(outputDir, "PLAN.md");
          if (!existsSync(planMdPath)) {
            throw new Error(
              `parse-plan: PLAN.md not found at ${planMdPath} — analyze step did not produce it`,
            );
          }
          const planMd = readFileSync(planMdPath, "utf8");
          const meta: PlanMeta = parsePlanMdFrontmatter(planMd);
          ctx.log?.info?.(`parsed PLAN.md kind=${meta.kind}`);
          if (meta.kind === "leaf") {
            ctx.log?.info?.("leaf node — no children to spawn");
            return;
          }
          const children = meta.children ?? [];
          for (const child of children) {
            ctx.spawn({ id: child.id, title: child.title });
          }
          ctx.log?.info?.(`spawned ${children.length} children`);
        })
        .build(),

      taskDef()
        .id("materialize-children")
        .title("Write tasks/<id>/TASK.md for each child")
        .description(
          "Phase 2 of progressive decomposition (deterministic slice): " +
            "create the per-child contract files so the produced " +
            "playbook is runnable. Harvests per-child contracts, real " +
            "DAG dependencies, seed catalogs, and verification checks " +
            "from the PLAN.md body — preserving the analyze step's " +
            "work instead of replacing it with stubs.",
        )
        .dependencies(["parse-plan"])
        .executor(async (ctx: any) => {
          const planMdPath = join(outputDir, "PLAN.md");
          if (!existsSync(planMdPath)) {
            throw new Error(
              `materialize-children: PLAN.md not found at ${planMdPath}`,
            );
          }
          const planMd = readFileSync(planMdPath, "utf8");
          const meta: PlanMeta = parsePlanMdFrontmatter(planMd);
          if (meta.kind === "leaf" || !meta.children) {
            ctx.log?.info?.("no children to materialize");
            return;
          }

          // Parse the PLAN.md body for per-child contracts + global
          // test points + seed driver lists. The `analyze` step writes
          // a structured body following the convention in
          // `progressive-decomposition/analyze.ts`'s prompt; the
          // parser below extracts what we need without being strict
          // about exact whitespace.
          const childContracts = parseChildContracts(planMd);
          const testPoints = parseTestPoints(planMd);
          const playbookGoal = parseGoalSection(planMd) ?? opts.goal;

          const tasksDir = join(outputDir, "tasks");
          const seedsDir = join(outputDir, "seeds");

          let written = 0;
          for (const child of meta.children) {
            const contract = childContracts.get(child.id);
            const childChecks = testPoints.get(child.id) ?? [];

            if (child.kind === "seed") {
              const seedDir = join(seedsDir, child.id);
              mkdirSync(seedDir, { recursive: true });
              writeIfMissing(
                join(seedDir, "SEED.md"),
                buildSeedMd({
                  id: child.id,
                  title: child.title,
                  contract,
                  checks: childChecks,
                }),
              );
              writeIfMissing(
                join(seedDir, "index.js"),
                buildSeedScript({
                  id: child.id,
                  catalog: contract?.seedCatalog ?? [],
                }),
              );
              if (contract?.seedCatalog && contract.seedCatalog.length > 0) {
                writeIfMissing(
                  join(seedDir, "catalog.json"),
                  JSON.stringify(contract.seedCatalog, null, 2) + "\n",
                );
              }
            } else {
              const childDir = join(tasksDir, child.id);
              mkdirSync(childDir, { recursive: true });
              writeIfMissing(
                join(childDir, "TASK.md"),
                buildTaskMd({
                  id: child.id,
                  title: child.title,
                  kind: child.kind,
                  contract,
                  checks: childChecks,
                }),
              );
              if (child.kind === "container") {
                writeIfMissing(
                  join(childDir, "PLAN.md"),
                  buildPlanStub(child.id, child.title, contract),
                );
              }
            }
            written++;
          }

          // Patch playbook.yml: emit task list with the *real* DAG
          // (from each child's `dependencies:` field in PLAN.md body),
          // plus playbook-level checks harvested from `# Test points`.
          rewritePlaybookYml({
            ymlPath: join(outputDir, "playbook.yml"),
            slug,
            goal: playbookGoal,
            children: meta.children,
            childContracts,
            playbookChecks: testPoints.get("__playbook__") ?? [],
          });

          ctx.log?.info?.(`materialized ${written} children`);
        })
        .build(),
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Slug helpers                                                       */
/* ------------------------------------------------------------------ */

export function slugifyPrompt(prompt: string): string {
  return (
    prompt
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || ""
  );
}

export async function suggestPlaybookName(
  prompt: string,
  agentfn: any,
): Promise<string> {
  const fallback = slugifyPrompt(prompt) || "plan";
  try {
    const fn = agentfn({ timeoutMs: 60_000, enableSkills: false });
    const namingPrompt = [
      "You name a new converge playbook from the user's intent.",
      "Reply with ONLY a kebab-case slug, 2-5 words, lowercase a-z and",
      "digits and hyphens, no extension, no quotes, no explanation.",
      "Capture the noun (what is built), not the verb (build/create).",
      "",
      "Examples:",
      '  intent: "create a new playbook to implement mission control for converge"',
      "  name:   mission-control",
      "",
      '  intent: "build a baby-tracker mobile app with sleep and feed logs"',
      "  name:   baby-tracker-app",
      "",
      `intent: "${prompt.replace(/"/g, '\\"')}"`,
      "name:",
    ].join("\n");
    const result = await fn(namingPrompt);
    const raw = String(result.raw ?? result.data ?? "").trim();
    const match = raw.match(/[a-z0-9]+(?:-[a-z0-9]+)+/);
    const slug = match ? match[0] : "";
    if (slug.length >= 3 && slug.length <= 50) return slug;
  } catch {
    // fall through
  }
  return fallback;
}

/* ------------------------------------------------------------------ */
/*  PLAN.md body parsing                                               */
/* ------------------------------------------------------------------ */

interface ChildContract {
  id: string;
  title?: string;
  objective?: string;
  description?: string;
  dependencies: string[];
  tags: string[];
  inputs: string[];
  /** Inline catalog the analyze step listed for a seed child. */
  seedCatalog?: Array<{ id: string; title?: string }>;
}

/**
 * Extract per-child contracts from the `# Children` section of a
 * PLAN.md. Each child appears as `## <id> — <title>` followed by a
 * bulleted list of `- **field**: value` items. Tolerant of variations
 * in punctuation and whitespace.
 */
function parseChildContracts(planMd: string): Map<string, ChildContract> {
  const out = new Map<string, ChildContract>();
  // Strip frontmatter so its YAML keys don't get parsed as bullets.
  const body = planMd.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  // Find the `# Children` section (case-insensitive header) and limit
  // parsing to it — `# Test points` and `# Open questions` follow.
  const childrenStart = body.search(/^#\s+Children\b/im);
  if (childrenStart < 0) return out;
  const afterStart = body.slice(childrenStart);
  const nextH1 = afterStart.slice(2).search(/^#\s+\S/m);
  const childrenBlock =
    nextH1 < 0 ? afterStart : afterStart.slice(0, 2 + nextH1);

  // Each child is a `## <id> — <title>` heading. Allow `—`, `-`, `–`, or `:`.
  const childHeading = /^##\s+([a-z0-9][a-z0-9-]*)\s*[—\-–:]\s*(.+)$/gim;
  const matches: Array<{ id: string; title: string; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = childHeading.exec(childrenBlock)) !== null) {
    matches.push({ id: m[1], title: m[2].trim(), index: m.index });
  }

  for (let i = 0; i < matches.length; i++) {
    const here = matches[i];
    const next = matches[i + 1];
    const section = childrenBlock.slice(
      here.index,
      next ? next.index : undefined,
    );
    out.set(here.id, parseChildSection(here.id, here.title, section));
  }

  return out;
}

function parseChildSection(
  id: string,
  title: string,
  section: string,
): ChildContract {
  const c: ChildContract = {
    id,
    title,
    dependencies: [],
    tags: [],
    inputs: [],
  };

  const grab = (label: string): string | undefined => {
    const re = new RegExp(
      `^[-*]\\s*\\*\\*${label}\\*\\*\\s*:\\s*([^\\n]+(?:\\n {2,}[^\\n]+)*)`,
      "im",
    );
    const mm = re.exec(section);
    if (!mm) return undefined;
    return mm[1].replace(/\s+/g, " ").trim();
  };

  c.objective = grab("objective");
  c.description = grab("description");

  const depsRaw = grab("dependencies");
  if (depsRaw && !/^none$/i.test(depsRaw)) {
    c.dependencies = depsRaw
      .split(/[,;]/)
      .map((s) => s.trim().replace(/^`|`$/g, ""))
      .filter((s) => /^[a-z0-9][a-z0-9-]*$/.test(s));
  }

  const tagsRaw = grab("tags");
  if (tagsRaw) {
    c.tags = tagsRaw
      .split(/[,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const inputsRaw = grab("inputs");
  if (inputsRaw) {
    c.inputs = inputsRaw
      .split(/[,;]/)
      .map((s) => s.trim().replace(/^`|`$/g, ""))
      .filter(Boolean);
  }

  // Look for an explicit catalog list under a `**seed driver**:` or
  // `**seed catalog**:` field. The LLM may write this as either a
  // clean comma-list (`home, product-detail, science, faq, checkout`)
  // or as prose with the list embedded ("the five screen ids declared
  // in the outline: home, product-detail, science, faq, checkout —
  // each spawns its own pipeline"). The cleaning step below tolerates
  // both: it splits on commas, then keeps only slug-shaped tokens
  // (≤3 words once normalized) so prose prefixes/suffixes drop out.
  const catalogRaw = grab("seed catalog") ?? grab("seed driver");
  if (catalogRaw) {
    const ids = extractSlugList(catalogRaw);
    if (ids.length > 0) {
      c.seedCatalog = ids.map((id) => ({ id, title: id }));
    }
  }

  return c;
}

/**
 * Extract clean slugs from a comma-separated string that may have
 * surrounding prose.
 *
 * The LLM emits this in three observed shapes:
 *   1. Clean:        `home, product-detail, science, faq, checkout`
 *   2. Colon-prefix: `the five screen ids ... outline: home,
 *                     product-detail, science, faq, checkout — each ...`
 *   3. Dash-bounded: `The 5 named screens from the brief — `home`,
 *                     `product-detail`, `science`, `faq`, `checkout` —
 *                     each becoming ...`
 *
 * Strategy: take whichever segment of the string contains the longest
 * run of consecutive slug-shaped comma-separated tokens. Robust to
 * leading prose, parenthetical asides, and trailing explanation.
 */
function extractSlugList(raw: string): string[] {
  // Drop parenthetical lists entirely — they're usually ad-hoc commentary.
  const noParens = raw.replace(/\([^)]*\)/g, "");

  // Split the raw text into chunks on prose-y separators (colons,
  // em/en-dashes, periods). Each chunk is then candidate text that
  // might be the list.
  const chunks = noParens.split(/\s*[—–:]\s*|(?:\.\s+)/);

  let best: string[] = [];
  for (const chunk of chunks) {
    const candidates = chunk
      .split(/[,;]/)
      .map((p) => p.replace(/[`"'*]/g, "").trim())
      .filter((p) => p.length > 0)
      .map((p) =>
        p
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, ""),
      )
      .filter((p) => {
        if (!/^[a-z0-9][a-z0-9-]*$/.test(p)) return false;
        if (p.length > 40) return false;
        const segments = p.split("-").filter(Boolean);
        if (segments.length > 4) return false;
        return true;
      });
    if (candidates.length > best.length) best = candidates;
  }
  return best;
}

/**
 * Extract checks per child + per-playbook from the `# Test points`
 * section. Each bullet `- **After <id>**: <description>` becomes a
 * single AI-style check on that child. Bullets with "playbook-level"
 * become checks on the playbook.
 */
function parseTestPoints(
  planMd: string,
): Map<string, Array<{ id: string; check: string }>> {
  const out = new Map<string, Array<{ id: string; check: string }>>();
  const body = planMd.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const testStart = body.search(/^#\s+Test\s+points\b/im);
  if (testStart < 0) return out;
  const after = body.slice(testStart);
  const nextH1 = after.slice(2).search(/^#\s+\S/m);
  const block = nextH1 < 0 ? after : after.slice(0, 2 + nextH1);

  // Bullet pattern: `- **After <id>**: ...` (or `- **After <id> (playbook-level)**: ...`)
  const re =
    /^[-*]\s*\*\*After\s+([a-z0-9][a-z0-9-]*)(\s*\(playbook-level\))?\s*\*\*\s*:\s*(.+?)(?=\n[-*]\s|\n#|$)/gims;
  let m: RegExpExecArray | null;
  let counter = 0;
  while ((m = re.exec(block)) !== null) {
    const childId = m[1];
    const isPlaybookLevel = !!m[2];
    const desc = m[3].replace(/\s+/g, " ").trim();
    const key = isPlaybookLevel ? "__playbook__" : childId;
    const list = out.get(key) ?? [];
    counter++;
    list.push({
      id: `${childId}-check-${list.length + 1}`,
      check: desc,
    });
    out.set(key, list);
  }

  return out;
}

function parseGoalSection(planMd: string): string | undefined {
  const body = planMd.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
  const m = body.match(/^#\s+Goal\s*\n+([\s\S]*?)(?:\n#\s+|\n*$)/im);
  if (!m) return undefined;
  return m[1].trim().replace(/\s+/g, " ");
}

/* ------------------------------------------------------------------ */
/*  TASK.md / SEED.md / PLAN.md emit                                   */
/* ------------------------------------------------------------------ */

interface BuildTaskMdArgs {
  id: string;
  title?: string;
  kind: string;
  contract?: ChildContract;
  checks: Array<{ id: string; check: string }>;
}

function buildTaskMd(args: BuildTaskMdArgs): string {
  const { id, title, kind, contract, checks } = args;
  const t = title ?? id;
  const front: string[] = ["---"];
  front.push(`id: ${id}`);
  front.push(`title: ${jsonString(t)}`);
  if (contract?.objective) {
    front.push("description: >");
    for (const line of wrap(contract.objective, 90)) {
      front.push(`  ${line}`);
    }
  } else {
    front.push("description: >");
    front.push(`  ${t}`);
  }
  if (contract?.inputs && contract.inputs.length > 0) {
    front.push("inputs:");
    for (const v of contract.inputs) front.push(`  - ${jsonString(v)}`);
  }
  if (contract?.dependencies && contract.dependencies.length > 0) {
    front.push("dependencies:");
    for (const d of contract.dependencies) front.push(`  - ${d}`);
  }
  if (checks.length > 0) {
    front.push("checks:");
    for (const c of checks) {
      front.push(`  - id: ${c.id}`);
      front.push(`    type: ai`);
      front.push(`    check: ${jsonString(c.check)}`);
    }
  }
  if (contract?.tags && contract.tags.length > 0) {
    front.push(`tags: [${contract.tags.join(", ")}]`);
  } else {
    front.push("tags: []");
  }
  front.push("---", "");

  const body: string[] = [`# ${t}`, ""];
  if (contract?.objective) {
    body.push("## Objective", "", contract.objective, "");
  }
  if (contract?.description) {
    body.push("## Description", "", contract.description, "");
  }
  if (!contract && kind === "container") {
    body.push("This container can be expanded with `converge plan`.", "");
  } else if (!contract) {
    body.push(
      "This task awaits implementation. Run `converge plan` to expand or fill in the body.",
      "",
    );
  }
  return front.join("\n") + body.join("\n");
}

interface BuildSeedMdArgs {
  id: string;
  title?: string;
  contract?: ChildContract;
  checks: Array<{ id: string; check: string }>;
}

function buildSeedMd(args: BuildSeedMdArgs): string {
  const { id, title, contract, checks } = args;
  const t = title ?? id;
  const front: string[] = ["---"];
  front.push(`id: ${id}`);
  front.push(`title: ${jsonString(t)}`);
  if (contract?.objective) {
    front.push("description: >");
    for (const line of wrap(contract.objective, 90)) {
      front.push(`  ${line}`);
    }
  } else {
    front.push("description: >");
    front.push(`  ${t} (seed — spawns children at runtime)`);
  }
  front.push("driver:");
  front.push("  source: catalog.json");
  front.push("  type: json");
  if (contract?.dependencies && contract.dependencies.length > 0) {
    front.push("dependencies:");
    for (const d of contract.dependencies) front.push(`  - ${d}`);
  }
  if (checks.length > 0) {
    front.push("checks:");
    for (const c of checks) {
      front.push(`  - id: ${c.id}`);
      front.push(`    type: ai`);
      front.push(`    check: ${jsonString(c.check)}`);
    }
  }
  front.push("tags: [seed, dynamic]");
  front.push("---", "");

  const body: string[] = [`# ${t}`, ""];
  if (contract?.objective) body.push("## Objective", "", contract.objective, "");
  if (contract?.description)
    body.push("## Description", "", contract.description, "");
  body.push(
    "Children are spawned at runtime by `index.js`. The catalog driving the fan-out lives in `catalog.json`.",
    "",
  );
  return front.join("\n") + body.join("\n");
}

interface BuildSeedScriptArgs {
  id: string;
  catalog: Array<{ id: string; title?: string }>;
}

function buildSeedScript(args: BuildSeedScriptArgs): string {
  const { id, catalog } = args;
  const lines: string[] = [
    "/**",
    ` * Seed: ${id}`,
    " *",
    " * Reads catalog.json and spawns one child per entry. Each child",
    " * receives `id` and `vars` (the catalog item's fields, available",
    " * for interpolation in the spawned TASK.md template).",
    " */",
    "import { readFileSync } from 'node:fs'",
    "import { dirname, join } from 'node:path'",
    "import { fileURLToPath } from 'node:url'",
    "",
    "export default async function run(ctx) {",
    "  const here = dirname(fileURLToPath(import.meta.url))",
    "  const catalog = JSON.parse(readFileSync(join(here, 'catalog.json'), 'utf-8'))",
    "  for (const item of catalog) {",
    "    await ctx.spawn({",
    "      id: item.id,",
    "      title: item.title ?? item.id,",
    "      vars: item,",
    "    })",
    "  }",
    "}",
    "",
  ];
  if (catalog.length === 0) {
    // No catalog parsed — leave a TODO + a placeholder catalog.json
    // doesn't get written, so add a comment before the imports
    // explaining that the seed needs population.
    lines.splice(
      6,
      0,
      " *",
      " * TODO: populate catalog.json. The planner couldn't extract a",
      " *       fan-out list from PLAN.md. List one object per child:",
      ' *       [{ "id": "home", "title": "Home" }, ...]',
    );
  }
  return lines.join("\n");
}

function buildPlanStub(
  id: string,
  title: string | undefined,
  contract?: ChildContract,
): string {
  return [
    "---",
    "kind: container",
    `parent: ${id}`,
    "children: []",
    "---",
    "",
    "# Goal",
    "",
    contract?.objective ?? title ?? id,
    "",
    "# Status",
    "",
    "Awaiting expansion. Run `converge plan` at this path to expand.",
    "",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/*  playbook.yml emit                                                  */
/* ------------------------------------------------------------------ */

interface RewritePlaybookYmlArgs {
  ymlPath: string;
  slug: string;
  goal: string;
  children: NonNullable<PlanMeta["children"]>;
  childContracts: Map<string, ChildContract>;
  playbookChecks: Array<{ id: string; check: string }>;
}

function rewritePlaybookYml(args: RewritePlaybookYmlArgs): void {
  const { ymlPath, slug, goal, children, childContracts, playbookChecks } = args;

  const lines: string[] = [];
  lines.push(`name: ${slug}`);
  lines.push(`description: ${jsonString(goal)}`);
  lines.push("");
  lines.push("run:");
  lines.push("  mode: oneoff");
  lines.push("  maxTaskAttempts: 3");
  lines.push("");
  lines.push("tasks:");
  for (const c of children) {
    lines.push(`  - id: ${c.id}`);
    const contract = childContracts.get(c.id);
    const deps = contract?.dependencies ?? [];
    if (deps.length > 0) {
      lines.push(`    depends_on: [${deps.join(", ")}]`);
    }
  }
  if (playbookChecks.length > 0) {
    lines.push("");
    lines.push("checks:");
    for (const c of playbookChecks) {
      lines.push(`  - id: ${c.id}`);
      lines.push(`    type: ai`);
      lines.push(`    check: ${jsonString(c.check)}`);
    }
  }
  lines.push("");

  writeFileSync(ymlPath, lines.join("\n"), "utf8");
}

/* ------------------------------------------------------------------ */
/*  Utilities                                                          */
/* ------------------------------------------------------------------ */

function writeIfMissing(path: string, content: string): void {
  if (existsSync(path)) return;
  writeFileSync(path, content, "utf8");
}

function deriveProjectDir(outputDir: string): string {
  const idx = outputDir.lastIndexOf(`/.converge/`);
  if (idx >= 0) return outputDir.slice(0, idx);
  return outputDir;
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

function jsonString(s: string): string {
  return JSON.stringify(s);
}

function wrap(s: string, width: number): string[] {
  const words = s.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur.length + 1 + w.length > width && cur.length > 0) {
      lines.push(cur);
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
