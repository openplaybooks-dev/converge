/**
 * Repair Skill Installer
 *
 * Copies bundled repair skill templates to .converge/skills/repair/
 * if they don't already exist. Called during converge initialization
 * or explicitly via CLI.
 *
 * Skills installed:
 *   repair-router          — Triage and route gaps to specific skills
 *   repair-check-failed    — Fix failing validation checks
 *   repair-missing-output  — Produce missing output files
 *   repair-dependency      — Resolve dependency issues
 *
 * The MetaOptimizationSidecar can create additional repair skills
 * at .converge/skills/repair/repair-custom-{pattern}/SKILL.md
 * based on observed failure patterns.
 */

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/* ------------------------------------------------------------------ */
/*  Bundled skill templates                                            */
/* ------------------------------------------------------------------ */

/**
 * Inline skill templates — bundled directly in the code so they work
 * regardless of how the package is installed (npm, symlink, etc.)
 */
const SKILL_TEMPLATES: Record<string, string> = {};

// Templates are loaded lazily from the skill-templates/ directory
// at the same level as this file

/* ------------------------------------------------------------------ */
/*  Installer                                                          */
/* ------------------------------------------------------------------ */

/**
 * Install repair skill templates to .converge/skills/repair/.
 * Only installs skills that don't already exist (preserves user modifications).
 *
 * @param projectDir - Project root directory
 * @param force - Overwrite existing skills (default: false)
 * @returns List of installed skill names
 */
export async function installRepairSkills(
  projectDir: string,
  force = false,
): Promise<string[]> {
  const targetDir = join(projectDir, '.converge', 'skills', 'repair');
  await mkdir(targetDir, { recursive: true });

  // Find bundled templates
  const templatesDir = join(dirname(fileURLToPath(import.meta.url)), 'skill-templates');
  if (!existsSync(templatesDir)) {
    console.log('   ℹ️  No repair skill templates found');
    return [];
  }

  const installed: string[] = [];
  const templateDirs = await readdir(templatesDir);

  for (const skillName of templateDirs) {
    const sourceDir = join(templatesDir, skillName);
    const sourceMd = join(sourceDir, 'SKILL.md');

    // Skip if not a valid skill directory
    const sourceStat = await stat(sourceDir).catch(() => null);
    if (!sourceStat?.isDirectory() || !existsSync(sourceMd)) continue;

    const targetSkillDir = join(targetDir, skillName);
    const targetMd = join(targetSkillDir, 'SKILL.md');

    // Skip if already exists (unless force)
    if (existsSync(targetMd) && !force) {
      continue;
    }

    // Copy the skill
    await mkdir(targetSkillDir, { recursive: true });
    const content = await readFile(sourceMd, 'utf-8');
    await writeFile(targetMd, content);
    installed.push(skillName);
  }

  if (installed.length > 0) {
    console.log(`   ✅ Installed ${installed.length} repair skill(s): ${installed.join(', ')}`);
  }

  return installed;
}

/**
 * Check if repair skills are installed.
 */
export function hasRepairSkills(projectDir: string): boolean {
  const repairDir = join(projectDir, '.converge', 'skills', 'repair');
  if (!existsSync(repairDir)) return false;

  try {
    const dirs = require('fs').readdirSync(repairDir, { withFileTypes: true });
    return dirs.some((d: any) =>
      d.isDirectory() && existsSync(join(repairDir, d.name, 'SKILL.md'))
    );
  } catch {
    return false;
  }
}

/**
 * List installed repair skills.
 */
export async function listRepairSkills(projectDir: string): Promise<string[]> {
  const repairDir = join(projectDir, '.converge', 'skills', 'repair');
  if (!existsSync(repairDir)) return [];

  const skills: string[] = [];
  const dirs = await readdir(repairDir);

  for (const d of dirs) {
    if (existsSync(join(repairDir, d, 'SKILL.md'))) {
      skills.push(d);
    }
  }

  return skills;
}
