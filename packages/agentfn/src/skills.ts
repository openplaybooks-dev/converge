/**
 * Skill and agent loading utilities.
 *
 * All functions take explicit paths — no hardcoded .converge/ or project root detection.
 * The caller decides where skills live and which ones to activate.
 *
 * Handles:
 * - Discovering skills in a directory (folders with SKILL.md)
 * - Loading skill/agent metadata (YAML frontmatter)
 * - Creating/cleaning symlinks for Claude Code's native skill discovery
 */

import {
  existsSync,
  readdirSync,
  readFileSync,
  mkdirSync,
  symlinkSync,
  lstatSync,
  unlinkSync,
  rmdirSync,
} from "node:fs";
import { join, resolve, relative } from "node:path";
import { platform } from "node:os";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Info about a discovered skill */
export interface SkillInfo {
  /** Directory name (e.g. "page-build") */
  dirName: string;
  /** Name from frontmatter, or directory name if missing */
  name: string;
  /** Description from frontmatter */
  description: string;
  /** Absolute path to the SKILL.md file */
  path: string;
}

/** Loaded skill content */
export interface SkillContent {
  /** Parsed frontmatter key-value pairs */
  meta: Record<string, string>;
  /** Markdown body (frontmatter stripped) */
  body: string;
  /** Absolute path to the SKILL.md file */
  path: string;
}

/* ------------------------------------------------------------------ */
/*  Frontmatter Parsing                                                */
/* ------------------------------------------------------------------ */

/** Parse YAML frontmatter from markdown content */
export function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;

  const yaml = match[1];
  for (const line of yaml.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // Strip surrounding quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      result[key] = value;
    }
  }
  return result;
}

/** Strip frontmatter from markdown content, return body only */
export function stripFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
}

/* ------------------------------------------------------------------ */
/*  Skill Discovery & Loading                                          */
/* ------------------------------------------------------------------ */

/**
 * Discover skills in a directory.
 * Scans for subdirectories containing SKILL.md.
 *
 * @param skillsRoot - Absolute path to the skills directory (e.g. "/project/.converge/skills")
 */
export function discoverSkills(skillsRoot: string): SkillInfo[] {
  if (!existsSync(skillsRoot)) return [];

  const results: SkillInfo[] = [];

  try {
    const entries = readdirSync(skillsRoot, { withFileTypes: true });
    for (const d of entries) {
      if (!d.isDirectory()) continue;
      const skillFile = join(skillsRoot, d.name, "SKILL.md");
      if (!existsSync(skillFile)) continue;

      const content = readFileSync(skillFile, "utf-8");
      const meta = parseFrontmatter(content);

      results.push({
        dirName: d.name,
        name: meta.name || d.name,
        description: meta.description || "",
        path: skillFile,
      });
    }
  } catch {
    /* directory read failed */
  }

  return results;
}

/**
 * Load a skill's content from a skills root directory.
 *
 * @param skillsRoot - Absolute path to the skills directory
 * @param name - Skill name (directory name)
 */
export function loadSkill(
  skillsRoot: string,
  name: string,
): SkillContent | null {
  const skillFile = join(skillsRoot, name, "SKILL.md");
  if (!existsSync(skillFile)) return null;

  try {
    const content = readFileSync(skillFile, "utf-8");
    return {
      meta: parseFrontmatter(content),
      body: stripFrontmatter(content),
      path: skillFile,
    };
  } catch {
    return null;
  }
}

/**
 * Load a skill from multiple root directories (first match wins).
 *
 * @param roots - Array of absolute paths to search
 * @param name - Skill name (directory name)
 */
export function loadSkillFromRoots(
  roots: string[],
  name: string,
): SkillContent | null {
  for (const root of roots) {
    const result = loadSkill(root, name);
    if (result) return result;
  }
  return null;
}

/**
 * Get the absolute path to a skill file, searching multiple roots.
 *
 * @param roots - Array of absolute paths to search
 * @param name - Skill name (directory name)
 */
export function getSkillPath(roots: string[], name: string): string | null {
  for (const root of roots) {
    const skillFile = join(root, name, "SKILL.md");
    if (existsSync(skillFile)) return skillFile;
  }
  return null;
}

/**
 * Get skill metadata from a SKILL.md file path.
 */
export function getSkillMeta(path: string): Record<string, string> | null {
  try {
    const content = readFileSync(path, "utf-8");
    return parseFrontmatter(content);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Agent Discovery & Loading                                          */
/* ------------------------------------------------------------------ */

/**
 * Discover agents in a directory.
 * Looks for {name}/AGENT.md or {name}.md files.
 *
 * @param agentsRoot - Absolute path to agents directory
 */
export function discoverAgents(agentsRoot: string): string[] {
  if (!existsSync(agentsRoot)) return [];

  try {
    const entries = readdirSync(agentsRoot, { withFileTypes: true });
    const dirs = entries
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .filter((name) => existsSync(join(agentsRoot, name, "AGENT.md")));
    const files = entries
      .filter((d) => d.isFile() && d.name.endsWith(".md"))
      .map((d) => d.name.replace(".md", ""));
    return [...new Set([...dirs, ...files])];
  } catch {
    return [];
  }
}

/**
 * Get the absolute path to an agent file.
 *
 * @param agentsRoot - Absolute path to agents directory
 * @param name - Agent name
 */
export function getAgentPath(agentsRoot: string, name: string): string | null {
  const path1 = join(agentsRoot, `${name}.md`);
  const path2 = join(agentsRoot, name, "AGENT.md");
  if (existsSync(path1)) return path1;
  if (existsSync(path2)) return path2;
  return null;
}

/**
 * Get agent metadata from an AGENT.md file path.
 */
export function getAgentMeta(path: string): Record<string, string> | null {
  try {
    const content = readFileSync(path, "utf-8");
    return parseFrontmatter(content);
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Symlink Management                                                 */
/* ------------------------------------------------------------------ */

export interface SymlinkOptions {
  /** Only create symlinks for these skill names. If omitted, symlinks all discovered skills. */
  skills?: string[];
  /** Target directory for symlinks (e.g. "/project/.claude/skills") */
  targetRoot?: string;
}

/**
 * Create symlinks in targetRoot pointing to skillsRoot/{name}.
 * Only creates symlinks for skills that don't already have an entry in targetRoot.
 *
 * @param skillsRoot - Absolute path to the source skills directory
 * @param opts - Options for filtering and target directory
 * @returns Array of symlink names created (for cleanup)
 */
export function ensureSkillSymlinks(
  skillsRoot: string,
  opts?: SymlinkOptions,
): string[] {
  if (!existsSync(skillsRoot)) return [];
  if (!opts?.targetRoot) return [];

  const targetRoot = opts.targetRoot;
  const created: string[] = [];

  try {
    const entries = readdirSync(skillsRoot, { withFileTypes: true });
    for (const d of entries) {
      if (!d.isDirectory()) continue;
      if (!existsSync(join(skillsRoot, d.name, "SKILL.md"))) continue;

      const linkPath = join(targetRoot, d.name);

      // Skip if already exists (symlink or real dir)
      try {
        lstatSync(linkPath);
        continue;
      } catch {
        /* doesn't exist, create it */
      }

      mkdirSync(targetRoot, { recursive: true });
      const absTarget = resolve(join(skillsRoot, d.name));
      if (platform() === "win32") {
        symlinkSync(absTarget, linkPath, "junction");
      } else {
        symlinkSync(relative(targetRoot, absTarget), linkPath);
      }
      created.push(d.name);
    }
  } catch {
    /* ignore */
  }

  return created;
}

/**
 * Remove symlinks by name from a target directory.
 * Only removes symlinks (not real directories).
 *
 * @param names - Symlink names to remove
 * @param targetRoot - Directory containing the symlinks
 */
export function cleanupSkillSymlinks(
  names: string[],
  targetRoot: string,
): void {
  if (names.length === 0) return;

  for (const name of names) {
    const linkPath = join(targetRoot, name);
    try {
      if (lstatSync(linkPath).isSymbolicLink()) {
        if (platform() === "win32") {
          // Windows junctions are reported as symlinks but must be removed with rmdirSync
          try {
            rmdirSync(linkPath);
          } catch {
            unlinkSync(linkPath);
          }
        } else {
          unlinkSync(linkPath);
        }
      }
    } catch {
      /* already gone */
    }
  }

  // Remove dir if empty
  try {
    rmdirSync(targetRoot);
  } catch {
    /* not empty */
  }
}

/* ------------------------------------------------------------------ */
/*  Legacy Compat (deprecated — used by old prompting.ts tests)        */
/* ------------------------------------------------------------------ */

/**
 * @deprecated Use discoverSkills(skillsRoot) instead.
 * Lists skills by auto-detecting .claude/skills and .converge/ directories.
 */
export function listSkills(cwd?: string): string[] {
  const skills = new Set<string>();
  const root = _findProjectRoot(cwd);
  if (!root) return [];

  // .claude/skills/
  for (const info of discoverSkills(join(root, ".claude", "skills"))) {
    skills.add(info.dirName);
  }

  // .converge/ root (legacy)
  const convergeDir = _getConvergeDir(cwd);
  if (convergeDir) {
    for (const info of discoverSkills(convergeDir)) {
      skills.add(info.dirName);
    }
  }

  return [...skills];
}

/**
 * @deprecated Use discoverAgents(agentsRoot) instead.
 */
export function listAgents(cwd?: string): string[] {
  const convergeDir = _getConvergeDir(cwd);
  if (!convergeDir) return [];
  return discoverAgents(convergeDir);
}

/**
 * @deprecated Use getSkillPath(roots, name) instead.
 * Legacy single-arg version that auto-detects project root.
 */
export function legacyGetSkillPath(name: string, cwd?: string): string | null {
  const root = _findProjectRoot(cwd);
  if (!root) return null;

  const roots = [join(root, ".claude", "skills")];
  const convergeDir = _getConvergeDir(cwd);
  if (convergeDir) roots.push(convergeDir);

  return getSkillPath(roots, name);
}

/**
 * @deprecated Use getAgentPath(agentsRoot, name) instead.
 * Legacy single-arg version that auto-detects project root.
 */
export function legacyGetAgentPath(name: string, cwd?: string): string | null {
  const convergeDir = _getConvergeDir(cwd);
  if (!convergeDir) return null;
  return getAgentPath(convergeDir, name);
}

/* ------------------------------------------------------------------ */
/*  Internal legacy helpers                                            */
/* ------------------------------------------------------------------ */

/** @internal */
export function _findProjectRoot(
  startDir: string = process.cwd(),
): string | null {
  let dir = resolve(startDir);
  while (dir !== "/") {
    if (existsSync(join(dir, "pnpm-workspace.yaml"))) return dir;
    if (existsSync(join(dir, "package.json"))) return dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** @internal */
export function _getConvergeDir(cwd?: string): string | null {
  if (process.env.CONVERGE_PATH) return process.env.CONVERGE_PATH;
  const root = _findProjectRoot(cwd);
  if (!root) return null;
  const convergeDir = join(root, ".converge");
  return existsSync(convergeDir) ? convergeDir : null;
}
