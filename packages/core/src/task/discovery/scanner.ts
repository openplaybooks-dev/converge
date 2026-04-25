/**
 * Discovery Scanner
 *
 * Scans glob patterns to find task/epic/check/plan files and
 * dynamically imports them to extract their exports.
 *
 * This supersedes the static-path `TaskFileScanner` in `src/planning/`
 * with a glob-pattern-based approach that reads actual `converge.ts` config.
 *
 * Export shape detection heuristics:
 * - Has `.run` function          → task
 * - Has `.goals` array           → epic
 * - Returns `CheckResult` shape  → check
 * - Has `.handles` array         → plan
 * - Named `/TASK.md`             → task (by filename convention)
 * - Named `*.check.ts`           → check
 * - Named `*.plan.ts`            → plan
 */

import { pathToFileURL } from "node:url";
import { readFileSync, existsSync } from "node:fs";
import { glob } from "glob";
import path from "node:path";
import { HookRegistry } from "../../hooks/registry.ts";
import type { DiscoveryConfig } from "../../config/types.ts";
import type {
  DiscoveredFile,
  DiscoveryResult,
  DiscoveredFileType,
} from "./types.ts";
import { SkillDependencyGraph, type SkillNode } from "./skill-graph.ts";

/* ------------------------------------------------------------------ */
/*  Default Patterns                                                   */
/* ------------------------------------------------------------------ */

const DEFAULT_TASK_PATTERNS: string[] = [];

const DEFAULT_EPIC_PATTERNS: string[] = [];

const DEFAULT_CHECK_PATTERNS = [
  ".converge/checks/**/*.ts",
  ".converge/checks/**/*.check.ts",
];

const DEFAULT_PLAN_PATTERNS = [
  ".converge/plans/**/*.ts",
  ".converge/plans/**/*.plan.ts",
];

const DEFAULT_SKILL_PATTERNS = [".converge/skills/**/SKILL.md"];

const DEFAULT_AGENT_PATTERNS = [".converge/agents/**/*.md"];

/* ------------------------------------------------------------------ */
/*  Scanner                                                            */
/* ------------------------------------------------------------------ */

export class DiscoveryScanner {
  private config: DiscoveryConfig;
  private projectDir: string;
  private hooks?: HookRegistry;

  constructor(
    config: DiscoveryConfig,
    projectDir: string,
    hooks?: HookRegistry,
  ) {
    this.config = config;
    this.projectDir = projectDir;
    this.hooks = hooks;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Public API                                                      */
  /* ──────────────────────────────────────────────────────────────── */

  /**
   * Run a full scan across all configured patterns.
   * Errors in individual files are captured (not thrown) so that
   * one bad file doesn't block discovery of the rest.
   */
  async scan(): Promise<DiscoveryResult> {
    const allFiles: DiscoveredFile[] = [];
    const allErrors: Array<{ file: string; error: string }> = [];
    const allPatterns: string[] = [];

    const patternGroups: Array<{
      patterns: string[];
      type: DiscoveredFileType;
    }> = [
      { patterns: this.config.tasks ?? DEFAULT_TASK_PATTERNS, type: "task" },
      { patterns: this.config.epics ?? DEFAULT_EPIC_PATTERNS, type: "epic" },
      { patterns: this.config.checks ?? DEFAULT_CHECK_PATTERNS, type: "check" },
      { patterns: this.config.plans ?? DEFAULT_PLAN_PATTERNS, type: "plan" },
      { patterns: this.config.skills ?? DEFAULT_SKILL_PATTERNS, type: "skill" },
      { patterns: this.config.agents ?? DEFAULT_AGENT_PATTERNS, type: "agent" },
    ];

    for (const { patterns, type } of patternGroups) {
      // Filter out undefined/null patterns
      const validPatterns = patterns.filter(
        (p) => p != null && typeof p === "string",
      );
      allPatterns.push(...validPatterns);

      for (const pattern of validPatterns) {
        const files = await glob(pattern, {
          cwd: this.projectDir,
          absolute: true,
          ignore: ["**/node_modules/**", "**/*.d.ts", "**/*.js"],
        });

        for (const filePath of files) {
          const result = await this.loadFile(filePath, type);
          if (result.ok) {
            allFiles.push(result.file);
          } else {
            allErrors.push({ file: filePath, error: result.error });
          }
        }
      }
    }

    // Scan for TASK.md tasks (markdown-based task definitions)
    await this.scanMarkdownTasks(allFiles, allErrors);

    // Build skill dependency graph
    let skillGraph: SkillDependencyGraph | undefined;
    const skillFiles = allFiles.filter((f) => f.type === "skill");
    if (skillFiles.length > 0) {
      skillGraph = this.buildSkillGraph(skillFiles);
    }

    const result: DiscoveryResult = {
      files: allFiles,
      timestamp: new Date().toISOString(),
      errors: allErrors,
      patterns: allPatterns,
      skillGraph,
    };

    // Fire hook if any files were found
    if (allFiles.length > 0 && this.hooks) {
      const byType = new Map<DiscoveredFileType, string[]>();
      for (const f of allFiles) {
        if (!byType.has(f.type)) byType.set(f.type, []);
        byType.get(f.type)!.push(f.filePath);
      }
      for (const [type, files] of byType) {
        await this.hooks.fire("discovery:found", { files, type });
      }
    }

    return result;
  }

  /**
   * Scan for a single file type only (used by watcher on change).
   */
  async scanFile(
    filePath: string,
    hintType?: DiscoveredFileType,
  ): Promise<DiscoveredFile | null> {
    const type = hintType ?? inferTypeFromPath(filePath);
    if (!type) return null;
    const result = await this.loadFile(filePath, type);
    if (result.ok) return result.file;
    return null;
  }

  /* ──────────────────────────────────────────────────────────────── */
  /*  Private                                                         */
  /* ──────────────────────────────────────────────────────────────── */

  private async loadFile(
    filePath: string,
    hintType: DiscoveredFileType,
  ): Promise<
    { ok: true; file: DiscoveredFile } | { ok: false; error: string }
  > {
    try {
      // Handle markdown files (skills, agents, TASK.md, and any .md file).
      // These are loaded via readFileSync — never via dynamic import().
      if (
        hintType === "skill" ||
        hintType === "agent" ||
        filePath.endsWith(".md") ||
        filePath.endsWith(".MD")
      ) {
        const content = readFileSync(filePath, "utf-8");
        const metadata = this.parseFrontmatter(content);

        return {
          ok: true,
          file: {
            filePath,
            type: hintType,
            exports: metadata,
            discoveredAt: new Date().toISOString(),
          },
        };
      }

      // Handle TypeScript files
      const fileUrl = pathToFileURL(filePath);
      // Cache-busting ensures watch mode re-imports get fresh content
      fileUrl.searchParams.set("t", String(Date.now()));

      const mod = await import(fileUrl.href);
      const exports: Record<string, unknown> = { ...mod };

      // Infer actual type from exports + filename
      const type = inferType(filePath, exports) ?? hintType;

      return {
        ok: true,
        file: {
          filePath,
          type,
          exports,
          discoveredAt: new Date().toISOString(),
        },
      };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? String(err) };
    }
  }

  /**
   * Parse YAML frontmatter from markdown files
   */
  private parseFrontmatter(content: string): Record<string, any> {
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) return {};

    const yamlContent = match[1];
    const metadata: Record<string, any> = {};

    // Simple YAML parser for our needs
    const lines = yamlContent.split("\n");
    let currentKey: string | null = null;
    let currentArray: any[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Array item
      if (trimmed.startsWith("- ")) {
        if (currentKey) {
          const value = trimmed.substring(2).trim();
          currentArray.push(value);
        }
        continue;
      }

      // Key-value pair
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        // Save previous array if exists
        if (currentKey && currentArray.length > 0) {
          metadata[currentKey] = currentArray;
        }

        currentKey = trimmed.substring(0, colonIndex).trim();
        const value = trimmed.substring(colonIndex + 1).trim();

        if (value.startsWith("[") && value.endsWith("]")) {
          // Inline array: [item1, item2]
          const items = value
            .substring(1, value.length - 1)
            .split(",")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          metadata[currentKey] = items;
          currentKey = null;
          currentArray = [];
        } else if (value) {
          // Simple value
          metadata[currentKey] = value;
          currentKey = null;
          currentArray = [];
        } else {
          // Array follows
          currentArray = [];
        }
      }
    }

    // Save last array if exists
    if (currentKey && currentArray.length > 0) {
      metadata[currentKey] = currentArray;
    }

    return metadata;
  }

  /**
   * Scan for TASK.md tasks (markdown-based task definitions).
   * All discovered tasks are type: 'task-md'.
   */
  private async scanMarkdownTasks(
    allFiles: DiscoveredFile[],
    allErrors: Array<{ file: string; error: string }>,
  ): Promise<void> {
    // Playbook-only discovery. Tasks live under playbooks/{name}/tasks/ and
    // WBS-spawned children are written there by the executor. The legacy
    // `.converge/epics/` layout is no longer a source of truth — discovering
    // it caused double-counts (template + runtime copy) and id collisions
    // across concurrent runs.
    //
    // When CONVERGE_PLAYBOOK is set, scope discovery to ONLY that playbook.
    // Without scoping, tasks like `01-foundation` or `02-breakdown` that are
    // shared across playbooks collide in the node map (last-write wins), which
    // silently drops parents of whichever playbook was scanned first.
    const playbookScope = process.env.CONVERGE_PLAYBOOK;
    const playbookSegment =
      playbookScope && playbookScope !== "default" ? playbookScope : "*";
    const mdPatterns = [
      `.converge/playbooks/${playbookSegment}/TASK.md`,
      `.converge/playbooks/${playbookSegment}/tasks/**/TASK.md`,
      // WBS-spawned children live in the journal tree, which mirrors the
      // playbook layout 1:1 — same glob, `journal/` root instead of `playbooks/`.
      `.converge/journal/${playbookSegment}/TASK.md`,
      `.converge/journal/${playbookSegment}/tasks/**/TASK.md`,
    ];

    const mdFiles: string[] = [];
    for (const pattern of mdPatterns) {
      const matches = await glob(pattern, {
        cwd: this.projectDir,
        absolute: true,
        ignore: [
          "**/node_modules/**",
          "**/templates/**",
          "**/wbs/**", // WBS template trees (mirror real task structure)
          "**/subtask/**", // WBS subtask templates (contain {{placeholders}})
          "**/examples/**", // Exclude materials directories
          "**/scripts/**", // Exclude materials directories
          "**/materials/**", // Exclude materials directories
          "**/attempts/**", // TASK.md inside attempt dirs is a working copy, not a new task
        ],
      });
      mdFiles.push(...matches);
    }

    for (const mdPath of mdFiles) {
      const folder = path.dirname(mdPath);

      // Check if already loaded
      const alreadyLoaded = allFiles.some((f) => f.filePath === mdPath);
      if (alreadyLoaded) {
        continue;
      }

      try {
        // Read markdown and parse frontmatter
        const content = readFileSync(mdPath, "utf-8");
        const frontmatter = this.parseFrontmatter(content);

        // Skip unresolved templates — files whose PATH or frontmatter ID still
        // contains {{placeholder}} mustache variables are WBS templates, not
        // runnable tasks. We deliberately do NOT check the markdown body:
        // legitimate task docs can mention the placeholder syntax in prose
        // (e.g., describing how a WBS renders children) without being templates.
        const idField =
          typeof frontmatter.id === "string" ? frontmatter.id : "";
        const hasPlaceholder = /\{\{[^}]+\}\}/;
        if (hasPlaceholder.test(mdPath) || hasPlaceholder.test(idField)) {
          continue;
        }

        // Create default TaskConfig from frontmatter
        const taskId = (typeof frontmatter.id === "string" && frontmatter.id) || path.basename(folder);
        const title = frontmatter.title || taskId;
        const inputs = Array.isArray(frontmatter.inputs)
          ? frontmatter.inputs
          : [];
        const outputs = Array.isArray(frontmatter.outputs)
          ? frontmatter.outputs
          : [];
        const checks = Array.isArray(frontmatter.checks)
          ? frontmatter.checks
          : outputs.map((o: string) => `check-${o}`);

        // Create a DiscoveredFile with TaskConfig as exports
        const fileType = inferTypeFromPath(mdPath) ?? "task";
        allFiles.push({
          filePath: mdPath,
          type: fileType,
          exports: {
            default: {
              id: taskId,
              title,
              inputs,
              outputs,
              checks,
              type: "task-md",
              metadata: {
                filePath: mdPath,
                isTaskMd: true,
              },
            },
          },
          discoveredAt: new Date().toISOString(),
        });
      } catch (error: any) {
        allErrors.push({
          file: mdPath,
          error: error?.message ?? String(error),
        });
      }
    }
  }

  /**
   * Build skill dependency graph from discovered skill files
   */
  private buildSkillGraph(skillFiles: DiscoveredFile[]): SkillDependencyGraph {
    const skillNodes = new Map<string, SkillNode>();

    for (const file of skillFiles) {
      const metadata = file.exports as Record<string, any>;
      const name = metadata.name || "";
      const dependencies = Array.isArray(metadata["dependencies"])
        ? metadata["dependencies"]
        : [];

      if (name) {
        skillNodes.set(name, {
          name,
          path: file.filePath,
          dependencies,
        });
      }
    }

    return new SkillDependencyGraph(skillNodes);
  }
}

/* ------------------------------------------------------------------ */
/*  Type Inference Helpers                                            */
/* ------------------------------------------------------------------ */

/**
 * Infer the contribution type from filename and export shape.
 * Returns `null` if unable to determine — caller uses the hint.
 */
function inferType(
  filePath: string,
  exports: Record<string, unknown>,
): DiscoveredFileType | null {
  // 1. Filename convention takes priority
  const byName = inferTypeFromPath(filePath);
  if (byName) return byName;

  // 2. Export shape heuristics on the default export
  const def = exports["default"];
  if (!def || typeof def !== "object") return null;

  const d = def as Record<string, unknown>;

  if (typeof d["run"] === "function" && !d["goals"]) return "task";
  if (Array.isArray(d["goals"])) return "epic";
  if (Array.isArray(d["handles"])) return "plan";
  if (typeof d["run"] === "function" && d["check"]) return "check";

  return null;
}

/**
 * Infer type from the file extension convention:
 * `*.check.ts`, `*.plan.ts`, `/TASK.md`
 */
function inferTypeFromPath(filePath: string): DiscoveredFileType | null {
  if (filePath.endsWith(".check.ts")) return "check";
  if (filePath.endsWith(".plan.ts")) return "plan";
  if (filePath.endsWith("/TASK.md")) return "task";
  return null;
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

/**
 * Create a `DiscoveryScanner` with sensible defaults.
 * Accepts a partial `DiscoveryConfig` — missing fields use defaults.
 */
export function createDiscoveryScanner(
  config: DiscoveryConfig,
  projectDir: string,
  hooks?: HookRegistry,
): DiscoveryScanner {
  return new DiscoveryScanner(config, projectDir, hooks);
}
