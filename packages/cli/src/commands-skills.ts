/**
 * CLI Commands for Skills Management
 *
 * Install skills from the converge to target directories like .claude/skills
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import { readdir, mkdir, copyFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

/* ────────────────────────────────────────────────────────────────── */
/*  Command Options                                                    */
/* ────────────────────────────────────────────────────────────────── */

export interface SkillsInstallOptions {
  /** Project directory (default: cwd) */
  dir?: string;
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
  /** Project directory (default: cwd) */
  dir?: string;
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
  // If we're in src/ (development), go up 2 levels to package root
  const packageRoot = basename(currentDir) === "dist"
    ? resolve(currentDir, "..")
    : resolve(currentDir, "../..");

  // First try package-local skills/ (e.g. packages/cli/skills/)
  const localSkills = join(packageRoot, "skills");
  if (existsSync(localSkills)) return localSkills;

  // Fall back to monorepo-root skills/ (packages/cli/../../skills/)
  const monorepoRoot = resolve(packageRoot, "../..");
  return join(monorepoRoot, "skills");
}

/**
 * User-facing skills installed by init --skills and skills install.
 * converge-development is excluded — it's for framework contributors only.
 */
const USER_FACING_SKILLS = ["converge-planning", "converge-control"];

/**
 * List available skills in the converge
 */
async function listAvailableSkills(): Promise<string[]> {
  const skillsDir = getConvergeSkillsDir();

  if (!existsSync(skillsDir)) {
    return [];
  }

  const entries = await readdir(skillsDir, { withFileTypes: true });
  const allSkills = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return allSkills.filter((s) => USER_FACING_SKILLS.includes(s));
}

/**
 * Check if a skill directory is valid (contains SKILL.md or README.md)
 */
async function isValidSkill(skillPath: string): Promise<boolean> {
  const skillMd = join(skillPath, "SKILL.md");
  const readmeMd = join(skillPath, "README.md");
  return existsSync(skillMd) || existsSync(readmeMd);
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: skills list                                               */
/* ────────────────────────────────────────────────────────────────── */

/**
 * List available skills
 */
export async function skillsListCommand(
  options: SkillsListOptions = {},
): Promise<void> {
  console.log("📚 Available Converge Skills:\n");

  const skillsDir = getConvergeSkillsDir();
  if (!existsSync(skillsDir)) {
    console.error(`❌ Skills directory not found: ${skillsDir}`);
    process.exit(1);
  }

  const skills = await listAvailableSkills();

  if (skills.length === 0) {
    console.log("   No skills found.");
    return;
  }

  console.log(`   Found ${skills.length} skill(s):\n`);

  for (const skill of skills) {
    const skillPath = join(skillsDir, skill);
    const isValid = await isValidSkill(skillPath);
    const icon = isValid ? "✅" : "⚠️";
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
export async function skillsInstallCommand(
  options: SkillsInstallOptions = {},
): Promise<void> {
  const cwd = resolve(options.dir || process.cwd());
  const targetBase = options.target || ".claude/skills";
  const targetDir = resolve(cwd, targetBase);
  const skillsDir = getConvergeSkillsDir();

  console.log("📦 Installing Converge Skills\n");

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
      console.error(`\nAvailable skills: ${availableSkills.join(", ")}`);
      process.exit(1);
    }
    skillsToInstall = [options.skill];
  } else {
    // Install all skills
    skillsToInstall = availableSkills;
  }

  console.log(
    `Installing ${skillsToInstall.length} skill(s) to ${targetBase}:\n`,
  );

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
      console.log(
        `   ⏭  ${skill} (already exists - use --force to overwrite)`,
      );
      skippedCount++;
      continue;
    }

    // Delete existing directory if it exists
    if (destExists) {
      try {
        await rm(destPath, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 100,
        });
        if (options.verbose) {
          console.log(`      Deleted existing directory`);
        }
      } catch (error: any) {
        console.log(
          `   ❌ ${skill} (error deleting existing directory: ${error.message})`,
        );
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
  console.log("📊 Summary:");
  console.log(`   Installed: ${installedCount}`);
  console.log(`   Skipped:   ${skippedCount}`);
  console.log(`   Errors:    ${errorCount}`);
  console.log();

  if (installedCount > 0) {
    console.log(`✅ Skills installed successfully to ${targetBase}`);
  }
}

/* ────────────────────────────────────────────────────────────────── */
/*  Command: skills (top-level subcommand — playbook-scoped preset)    */
/* ────────────────────────────────────────────────────────────────── */

/**
 * Skill summary emitted by `converge skills list`. Each entry maps to a
 * SKILL.md file under the active playbook's skills directory.
 */
export interface PlaybookSkillSummary {
  name: string;
  description: string;
  path: string;
}

export interface PlaybookSkillsCommandOptions {
  positional: string[];
  options: Record<string, unknown>;
}

function asStringOpt(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}

function asBoolOpt(v: unknown): boolean {
  return v === true || v === "true" || v === "1";
}

function failPlaybookSkills(message: string, code = 2): never {
  console.error(`converge skills: ${message}`);
  process.exit(code);
}

/**
 * Result of reading one SKILL.md's frontmatter. Either the parsed
 * `name` + `description` (valid) or a reason string explaining why
 * the file was rejected. Reason strings flow through to operator-facing
 * output so a malformed SKILL.md is never silently dropped.
 */
type SkillFrontmatterResult =
  | { ok: true; name: string; description: string }
  | { ok: false; reason: string };

function readPlaybookSkillFrontmatter(
  skillMdPath: string,
): SkillFrontmatterResult {
  if (!existsSync(skillMdPath)) {
    return { ok: false, reason: "SKILL.md missing" };
  }
  let raw: string;
  try {
    raw = readFileSync(skillMdPath, "utf-8");
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `read failed: ${m}` };
  }
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    return { ok: false, reason: "missing YAML frontmatter block" };
  }
  let doc: unknown;
  try {
    doc = parseYaml(match[1]);
  } catch (err) {
    const m = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `YAML parse failed: ${m}` };
  }
  if (!doc || typeof doc !== "object") {
    return { ok: false, reason: "frontmatter is not a mapping" };
  }
  const rec = doc as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  const description =
    typeof rec.description === "string" ? rec.description.trim() : "";
  if (!name) return { ok: false, reason: "frontmatter missing `name` field" };
  if (!description) {
    return { ok: false, reason: "frontmatter missing `description` field" };
  }
  return { ok: true, name, description };
}

/**
 * Diagnostic for a SKILL.md that couldn't be loaded as a skill — surfaced
 * to operators so a malformed file is never silently dropped from the
 * catalog. The `dir` is the skill directory name (e.g. "broken-skill")
 * rather than the absolute file path so the error is succinct.
 */
export interface PlaybookSkillError {
  dir: string;
  path: string;
  reason: string;
}

/**
 * Result of enumerating a playbook's skills directory. `skills` is the
 * sorted list of valid SKILL.md files; `errors` captures any directory
 * whose SKILL.md was malformed (missing fields, invalid YAML, etc.) so
 * the operator can fix it. Both arrays are stable-sorted by name/dir.
 */
export interface PlaybookSkillsList {
  skills: PlaybookSkillSummary[];
  errors: PlaybookSkillError[];
}

/**
 * Enumerate the active playbook's `.converge/playbooks/<pb>/skills/`
 * directory. Each subdirectory containing a parseable SKILL.md becomes
 * one summary entry; malformed entries surface as `errors` so the
 * operator sees them rather than silently losing the skill.
 *
 * Mirrors the corruption-visibility pattern from iter-12 → iter-15: keep
 * the recovery behavior (skip the bad one) but make the drop visible.
 *
 * Sorted by name (or dir for errors) so downstream tools can diff.
 */
export function listPlaybookSkills(
  workspace: string,
  playbook: string,
): PlaybookSkillsList {
  const skillsDir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "skills",
  );
  if (!existsSync(skillsDir)) return { skills: [], errors: [] };

  const skills: PlaybookSkillSummary[] = [];
  const errors: PlaybookSkillError[] = [];

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillMdPath = join(skillsDir, entry.name, "SKILL.md");
    const fm = readPlaybookSkillFrontmatter(skillMdPath);
    if (fm.ok) {
      skills.push({
        name: fm.name,
        description: fm.description,
        path: skillMdPath,
      });
    } else {
      errors.push({
        dir: entry.name,
        path: skillMdPath,
        reason: fm.reason,
      });
    }
  }

  skills.sort((a, b) => a.name.localeCompare(b.name));
  errors.sort((a, b) => a.dir.localeCompare(b.dir));
  return { skills, errors };
}

/**
 * `converge skills list [--playbook X] [--human]` — emit the playbook's
 * skill preset as JSON (default) or human-readable text (--human).
 *
 * Skills are the playbook's reusable instruction bundles. Goals stay
 * generic; the AI consults this list at task time to pick the right
 * skills for the work in front of it.
 */
export async function playbookSkillsCommand({
  positional,
  options,
}: PlaybookSkillsCommandOptions): Promise<void> {
  const sub = positional[0];
  if (!sub) {
    failPlaybookSkills("usage: converge skills <list> [--playbook X] [--human]");
  }

  if (sub !== "list") {
    failPlaybookSkills(
      `unknown subcommand '${sub}' — expected: list`,
    );
  }

  const workspace = process.env.CONVERGE_WORKSPACE ?? process.cwd();
  const playbook =
    asStringOpt(options.playbook) ?? process.env.CONVERGE_PLAYBOOK;
  if (!playbook) {
    failPlaybookSkills("--playbook is required (or set CONVERGE_PLAYBOOK env)");
  }

  const { skills, errors } = listPlaybookSkills(workspace, playbook!);
  const human = asBoolOpt(options.human);

  if (human) {
    if (skills.length === 0 && errors.length === 0) {
      console.log(
        `No skills found under .converge/playbooks/${playbook}/skills/. ` +
          `Add SKILL.md files there.`,
      );
      return;
    }
    for (const s of skills) {
      console.log(s.name);
      // Wrap description at ~76 columns.
      const words = s.description.split(/\s+/);
      let buf = "  ";
      for (const w of words) {
        if ((buf + w).length > 76) {
          console.log(buf.trimEnd());
          buf = "  ";
        }
        buf += w + " ";
      }
      if (buf.trim()) console.log(buf.trimEnd());
      console.log();
    }
    if (errors.length > 0) {
      console.log("");
      console.log(
        `⚠  ${errors.length} skill director${errors.length === 1 ? "y" : "ies"} skipped (malformed SKILL.md):`,
      );
      for (const e of errors) {
        console.log(`  ${e.dir} — ${e.reason}`);
        console.log(`    path: ${e.path}`);
      }
    }
    return;
  }

  // JSON output: emit { skills, errors } so consumers (spawn-sprint.sh,
  // operator tools) can see both. Backwards-compat note: the prior
  // contract emitted a raw array; iter-22 wraps it in an object. Any
  // consumer doing `JSON.parse(out)[0].name` will need to do
  // `JSON.parse(out).skills[0].name`. The seed scripts in
  // examples/goal-driven-dev/.converge/playbooks/default/seeds/
  // are updated to match in the same iteration.
  console.log(JSON.stringify({ skills, errors }, null, 2));
}
