/**
 * Skill Path Resolver
 *
 * Resolves skill directories with fallback chain:
 *   1. Project-local `.skill/` folder
 *   2. Active playbook skills `.converge/playbooks/{name}/skills/`
 *   3. Global `.claude/skills/` folder
 *   4. Legacy `.converge/skills/` folder
 */

import { existsSync } from "node:fs";
import { join, dirname, parse } from "node:path";

export interface SkillSource {
  root: string;
  type: "project" | "playbook" | "global" | "legacy";
}

/**
 * Find all available skill sources for a project.
 * Returns array in priority order (project > playbook > global > legacy).
 */
export function findSkillSources(projectDir: string): SkillSource[] {
  const sources: SkillSource[] = [];

  // 1. Project-local .skill/ folder (highest priority)
  const projectSkillDir = join(projectDir, ".skill");
  if (existsSync(projectSkillDir)) {
    sources.push({ root: projectSkillDir, type: "project" });
  }

  // 2. Active playbook skills — .converge/playbooks/{name}/skills/
  //
  // The playbook name is normally set via CONVERGE_PLAYBOOK; if unset we
  // fall back to the "default" playbook name which matches the implicit
  // default used by getPlaybookContextFromEnv(). Earlier versions of
  // this resolver excluded the "default" name on the assumption that it
  // wasn't a real playbook — but every shipping example (goal-driven-dev,
  // flutter-app, stitch-to-flutter, ...) uses the literal "default" name.
  // Excluding it made skills under `.converge/playbooks/default/skills/`
  // silently unreachable.
  const playbookName = process.env.CONVERGE_PLAYBOOK ?? "default";
  const playbookSkillDir = join(
    projectDir,
    ".converge",
    "playbooks",
    playbookName,
    "skills",
  );
  if (existsSync(playbookSkillDir)) {
    sources.push({ root: playbookSkillDir, type: "playbook" });
  }

  // 3. Global .claude/skills/ folder
  const globalSkillDir = findGlobalSkillsDir(projectDir);
  if (globalSkillDir) {
    sources.push({ root: globalSkillDir, type: "global" });
  }

  // 4. Legacy .converge/skills/ folder
  const legacySkillDir = join(projectDir, ".converge", "skills");
  if (existsSync(legacySkillDir)) {
    sources.push({ root: legacySkillDir, type: "legacy" });
  }

  return sources;
}

/**
 * Find the primary skills root (first available source).
 * This is used for agentfn skillsRoot parameter.
 */
export function resolveSkillsRoot(projectDir: string): string {
  const sources = findSkillSources(projectDir);
  if (sources.length === 0) {
    // Fallback to legacy location if nothing exists
    return join(projectDir, ".converge", "skills");
  }
  return sources[0].root;
}

/**
 * Find all skill directories that exist, merging from multiple sources.
 * Skills in higher-priority sources shadow lower-priority ones.
 */
function resolveAllSkillRoots(projectDir: string): string[] {
  return findSkillSources(projectDir).map((s) => s.root);
}

/**
 * Search upward from startDir to find .claude/skills folder
 */
function findGlobalSkillsDir(startDir: string): string | null {
  let currentDir = startDir;
  const { root } = parse(startDir);

  while (currentDir !== root) {
    const skillsDir = join(currentDir, ".claude", "skills");
    if (existsSync(skillsDir)) {
      return skillsDir;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  return null;
}

/**
 * Check if a skill exists in any of the skill sources.
 */
export function skillExists(skillName: string, projectDir: string): boolean {
  const sources = findSkillSources(projectDir);
  for (const source of sources) {
    const skillPath = join(source.root, skillName);
    if (existsSync(skillPath)) {
      return true;
    }
  }
  return false;
}

/**
 * Get the full path to a specific skill's directory.
 * Returns null if skill not found in any source.
 */
export function resolveSkillPath(
  skillName: string,
  projectDir: string,
): string | null {
  const sources = findSkillSources(projectDir);
  for (const source of sources) {
    const skillPath = join(source.root, skillName);
    if (existsSync(skillPath)) {
      return skillPath;
    }
  }
  return null;
}

/**
 * Find the first skill source that contains a specific skill.
 * Used when callers need the *root* (not the skill path itself) and want it
 * to be the one that actually has the skill they're about to use.
 *
 * Returns null if no source has the skill. Falls back to the first available
 * source when `skillName` is omitted — same as `resolveSkillsRoot`.
 */
export function resolveSkillsRootForSkill(
  projectDir: string,
  skillName?: string,
): string {
  const sources = findSkillSources(projectDir);
  if (sources.length === 0) {
    return join(projectDir, ".converge", "skills");
  }
  if (!skillName) {
    return sources[0].root;
  }
  for (const source of sources) {
    if (existsSync(join(source.root, skillName, "SKILL.md")) ||
        existsSync(join(source.root, skillName, "TASK.md"))) {
      return source.root;
    }
  }
  // Skill not found anywhere — return the highest-priority source so the
  // caller's downstream "skill not found" error still surfaces with a
  // sensible path.
  return sources[0].root;
}

/**
 * Log the skill resolution for debugging.
 */
export function logSkillSources(projectDir: string): void {
  const sources = findSkillSources(projectDir);
  if (sources.length === 0) {
    console.log("   ⚠️  No skill directories found");
    return;
  }

  console.log(`   📚 Skill sources (${sources.length}):`);
  for (const source of sources) {
    const icon =
      source.type === "project" ? "📁" : source.type === "global" ? "🌐" : "📂";
    console.log(`      ${icon} ${source.type}: ${source.root}`);
  }
}
