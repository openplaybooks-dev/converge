/**
 * Skill Path Resolver
 *
 * Resolves skill directories with fallback chain:
 *   1. Project-local `.skill/` folder
 *   2. Global `.claude/skills/` folder
 *   3. Legacy `.harness/skills/` folder
 *
 * Also supports merging skills from multiple sources.
 */

import { existsSync } from 'node:fs';
import { join, dirname, parse } from 'node:path';

export interface SkillSource {
  root: string;
  type: 'project' | 'global' | 'legacy';
}

/**
 * Find all available skill sources for a project.
 * Returns array in priority order (project > global > legacy).
 */
export function findSkillSources(projectDir: string): SkillSource[] {
  const sources: SkillSource[] = [];

  // 1. Project-local .skill/ folder (highest priority)
  const projectSkillDir = join(projectDir, '.skill');
  if (existsSync(projectSkillDir)) {
    sources.push({ root: projectSkillDir, type: 'project' });
  }

  // 2. Global .claude/skills/ folder
  // Search upward from project dir for .claude/skills
  const globalSkillDir = findGlobalSkillsDir(projectDir);
  if (globalSkillDir) {
    sources.push({ root: globalSkillDir, type: 'global' });
  }

  // 3. Legacy .harness/skills/ folder
  const legacySkillDir = join(projectDir, '.harness', 'skills');
  if (existsSync(legacySkillDir)) {
    sources.push({ root: legacySkillDir, type: 'legacy' });
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
    return join(projectDir, '.harness', 'skills');
  }
  return sources[0].root;
}

/**
 * Find all skill directories that exist, merging from multiple sources.
 * Skills in higher-priority sources shadow lower-priority ones.
 */
export function resolveAllSkillRoots(projectDir: string): string[] {
  return findSkillSources(projectDir).map(s => s.root);
}

/**
 * Search upward from startDir to find .claude/skills folder
 */
function findGlobalSkillsDir(startDir: string): string | null {
  let currentDir = startDir;
  const { root } = parse(startDir);

  while (currentDir !== root) {
    const skillsDir = join(currentDir, '.claude', 'skills');
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
export function resolveSkillPath(skillName: string, projectDir: string): string | null {
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
 * Log the skill resolution for debugging.
 */
export function logSkillSources(projectDir: string): void {
  const sources = findSkillSources(projectDir);
  if (sources.length === 0) {
    console.log('   ⚠️  No skill directories found');
    return;
  }

  console.log(`   📚 Skill sources (${sources.length}):`);
  for (const source of sources) {
    const icon = source.type === 'project' ? '📁' : source.type === 'global' ? '🌐' : '📂';
    console.log(`      ${icon} ${source.type}: ${source.root}`);
  }
}
