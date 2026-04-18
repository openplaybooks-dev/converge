/**
 * Skill Dependency Resolver
 *
 * Auto-loads skill dependencies transitively and validates all required skills exist.
 * Prevents circular dependencies and provides detailed error messages.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

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
 * Load skill metadata from a skill definition file (TASK.md or SKILL.md)
 */
export function loadSkillMetadata(
  skillsRoot: string,
  skillName: string,
): SkillMetadata | null {
  const taskMdPath = join(skillsRoot, skillName, "TASK.md");
  const skillMdPath = join(skillsRoot, skillName, "SKILL.md");
  const skillPath = existsSync(taskMdPath) ? taskMdPath : skillMdPath;

  if (!existsSync(skillPath)) {
    return null;
  }

  try {
    const content = readFileSync(skillPath, "utf-8");
    const meta = parseFrontmatter(content) as SkillMetadata;

    // Ensure name is set
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
    const meta = loadSkillMetadata(skillsRoot, skillName);

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
 * Validate that all required skills exist before execution
 *
 * @throws Error if any skill is missing
 */
export function validateSkillsExist(
  skillsRoot: string,
  skills: string[],
): void {
  const missing: string[] = [];

  for (const skillName of skills) {
    const taskMdPath = join(skillsRoot, skillName, "TASK.md");
    const skillMdPath = join(skillsRoot, skillName, "SKILL.md");
    if (!existsSync(taskMdPath) && !existsSync(skillMdPath)) {
      missing.push(skillName);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Required skill(s) not found in ${skillsRoot}:\n` +
        missing.map((s) => `  - ${s}`).join("\n") +
        "\n\nEnsure all skill directories contain a TASK.md file.",
    );
  }
}

/**
 * Get a summary of what skills will be loaded
 */
export function getSkillSummary(skillsRoot: string, skills: string[]): string {
  const lines: string[] = [];

  for (const skillName of skills) {
    const meta = loadSkillMetadata(skillsRoot, skillName);
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
): string[] {
  const toolSet = new Set<string>([
    "Skill", // Always include Skill tool so Claude can invoke other skills
  ]);

  // Default tools that should always be available
  const defaultTools = ["Read", "Write", "Edit", "Bash", "Glob", "Grep"];
  defaultTools.forEach((t) => toolSet.add(t));

  // Collect tools from all skills
  for (const skillName of skills) {
    const meta = loadSkillMetadata(skillsRoot, skillName);
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
