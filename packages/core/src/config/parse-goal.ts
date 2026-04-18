/**
 * GOAL.md Parser
 *
 * Parses GOAL.md files from `.converge/goals/` directories.
 * Supports nested sub-goals via `goals/` subdirectories:
 *
 *   goals/003-screens-implemented/
 *   ├── GOAL.md                    ← parent goal
 *   └── goals/                     ← sub-goals
 *       ├── home-screen/GOAL.md
 *       ├── settings/GOAL.md
 *       └── profile/GOAL.md
 *
 * Sub-goals inherit the parent's `depends:` and can add their own.
 * Each sub-goal has its own metric, requirements, and plan strategy.
 */

import { readFile } from "node:fs/promises";
import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { parse as parseYaml } from "yaml";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface GoalMetricConfig {
  cmd?: string;
  script?: string;
  target: number;
  total?: number;
  direction: "min" | "max";
}

export interface GoalDetailConfig {
  cmd?: string;
  script?: string;
}

export interface GoalDodConfig {
  script: string;
}

export type GoalPlanStrategy = "split" | "single" | "custom" | "wbs";

export interface GoalPlanConfig {
  strategy: GoalPlanStrategy;
  instructions?: string;
}

export interface GoalDefinition {
  id: string;
  title: string;
  description?: string;
  metric: GoalMetricConfig;
  detail?: GoalDetailConfig;
  dod?: GoalDodConfig;
  plan?: GoalPlanConfig;
  tags?: string[];
  depends?: string[];
  /**
   * Detailed requirements — WHAT this goal needs (not HOW).
   * Fed to WBS/AI when generating tasks.
   * For sub-goals, this is the spec for that specific item.
   */
  requirements?: string;
  /** Skills to attach to generated remediation tasks */
  skills?: string[];
  /** Nested sub-goals (discovered from goals/ subdirectory) */
  goals?: GoalDefinition[];
  /** Markdown body after frontmatter — AI context for remediation */
  body: string;
  filePath: string;
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Parse a GOAL.md file into a GoalDefinition.
 * Also discovers and parses sub-goals from a goals/ subdirectory.
 */
export async function parseGoalMd(
  filePath: string,
): Promise<GoalDefinition | null> {
  if (!existsSync(filePath)) return null;

  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const match = raw.match(FRONTMATTER_RE);
  if (!match) return null;

  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }

  if (
    !frontmatter ||
    typeof frontmatter !== "object" ||
    Array.isArray(frontmatter)
  ) {
    return null;
  }

  const title = frontmatter.title;
  if (!title || typeof title !== "string") return null;

  // Parse dod config
  let dod: GoalDodConfig | undefined;
  if (frontmatter.dod && typeof frontmatter.dod === "object") {
    const dodObj = frontmatter.dod as Record<string, unknown>;
    if (typeof dodObj.script === "string") {
      dod = { script: dodObj.script };
    }
  }

  // Parse metric — required unless dod is present
  let metricConfig: GoalMetricConfig;
  const metric = frontmatter.metric;
  if (metric && typeof metric === "object") {
    const metricObj = metric as Record<string, unknown>;
    const hasCmd = typeof metricObj.cmd === "string";
    const hasScript = typeof metricObj.script === "string";
    if (!hasCmd && !hasScript && !dod) return null;
    if (typeof metricObj.target !== "number" && !dod) return null;
    if (metricObj.direction !== "min" && metricObj.direction !== "max" && !dod)
      return null;

    metricConfig = {
      cmd: hasCmd ? (metricObj.cmd as string) : undefined,
      script: hasScript ? (metricObj.script as string) : undefined,
      target: typeof metricObj.target === "number" ? metricObj.target : 0,
      total: typeof metricObj.total === "number" ? metricObj.total : undefined,
      direction:
        metricObj.direction === "min" || metricObj.direction === "max"
          ? metricObj.direction
          : "min",
    };
  } else if (dod) {
    // Synthesize default metric when only dod is present
    metricConfig = { target: 0, direction: "min" };
  } else {
    return null;
  }

  let detail: GoalDetailConfig | undefined;
  if (frontmatter.detail && typeof frontmatter.detail === "object") {
    const detailObj = frontmatter.detail as Record<string, unknown>;
    if (typeof detailObj.script === "string") {
      detail = { script: detailObj.script };
    } else if (typeof detailObj.cmd === "string") {
      detail = { cmd: detailObj.cmd };
    }
  }

  let tags: string[] | undefined;
  if (Array.isArray(frontmatter.tags)) {
    tags = frontmatter.tags.map(String);
  }

  let depends: string[] | undefined;
  if (Array.isArray(frontmatter.depends)) {
    depends = frontmatter.depends.map(String);
  }

  let plan: GoalPlanConfig | undefined;
  if (frontmatter.plan && typeof frontmatter.plan === "object") {
    const planObj = frontmatter.plan as Record<string, unknown>;
    const strategy = planObj.strategy;
    if (
      strategy === "split" ||
      strategy === "single" ||
      strategy === "custom" ||
      strategy === "wbs"
    ) {
      plan = {
        strategy,
        instructions:
          typeof planObj.instructions === "string"
            ? planObj.instructions
            : undefined,
      };
    }
  }

  // Parse requirements
  let requirements: string | undefined;
  if (typeof frontmatter.requirements === "string") {
    requirements = frontmatter.requirements;
  }

  // Parse skills
  let skills: string[] | undefined;
  if (Array.isArray(frontmatter.skills)) {
    skills = frontmatter.skills.map(String);
  }

  // Derive ID
  const folderName = basename(dirname(filePath));
  const id = folderName.replace(/^\d+-/, "");

  const body = raw.slice(match[0].length).trim();

  // Discover nested sub-goals from goals/ subdirectory
  const subGoals = await discoverSubGoals(dirname(filePath));

  return {
    id,
    title,
    description:
      typeof frontmatter.description === "string"
        ? frontmatter.description
        : undefined,
    metric: metricConfig,
    detail,
    dod,
    plan,
    tags,
    depends,
    requirements,
    skills,
    goals: subGoals.length > 0 ? subGoals : undefined,
    body,
    filePath,
  };
}

/**
 * Discover sub-goals from a goals/ subdirectory next to a GOAL.md.
 *
 *   goals/003-screens/
 *   ├── GOAL.md           ← parent (already parsed)
 *   └── goals/            ← sub-goals
 *       ├── home/GOAL.md
 *       └── settings/GOAL.md
 */
async function discoverSubGoals(goalDir: string): Promise<GoalDefinition[]> {
  const subGoalsDir = join(goalDir, "goals");
  if (!existsSync(subGoalsDir)) return [];

  const subGoals: GoalDefinition[] = [];
  const entries = readdirSync(subGoalsDir);

  for (const entry of entries.sort()) {
    const entryPath = join(subGoalsDir, entry);
    if (!statSync(entryPath).isDirectory()) continue;

    const goalMd = join(entryPath, "GOAL.md");
    if (!existsSync(goalMd)) continue;

    const subGoal = await parseGoalMd(goalMd);
    if (subGoal) subGoals.push(subGoal);
  }

  return subGoals;
}
