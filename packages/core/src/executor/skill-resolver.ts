/**
 * Skill Dependency Resolver
 *
 * Auto-loads skill dependencies transitively and validates all required skills exist.
 * Prevents circular dependencies and provides detailed error messages.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findSkillSources } from "../config/skill-path-resolver.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SkillMetadata {
  name: string;
  description?: string;
  version?: string;
  category?: string;
  tags?: string[];
  outputs?: string[];
  "related-skills"?: string[];
  dependencies?: string[];
  requires?: string[];
  "allowed-tools"?: string[];
}

export interface SkillResolutionResult {
  /** All skills to load (including dependencies), in dependency order */
  skills: string[];
  /** Detailed resolution graph for debugging */
  graph: Map<string, string[]>;
  /** Warnings encountered during resolution */
  warnings: string[];
}

export interface SkillResolutionOptions {
  /** Maximum dependency depth to prevent infinite loops */
  maxDepth?: number;
  /** Whether to throw on missing dependencies or just warn */
  throwOnMissing?: boolean;
  /** Enable verbose logging */
  verbose?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Skill Metadata Parser                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse YAML frontmatter from a skill definition file (TASK.md or SKILL.md)
 */
function parseFrontmatter(content: string): Record<string, any> {
  const result: Record<string, any> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;

  const yaml = match[1];
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of yaml.split("\n")) {
    // Array item continuation
    if (line.trim().startsWith("-") && currentKey) {
      const value = line.trim().slice(1).trim();
      // Handle inline array notation: [item1, item2]
      if (value.startsWith("[") && value.endsWith("]")) {
        const items = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        currentArray.push(...items);
      } else {
        currentArray.push(value);
      }
      continue;
    }

    // Flush previous array
    if (currentKey && currentArray.length > 0) {
      result[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }

    // Key-value pair
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();

      // Strip quotes
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      // Check if it's an inline array
      if (value.startsWith("[") && value.endsWith("]")) {
        result[key] = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (value) {
        result[key] = value;
      } else {
        // Empty value means array follows
        currentKey = key;
        currentArray = [];
      }
    }
  }

  // Flush final array
  if (currentKey && currentArray.length > 0) {
    result[currentKey] = currentArray;
  }

  return result;
}

/**
 * Load skill metadata from a skill definition file (TASK.md or SKILL.md).
 *
 * If `projectDir` is provided and the skill isn't in `skillsRoot`, fall back
 * through every source `findSkillSources` reports for that project (project,
 * global, legacy). The first hit wins.
 */
export function loadSkillMetadata(
  skillsRoot: string,
  skillName: string,
  projectDir?: string,
): SkillMetadata | null {
  const roots = [skillsRoot];
  if (projectDir) {
    try {
      for (const s of findSkillSources(projectDir)) {
        if (!roots.includes(s.root)) roots.push(s.root);
      }
    } catch {
      /* fall through with just skillsRoot */
    }
  }

  for (const root of roots) {
    const taskMdPath = join(root, skillName, "TASK.md");
    const skillMdPath = join(root, skillName, "SKILL.md");
    const skillPath = existsSync(taskMdPath) ? taskMdPath : skillMdPath;

    if (!existsSync(skillPath)) continue;

    try {
      const content = readFileSync(skillPath, "utf-8");
      const meta = parseFrontmatter(content) as SkillMetadata;
      if (!meta.name) {
        meta.name = skillName;
      }
      return meta;
    } catch (err: any) {
      throw new Error(
        `Failed to parse skill metadata for '${skillName}': ${err.message}`,
      );
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Dependency Resolution                                             */
/* ------------------------------------------------------------------ */

/**
 * Resolve skill dependencies transitively
 *
 * Returns all skills that need to be loaded (including the root skill),
 * in dependency order (dependencies before dependents).
 *
 * @param skillsRoot - Absolute path to skills directory
 * @param rootSkills - Initial skill names to resolve
 * @param options - Resolution options
 */
export function resolveSkillDependencies(
  skillsRoot: string,
  rootSkills: string[],
  options: SkillResolutionOptions = {},
  projectDir?: string,
): SkillResolutionResult {
  const { maxDepth = 10, throwOnMissing = true, verbose = false } = options;

  const graph = new Map<string, string[]>();
  const warnings: string[] = [];
  const visited = new Set<string>();
  const stack = new Set<string>(); // For cycle detection

  /**
   * DFS traversal to build dependency graph
   */
  function visit(skillName: string, depth: number): void {
    if (depth > maxDepth) {
      const msg = `Maximum dependency depth (${maxDepth}) exceeded for skill '${skillName}'`;
      warnings.push(msg);
      if (throwOnMissing) {
        throw new Error(msg);
      }
      return;
    }

    if (visited.has(skillName)) {
      return; // Already processed
    }

    if (stack.has(skillName)) {
      const msg = `Circular dependency detected: ${Array.from(stack).join(" → ")} → ${skillName}`;
      warnings.push(msg);
      if (throwOnMissing) {
        throw new Error(msg);
      }
      return;
    }

    if (verbose) {
      console.log(`   ${"  ".repeat(depth)}├─ Resolving: ${skillName}`);
    }

    stack.add(skillName);

    // Load skill metadata
    const meta = loadSkillMetadata(skillsRoot, skillName, projectDir);

    if (!meta) {
      const msg = `Skill '${skillName}' not found in ${skillsRoot}`;
      warnings.push(msg);
      if (throwOnMissing) {
        throw new Error(msg);
      }
      stack.delete(skillName);
      return;
    }

    // Collect dependencies from multiple possible fields
    const deps: string[] = [];

    if (meta.dependencies) {
      deps.push(
        ...(Array.isArray(meta.dependencies)
          ? meta.dependencies
          : [meta.dependencies]),
      );
    }

    if (meta.requires) {
      deps.push(
        ...(Array.isArray(meta.requires) ? meta.requires : [meta.requires]),
      );
    }

    if (meta["related-skills"]) {
      deps.push(
        ...(Array.isArray(meta["related-skills"])
          ? meta["related-skills"]
          : [meta["related-skills"]]),
      );
    }

    // Store in graph
    graph.set(skillName, deps);

    if (verbose && deps.length > 0) {
      console.log(
        `   ${"  ".repeat(depth)}   Dependencies: ${deps.join(", ")}`,
      );
    }

    // Recursively resolve dependencies
    for (const dep of deps) {
      visit(dep, depth + 1);
    }

    stack.delete(skillName);
    visited.add(skillName);
  }

  // Start resolution from root skills
  if (verbose) {
    console.log(
      `\n📦 Resolving skill dependencies from: ${rootSkills.join(", ")}`,
    );
  }

  for (const skill of rootSkills) {
    visit(skill, 0);
  }

  // Topological sort: dependencies before dependents
  const sorted: string[] = [];
  const tempMark = new Set<string>();
  const permMark = new Set<string>();

  function topologicalVisit(skillName: string): void {
    if (permMark.has(skillName)) return;
    if (tempMark.has(skillName)) {
      // Cycle detected (shouldn't happen as we check above, but defense in depth)
      return;
    }

    tempMark.add(skillName);

    const deps = graph.get(skillName) || [];
    for (const dep of deps) {
      if (graph.has(dep)) {
        topologicalVisit(dep);
      }
    }

    tempMark.delete(skillName);
    permMark.add(skillName);
    sorted.push(skillName);
  }

  for (const skill of visited) {
    topologicalVisit(skill);
  }

  if (verbose) {
    console.log(`\n✅ Resolved ${sorted.length} skill(s) in dependency order:`);
    sorted.forEach((s, i) => {
      const deps = graph.get(s) || [];
      const depsStr =
        deps.length > 0 ? ` (depends on: ${deps.join(", ")})` : "";
      console.log(`   ${i + 1}. ${s}${depsStr}`);
    });
    console.log("");
  }

  return { skills: sorted, graph, warnings };
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Validate that all required skills exist before execution.
 *
 * `skillsRoot` is the primary (highest-priority) source. If a skill is not
 * found there, this function falls back to the full resolver chain — project,
 * global, legacy — so legacy `.converge/skills/` entries still validate when
 * the caller only has the primary root.
 *
 * @throws Error if any skill is missing from every source
 */
export function validateSkillsExist(
  skillsRoot: string,
  skills: string[],
  projectDir?: string,
): void {
  // If projectDir wasn't passed, try to derive it from the primary skillsRoot
  // by stripping known suffixes. Only works when skillsRoot is project-local;
  // for the global `~/.claude/skills` we can't recover the project from the
  // path alone — callers should pass projectDir explicitly.
  const derivedDir =
    projectDir ??
    skillsRoot
      .replace(/[/\\]\.converge[/\\]skills$/, "")
      .replace(/[/\\]\.claude[/\\]skills$/, "")
      .replace(/[/\\]\.skill$/, "");

  const sourceRoots = [skillsRoot];
  try {
    for (const s of findSkillSources(derivedDir)) {
      if (!sourceRoots.includes(s.root)) sourceRoots.push(s.root);
    }
  } catch {
    /* projectDir derivation failed — fall through with just skillsRoot */
  }

  const missing: string[] = [];

  for (const skillName of skills) {
    const found = sourceRoots.some((root) => {
      const taskMdPath = join(root, skillName, "TASK.md");
      const skillMdPath = join(root, skillName, "SKILL.md");
      return existsSync(taskMdPath) || existsSync(skillMdPath);
    });
    if (!found) {
      missing.push(skillName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Required skill(s) not found in any of ${sourceRoots.join(", ")}:\n` +
        missing.map((s) => `  - ${s}`).join("\n") +
        "\n\nEnsure all skill directories contain a TASK.md or SKILL.md file.",
    );
  }
}

/**
 * Get a summary of what skills will be loaded
 */
export function getSkillSummary(
  skillsRoot: string,
  skills: string[],
  projectDir?: string,
): string {
  const lines: string[] = [];

  for (const skillName of skills) {
    const meta = loadSkillMetadata(skillsRoot, skillName, projectDir);
    if (meta) {
      const desc = meta.description || "(no description)";
      lines.push(`  - ${skillName}: ${desc}`);
    } else {
      lines.push(`  - ${skillName}: ⚠️  NOT FOUND`);
    }
  }

  return lines.join("\n");
}

/**
 * Collect and merge all allowed-tools from skill metadata
 *
 * Returns a deduplicated array of all tools required by the skills,
 * with Skill tool always included.
 *
 * @param skillsRoot - Absolute path to skills directory
 * @param skills - List of skill names to check
 */
export function collectAllowedTools(
  skillsRoot: string,
  skills: string[],
  projectDir?: string,
): string[] {
  const toolSet = new Set<string>([
    "Skill", // Always include Skill tool so Claude can invoke other skills
  ]);

  // Default tools that should always be available
  const defaultTools = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"];
  defaultTools.forEach((t) => toolSet.add(t));

  // Collect tools from all skills
  for (const skillName of skills) {
    const meta = loadSkillMetadata(skillsRoot, skillName, projectDir);
    if (meta?.["allowed-tools"]) {
      const tools = Array.isArray(meta["allowed-tools"])
        ? meta["allowed-tools"]
        : [meta["allowed-tools"]];
      tools.forEach((t) => toolSet.add(t));
    }
  }

  const tools: string[] = [];
  toolSet.forEach((t) => tools.push(t));
  return tools.sort();
}
