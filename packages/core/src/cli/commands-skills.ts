/**
 * CLI Commands for Skills Management
 *
 * Install skills from the converge to target directories like .claude/skills
 */

import { existsSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { readdir, mkdir, copyFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/* ────────────────────────────────────────────────────────────────── */
/*  Command Options                                                    */
/* ────────────────────────────────────────────────────────────────── */

export interface SkillsInstallOptions {
  /** Target directory to install skills into (default: .claude/skills) */
  target?: string;
  /** Specific skill name to install (default: install all) */
  skill?: string;
  /** Verbose logging */
  verbose?: boolean;
  /** Force overwrite existing skills */
  force?: boolean;
}

export interface SkillsListOptions {
  /** Verbose logging */
  verbose?: boolean;
}

/* ────────────────────────────────────────────────────────────────── */
/*  Helper Functions                                                   */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Recursively copy a directory
 */
async function copyDir(src: string, dest: string): Promise<void> {
  // Create destination directory
  await mkdir(dest, { recursive: true });

  // Read source directory
  const entries = await readdir(src, { withFileTypes: true });

  // Copy each entry
  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Get the converge package skills directory
 */
function getConvergeSkillsDir(): string {
  // Get the directory of the current file
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = dirname(currentFile);

  // If we're in dist/ (built), go up 1 level to package root
  // If we're in src/cli/ (development), go up 2 levels to package root
  const packageRoot = currentDir.includes('/dist')
    ? resolve(currentDir, '..')
    : resolve(currentDir, '../..');

  return join(packageRoot, 'skills');
}

/**
 * List available skills in the converge
 */
async function listAvailableSkills(): Promise<string[]> {
  const skillsDir = getConvergeSkillsDir();

  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);
}

/**
 * Check if a skill directory is valid (contains SKILL.md or README.md)
 */
async function isValidSkill(skillPath: string): Promise<boolean> {
  const skillMd = join(skillPath, 'SKILL.md');
  const readmeMd = join(skillPath, 'README.md');
  return existsSync(skillMd) || existsSync(readmeMd);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: skills list                                               */
/* ────────────────────────────────────────────────────────────────── */

/**
 * List available skills
 */
export async function skillsListCommand(options: SkillsListOptions = {}): Promise<void> {
  console.log('📚 Available Converge Skills:\n');

  const skillsDir = getConvergeSkillsDir();
  if (!existsSync(skillsDir)) {
    console.error(`❌ Skills directory not found: ${skillsDir}`);
    process.exit(1);
  }

  const skills = await listAvailableSkills();

  if (skills.length === 0) {
    console.log('   No skills found.');
    return;
  }

  console.log(`   Found ${skills.length} skill(s):\n`);

  for (const skill of skills) {
    const skillPath = join(skillsDir, skill);
    const isValid = await isValidSkill(skillPath);
    const icon = isValid ? '✅' : '⚠️';
    console.log(`   ${icon} ${skill}`);

    if (options.verbose) {
      console.log(`      Path: ${skillPath}`);
    }
  }

  console.log();
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: skills install                                            */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Install skill(s) to a target directory
 */
export async function skillsInstallCommand(options: SkillsInstallOptions = {}): Promise<void> {
  const cwd = process.cwd();
  const targetBase = options.target || '.claude/skills';
  const targetDir = resolve(cwd, targetBase);
  const skillsDir = getConvergeSkillsDir();

  console.log('📦 Installing Converge Skills\n');

  if (!existsSync(skillsDir)) {
    console.error(`❌ Skills directory not found: ${skillsDir}`);
    process.exit(1);
  }

  // Create target directory if it doesn't exist
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
    console.log(`✅ Created target directory: ${targetBase}\n`);
  }

  // Determine which skills to install
  const availableSkills = await listAvailableSkills();
  let skillsToInstall: string[];

  if (options.skill) {
    // Install specific skill
    if (!availableSkills.includes(options.skill)) {
      console.error(`❌ Skill not found: ${options.skill}`);
      console.error(`\nAvailable skills: ${availableSkills.join(', ')}`);
      process.exit(1);
    }
    skillsToInstall = [options.skill];
  } else {
    // Install all skills
    skillsToInstall = availableSkills;
  }

  console.log(`Installing ${skillsToInstall.length} skill(s) to ${targetBase}:\n`);

  let installedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const skill of skillsToInstall) {
    const sourcePath = join(skillsDir, skill);
    const destPath = join(targetDir, skill);

    // Check if skill is valid
    const isValid = await isValidSkill(sourcePath);
    if (!isValid) {
      console.log(`   ⚠️  ${skill} (invalid - missing SKILL.md or README.md)`);
      skippedCount++;
      continue;
    }

    // First, handle existing destination outside try/catch
    const destExists = existsSync(destPath);
    let hasContent = false;

    if (destExists) {
      try {
        const entries = await readdir(destPath);
        hasContent = entries.length > 0;
      } catch {
        // Ignore read errors
      }
    }

    if (hasContent && !options.force) {
      console.log(`   ⏭  ${skill} (already exists - use --force to overwrite)`);
      skippedCount++;
      continue;
    }

    // Delete existing directory if it exists
    if (destExists) {
      try {
        await rm(destPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
        if (options.verbose) {
          console.log(`      Deleted existing directory`);
        }
      } catch (error: any) {
        console.log(`   ❌ ${skill} (error deleting existing directory: ${error.message})`);
        errorCount++;
        continue;
      }
    }

    try {
      // Copy skill directory using manual recursive copy
      await copyDir(sourcePath, destPath);

      console.log(`   ✅ ${skill}`);
      installedCount++;

      if (options.verbose) {
        console.log(`      ${sourcePath} → ${destPath}`);
      }
    } catch (error: any) {
      if (options.verbose) {
        console.log(`   ❌ ${skill}`);
        console.log(`      Source: ${sourcePath}`);
        console.log(`      Dest: ${destPath}`);
        console.log(`      Error: ${error.message}`);
        console.log(`      Stack: ${error.stack}`);
      } else {
        console.log(`   ❌ ${skill} (error: ${error.message})`);
      }
      errorCount++;
    }
  }

  console.log();
  console.log('📊 Summary:');
  console.log(`   Installed: ${installedCount}`);
  console.log(`   Skipped:   ${skippedCount}`);
  console.log(`   Errors:    ${errorCount}`);
  console.log();

  if (installedCount > 0) {
    console.log(`✅ Skills installed successfully to ${targetBase}`);
  }
}
