/**
 * RFC 0008 — Skill discovery API (part 1: index builder).
 *
 * Parses SKILL.md frontmatter into a queryable index. Part 2 wires this
 * into the task working-dir writer (drops `.SKILLS.json` alongside
 * CHECK.md / NEEDS.md) and adds the `converge skill list` CLI.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

export interface SkillEntry {
  name: string;
  description: string | null;
  path: string;
  whenToUse: string | null;
}

export interface SkillIndex {
  task: string;
  playbook: string;
  skills: SkillEntry[];
}

/**
 * Parse a SKILL.md file. Returns null if the path doesn't exist or
 * frontmatter is unreadable — callers can decide whether to warn or
 * silently skip.
 */
export function parseSkillFile(skillMdPath: string): Omit<SkillEntry, "name"> | null {
  if (!existsSync(skillMdPath)) return null;
  let content: string;
  try { content = readFileSync(skillMdPath, "utf-8"); } catch { return null; }
  const fm = readFrontmatter(content);
  return {
    description: stringOrNull(fm.description) ?? stringOrNull(fm.summary),
    path: skillMdPath,
    whenToUse: stringOrNull(fm.when_to_use) ?? stringOrNull(fm.whenToUse),
  };
}

/**
 * Build a SkillIndex by discovering SKILL.md files under each of the
 * given roots. Roots are typically symlinked into the task's working
 * dir at `.claude/skills/<name>/SKILL.md`.
 */
export function buildSkillIndex(args: {
  task: string;
  playbook: string;
  /** Each root is a directory containing `<skillName>/SKILL.md` subdirectories. */
  roots: string[];
}): SkillIndex {
  const seen = new Set<string>();
  const skills: SkillEntry[] = [];
  for (const root of args.roots) {
    if (!existsSync(root)) continue;
    let entries: string[];
    try { entries = readdirSync(root); } catch { continue; }
    for (const name of entries) {
      if (seen.has(name)) continue;
      const dir = join(root, name);
      let isDir = false;
      try { isDir = statSync(dir).isDirectory(); } catch { continue; }
      if (!isDir) continue;
      const skillMd = join(dir, "SKILL.md");
      const parsed = parseSkillFile(skillMd);
      if (!parsed) continue;
      seen.add(name);
      skills.push({ name, ...parsed });
    }
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { task: args.task, playbook: args.playbook, skills };
}

function readFrontmatter(content: string): Record<string, unknown> {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  try {
    const parsed = parseYaml(m[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch { /* swallow */ }
  return {};
}

function stringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}
