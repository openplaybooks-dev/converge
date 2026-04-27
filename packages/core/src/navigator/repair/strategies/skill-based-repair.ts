/**
 * SkillBasedRepairStrategy
 *
 * A thin runner that loads repair skills, lets AI pick the best one
 * for each gap, gathers the skill's declared context, and executes it.
 *
 * Skills are loaded from two paths (merged, custom overrides builtin):
 *   1. Builtin: {package}/src/repair/skill-templates/  (shipped with converge)
 *   2. Custom:  {project}/.converge/skills/repair/       (user/MetaSidecar created)
 *
 * Each skill is a SKILL.md with name + description + context declarations.
 * AI reads all descriptions and picks the best match for the gap.
 *
 * This class does NOT contain repair logic — skills do.
 * This class does NOT hardcode routing — AI selects.
 */

import { existsSync, readdirSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import { getTaskAttemptDir } from "../../../journal/structure.ts";
import { fileURLToPath } from "node:url";
import type { Gap } from "../../../task/gap/types.ts";
import { toCompactGap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { runAgent } from "../agent-runner.ts";
import { READONLY_TOOLS } from "../../../ai/context.ts";
import { HistoryIndexBuilder } from "../history-index.ts";
import {
  parseTaskMd,
  type TaskMdDef,
} from "../../../config/task-md-definition.ts";
import { type SkillContextStep } from "../../../config/skill-definition.ts";
import { check as shellCheck } from "../../../task/facts/api.ts";
import { createAIContext } from "../../../ai/context.ts";

/* ------------------------------------------------------------------ */
/*  Loaded skill descriptor                                            */
/* ------------------------------------------------------------------ */

interface LoadedSkill {
  /** Skill name from frontmatter */
  name: string;
  /** Description from frontmatter — AI reads this to select */
  description: string;
  /** Full parsed definition */
  def: TaskMdDef;
  /** Skill body (markdown instructions) */
  body: string;
  /** Absolute path to the SKILL.md file */
  path: string;
  /** Directory containing the SKILL.md */
  dir: string;
  /** Where it came from */
  source: "builtin" | "custom";
}

/* ------------------------------------------------------------------ */
/*  Strategy                                                           */
/* ------------------------------------------------------------------ */

export class SkillBasedRepairStrategy implements FixStrategy {
  readonly name = "SkillBasedRepairStrategy";
  readonly priority = 6;

  /** Cache of loaded skills (loaded once, reused across gaps) */
  private skills: LoadedSkill[] | null = null;

  canHandle(gap: Gap): boolean {
    // Don't repair repair tasks (recursion guard)
    const tags = (gap.metadata?.tags as string[]) ?? [];
    if (tags.includes("repair")) return false;

    // We handle everything — AI picks the right skill
    return true;
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    // 1. Load all repair skills (cached after first call)
    const skills = await this.loadSkills(projectDir);
    if (skills.length === 0) {
      return { success: false, reason: "No repair skills installed" };
    }

    // 2. AI selects the best skill for this gap
    const selected = await this.selectSkill(
      skills,
      gap,
      projectDir,
      journalCtx,
    );
    if (!selected) {
      return { success: false, reason: "AI could not select a repair skill" };
    }

    console.log(
      `   🔧 Skill: ${selected.name} — ${selected.description.slice(0, 70)}`,
    );

    try {
      // 3. Gather context declared by the skill
      const attemptDir =
        process.env.CONVERGE_TASK_ATTEMPT_DIR ??
        getTaskAttemptDir(
          projectDir,
          journalCtx.epicId,
          journalCtx.taskId,
          "wip",
        );
      const contextDir = join(attemptDir, "repair-context");
      await mkdir(contextDir, { recursive: true });

      const vars = buildTemplateVars(gap, projectDir, journalCtx, attemptDir);
      const contextSteps = selected.def.context ?? [];
      const contextFiles = await gatherAndWriteContext(
        contextSteps,
        vars,
        gap,
        projectDir,
        contextDir,
        journalCtx,
      );

      // Always write gap summary + history
      await writeGapSummary(gap, contextDir);
      await writeHistory(projectDir, journalCtx, contextDir);

      // 4. Build prompt
      const relContext = relative(projectDir, contextDir).replace(/\\/g, "/");
      const prompt = buildPrompt(selected.name, relContext, contextFiles);

      // 5. Build skillDirs — mount ALL repair skills so selected can reference others
      const skillDirs = buildSkillDirs(skills);

      // 6. Run
      const allowedTools = selected.def["allowed-tools"] ?? [
        "Read",
        "Write",
        "Edit",
        "Bash",
        "Glob",
        "Grep",
      ];
      await runAgent({
        phase: "skill_repair",
        prompt,
        agentOptions: {
          skillDirs,
          timeoutMs: 300_000,
          maxRetries: 1,
          allowedTools,
        },
        projectDir,
        journalCtx,
        label: `${selected.name}: ${(gap.metadata?.taskTitle as string) ?? gap.description}`,
        skillName: selected.name,
        agentName: "repair-skill",
      });

      return {
        success: true,
        reason: `Skill '${selected.name}' completed`,
        retryMode: "validate",
      };
    } catch (err: any) {
      return {
        success: false,
        reason: `Skill '${selected.name}' failed: ${err.message}`,
      };
    }
  }

  /* ── Skill loading ───────────────────────────────────────────────── */

  /**
   * Load repair skills from both builtin and custom paths.
   * Custom skills override builtin skills with the same name.
   */
  private async loadSkills(projectDir: string): Promise<LoadedSkill[]> {
    if (this.skills) return this.skills;

    const byName = new Map<string, LoadedSkill>();

    // 1. Load builtin skills from package
    const builtinDir = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "skill-templates",
    );
    await this.loadFromDir(builtinDir, "builtin", byName);

    // 2. Load custom skills — override builtins with same name
    const customDir = join(projectDir, ".converge", "skills", "repair");
    await this.loadFromDir(customDir, "custom", byName);

    this.skills = Array.from(byName.values());
    return this.skills;
  }

  private async loadFromDir(
    dir: string,
    source: "builtin" | "custom",
    out: Map<string, LoadedSkill>,
  ): Promise<void> {
    if (!existsSync(dir)) return;

    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      const skillMd = join(dir, d.name, "SKILL.md");
      if (!existsSync(skillMd)) continue;

      try {
        const parsed = await parseTaskMd(skillMd);
        if (!parsed) continue;

        out.set(parsed.def.name || d.name, {
          name: parsed.def.name || d.name,
          description: parsed.def.description || d.name,
          def: parsed.def,
          body: parsed.body,
          path: skillMd,
          dir: join(dir, d.name),
          source,
        });
      } catch {
        // Skip unparseable skills
      }
    }
  }

  /* ── AI skill selection ──────────────────────────────────────────── */

  /**
   * Ask AI to pick the best repair skill based on gap + skill descriptions.
   * Falls back to name matching if AI is unavailable.
   */
  private async selectSkill(
    skills: LoadedSkill[],
    gap: Gap,
    projectDir: string,
    journalCtx: { epicId: string; taskId: string },
  ): Promise<LoadedSkill | null> {
    if (skills.length === 0) return null;
    if (skills.length === 1) return skills[0];

    // Build catalog of skill descriptions for AI
    const compact = toCompactGap(gap);
    const catalog = skills
      .map((s, i) => `${i + 1}. **${s.name}**: ${s.description}`)
      .join("\n");

    // Get history of what was already tried
    let historySection = "";
    try {
      const builder = new HistoryIndexBuilder(projectDir, journalCtx);
      const summary = await builder.formatForPrompt();
      if (summary) historySection = `\n## History\n${summary}`;
    } catch {
      /* non-fatal */
    }

    const prompt = `Pick the best repair skill for this gap. Return JSON only.

## Gap
- Kind: ${compact.kind}
- Target: ${compact.target}
- Status: ${compact.status}
- Description: ${gap.description}
${gap.metadata?.unitPath ? `- File: ${gap.metadata.unitPath}` : ""}
${gap.metadata?.checkCmd ? `- Check: \`${gap.metadata.checkCmd}\`` : ""}

## Skills
${catalog}
${historySection}

Return: {"skill": "<name>", "reason": "<why>"}`;

    try {
      const aiCtx = createAIContext(projectDir, journalCtx);
      const response = await aiCtx.ask(prompt, {
        phase: "skill-selection",
        label: "select-repair-skill",
        allowedTools: [], // No tools needed — just reasoning
        timeoutMs: 30_000,
      });

      const text = response.asText();
      const jsonMatch = text.match(
        /\{[\s\S]*?"skill"\s*:\s*"([^"]+)"[\s\S]*?\}/,
      );
      if (jsonMatch) {
        const selectedName = jsonMatch[1];
        const found = skills.find((s) => s.name === selectedName);
        if (found) {
          console.log(`   🎯 AI selected: ${found.name}`);
          return found;
        }
      }
    } catch {
      // AI unavailable — fall back to name matching
    }

    // Fallback: match by gap kind in tags
    const gapKind = (gap.metadata?.gapKind as string) ?? "";
    const unitPath = (gap.metadata?.unitPath as string) ?? "";

    // Try file-type-specific skills first
    if (unitPath.endsWith("SKILL.md")) {
      const s = skills.find((s) => s.name.includes("skillmd"));
      if (s) return s;
    }
    if (unitPath.endsWith("task.ts")) {
      const s = skills.find((s) => s.name.includes("taskts"));
      if (s) return s;
    }

    // Try gap kind match via tags
    const byTag = skills.find((s) =>
      (s.def.tags ?? []).includes(`gap:${gapKind}`),
    );
    if (byTag) return byTag;

    // Try name match
    const nameMap: Record<string, string> = {
      "check-failed": "repair-check-failed",
      output: "repair-missing-output",
      blocker: "repair-dependency",
      input: "repair-dependency",
      "missing-intermediate": "repair-spawn-intermediate",
      corrupted: "repair-missing-output",
    };
    const byName = skills.find((s) => s.name === nameMap[gapKind]);
    if (byName) return byName;

    // Last resort: router
    return skills.find((s) => s.name === "repair-router") ?? skills[0];
  }
}

/* ------------------------------------------------------------------ */
/*  Template variables                                                 */
/* ------------------------------------------------------------------ */

interface TemplateVars {
  [key: string]: string;
}

function buildTemplateVars(
  gap: Gap,
  projectDir: string,
  journalCtx: { epicId: string; taskId: string },
  attemptDir: string,
): TemplateVars {
  const vars: TemplateVars = {
    projectDir,
    attemptDir,
    taskId: journalCtx.taskId,
    epicId: journalCtx.epicId,
    attemptNumber: process.env.CONVERGE_TASK_ATTEMPT ?? "1",
    gapId: gap.id,
    gapDescription: gap.description,
    gapKind: (gap.metadata?.gapKind as string) ?? gap.type,
  };
  // Flatten gap.metadata strings
  if (gap.metadata) {
    for (const [k, v] of Object.entries(gap.metadata)) {
      if (typeof v === "string") vars[k] = v;
    }
  }
  return vars;
}

function resolveTemplate(template: string, vars: TemplateVars): string {
  return template.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m);
}

/* ------------------------------------------------------------------ */
/*  Context gathering                                                  */
/* ------------------------------------------------------------------ */

async function gatherAndWriteContext(
  steps: SkillContextStep[],
  vars: TemplateVars,
  gap: Gap,
  projectDir: string,
  contextDir: string,
  journalCtx?: { epicId: string; taskId: string },
): Promise<string[]> {
  const files: string[] = [];

  for (const step of steps) {
    try {
      switch (step.type) {
        case "gap": {
          const parts: string[] = [];
          for (const field of step.fields) {
            const v = gap.metadata?.[field] ?? vars[field];
            if (v !== undefined)
              parts.push(
                `**${field}**: ${typeof v === "string" ? v : JSON.stringify(v)}`,
              );
          }
          if (parts.length > 0) {
            await writeFile(
              join(contextDir, "gap-metadata.md"),
              parts.join("\n"),
            );
            files.push("gap-metadata.md");
          }
          break;
        }
        case "cmd": {
          const cmd = resolveTemplate(step.cmd, vars);
          if (cmd.includes("{")) break;
          const r = await shellCheck(cmd, projectDir, 120_000);
          const fn = `${step.label}.txt`;
          await writeFile(
            join(contextDir, fn),
            r.ok ? r.output : `Exit ${r.exitCode}:\n${r.output}`,
          );
          files.push(fn);
          break;
        }
        case "file": {
          const p = resolveTemplate(step.path, vars);
          if (p.includes("{")) break;
          const full = p.startsWith("/") ? p : join(projectDir, p);
          if (!existsSync(full)) {
            if (!step.optional) {
              const fn = `${step.label}.txt`;
              await writeFile(join(contextDir, fn), `(not found: ${p})`);
              files.push(fn);
            }
            break;
          }
          const c = await readFile(full, "utf-8");
          const fn = `${step.label}.md`;
          await writeFile(
            join(contextDir, fn),
            c.length > 3000 ? c.slice(0, 3000) + "\n...[truncated]" : c,
          );
          files.push(fn);
          break;
        }
        case "files": {
          const pat = resolveTemplate(step.pattern, vars);
          if (pat.includes("{")) break;
          const { glob } = await import("glob");
          const matches = await glob(pat, { cwd: projectDir });
          const max = step.maxFiles ?? 10;
          const listing = matches
            .slice(0, max)
            .map((f) => `- ${f}`)
            .join("\n");
          const extra =
            matches.length > max
              ? `\n... and ${matches.length - max} more`
              : "";
          const fn = `${step.label}.md`;
          await writeFile(
            join(contextDir, fn),
            listing + extra || "(no matches)",
          );
          files.push(fn);
          break;
        }
        case "ai": {
          const prompt = resolveTemplate(step.prompt, vars);
          if (prompt.includes("{")) break;
          const aiCtx = createAIContext(projectDir, journalCtx);
          const resp = await aiCtx.ask(prompt, {
            phase: "context-gathering",
            label: step.label,
            allowedTools: step.tools ?? [...READONLY_TOOLS],
            timeoutMs: step.timeoutMs ?? 60_000,
          });
          const text = resp.asText();
          if (text.trim()) {
            const fn = `${step.label}.md`;
            await writeFile(join(contextDir, fn), text);
            files.push(fn);
          }
          break;
        }
      }
    } catch (err: any) {
      console.log(
        `   ⚠️  Context '${(step as any).label ?? step.type}': ${err.message}`,
      );
    }
  }
  return files;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

async function writeGapSummary(gap: Gap, contextDir: string): Promise<void> {
  const c = toCompactGap(gap);
  await writeFile(
    join(contextDir, "gap.md"),
    [
      `# Gap: ${c.kind}`,
      `**Target**: ${c.target}`,
      `**Status**: ${c.status}`,
      `**Description**: ${gap.description}`,
      gap.metadata?.checkCmd ? `**Check**: \`${gap.metadata.checkCmd}\`` : "",
      gap.metadata?.checkOutput
        ? `**Error**:\n\`\`\`\n${(gap.metadata.checkOutput as string).slice(0, 800)}\n\`\`\``
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

async function writeHistory(
  projectDir: string,
  journalCtx: { epicId: string; taskId: string },
  contextDir: string,
): Promise<void> {
  try {
    const b = new HistoryIndexBuilder(projectDir, journalCtx);
    const s = await b.formatForPrompt();
    if (s) await writeFile(join(contextDir, "history.md"), s);
  } catch {
    /* non-fatal */
  }
}

function buildPrompt(
  skillName: string,
  relContext: string,
  contextFiles: string[],
): string {
  const list = [
    ...contextFiles.map((f) => `  - \`${relContext}/${f}\``),
    `  - \`${relContext}/gap.md\``,
    `  - \`${relContext}/history.md\` (if exists)`,
  ].join("\n");
  return `You are a repair agent. Fix the gap.

## Skill
Read \`.claude/skills/${skillName}/SKILL.md\` and follow its instructions.

## Context
${list}

**Read history.md first. Do NOT repeat failed approaches.**`;
}

function buildSkillDirs(skills: LoadedSkill[]): Record<string, string> {
  const dirs: Record<string, string> = {};
  for (const s of skills) dirs[s.name] = s.dir;
  return dirs;
}
