/**
 * MissingInputPatternRepairStrategy
 *
 * Detects and fixes glob pattern mismatches in task input declarations.
 *
 * Common scenarios (all handled generically — no project-specific names):
 *   - Pattern too restrictive, missing directory level, wrong wildcard
 *     depth, case-sensitive segments, and directory renames recovered via
 *     real on-disk sibling enumeration.
 *
 * Strategy:
 *   1. Detect gaps caused by glob pattern mismatches (not missing files)
 *   2. Generate pattern variations (deeper/shallower wildcards)
 *   3. Test variations against filesystem
 *   4. Suggest corrected pattern or delegate to DependencyBackoffStrategy
 *
 * Priority: 8.5 (between DependencyBackoff[9] and ToolEnvironment[8])
 * Why: Runs after dependency detection but before execution-level fixes
 */

import { join, dirname, basename } from "node:path";
import { existsSync, readdirSync, statSync } from "node:fs";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { logTaskEvent } from "../../../journal/writer.ts";
import { getSourceTaskDirs } from "../../../task/playbook/paths.ts";

/* ------------------------------------------------------------------ */
/*  MissingInputPatternRepairStrategy                                */
/* ------------------------------------------------------------------ */

export class MissingInputPatternRepairStrategy implements FixStrategy {
  readonly name = "missing-input-pattern";
  readonly description =
    "Detects glob pattern mismatches and suggests corrections";
  readonly priority = 8.5;

  canHandle(gap: Gap): boolean {
    // Accept glob patterns AND bare paths — directory renames without a
    // wildcard (e.g. a segment renamed between declaration and disk) are
    // still recoverable via case flips and real on-disk sibling probes.
    return (
      (gap.metadata?.gapKind === "blocker" ||
        gap.metadata?.gapKind === "input") &&
      Array.isArray(gap.metadata?.missingInputs) &&
      (gap.metadata.missingInputs as unknown[]).length > 0
    );
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   🔍 Checking for glob pattern mismatches...`);

    try {
      const missingInputs = gap.metadata?.missingInputs as string[] | undefined;
      if (!missingInputs || missingInputs.length === 0) {
        return {
          success: false,
          reason: "No missingInputs in gap metadata",
          shouldRetry: false,
        };
      }

      // Probe every missing input — globs get pattern-shape variations,
      // bare directory/file paths get sibling-directory + case variations.
      for (const pattern of missingInputs) {
        if (typeof pattern !== "string") continue;
        console.log(`   📐 Testing pattern variations for: ${pattern}`);

        const variations = this.generatePatternVariations(pattern);
        // Bare paths (no wildcard) also get real on-disk sibling candidates.
        if (!pattern.includes("*")) {
          variations.push(...(await this.probeSiblings(pattern, projectDir)));
        }
        const { glob } = await import("glob");

        for (const variant of variations) {
          // For bare paths, existsSync is authoritative; glob would only
          // expand wildcards and skip literal directory matches.
          const matches = variant.includes("*")
            ? await glob(variant, { cwd: projectDir })
            : existsSync(join(projectDir, variant))
              ? [variant]
              : [];

          if (matches.length > 0) {
            // Found files with alternate pattern!
            const reason = `Found ${matches.length} file(s) with pattern: ${variant} (original: ${pattern})`;
            console.log(`   ✅ ${reason}`);
            console.log(
              `      Files: ${matches.slice(0, 3).join(", ")}${matches.length > 3 ? "..." : ""}`,
            );

            // Auto-fix: Update the SKILL.md or task.ts file with corrected pattern
            await this.autoFixPattern(
              pattern,
              variant,
              projectDir,
              journalCtx,
              gap,
            );

            await logTaskEvent(
              projectDir,
              journalCtx.epicId,
              journalCtx.taskId,
              "PATTERN_AUTO_FIXED",
              `Auto-fixed pattern: "${pattern}" → "${variant}"`,
              {
                strategyName: this.name,
                originalPattern: pattern,
                suggestedPattern: variant,
                matchedFiles: matches,
              },
            );

            return {
              success: true,
              reason: `Auto-fixed pattern mismatch: "${pattern}" → "${variant}"`,
              retryMode: "full", // Retry task with fixed pattern
              metadata: {
                patternFix: {
                  type: "update-input-pattern",
                  originalPattern: pattern,
                  suggestedPattern: variant,
                  matchedFiles: matches,
                  autoFixed: true,
                },
              },
            };
          }
        }
      }

      // No files found with any variation → might be missing files (not pattern issue)
      console.log(`   ⚠️  No files match pattern variations`);

      return {
        success: false,
        reason:
          "No files match pattern or variations - files may not exist yet",
        shouldRetry: false,
        metadata: {
          hint: "Consider running upstream tasks to generate missing files",
        },
      };
    } catch (err: any) {
      console.error(`   ❌ Strategy failed:`, err.message);
      return {
        success: false,
        reason: `Pattern matching failed: ${err.message}`,
        shouldRetry: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Auto-Fix Pattern                                                 */
  /* ------------------------------------------------------------------ */

  private async autoFixPattern(
    originalPattern: string,
    correctedPattern: string,
    projectDir: string,
    journalCtx: { epicId: string; taskId: string },
    gap?: Gap,
  ): Promise<void> {
    const { readFile, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { existsSync } = await import("node:fs");

    let targetPath: string | undefined;
    let content: string | undefined;

    // Prefer the absolute TASK.md path stashed on the gap by task-runner —
    // it dodges all the epicId/taskId path-reconstruction footguns.
    const sourceTaskFile =
      typeof gap?.metadata?.sourceTaskFile === "string"
        ? (gap.metadata.sourceTaskFile as string)
        : undefined;
    if (sourceTaskFile && existsSync(sourceTaskFile)) {
      targetPath = sourceTaskFile;
      content = await readFile(sourceTaskFile, "utf-8");
    }

    // Fallback: probe both source-dir shapes and both layout conventions.
    if (!targetPath) {
      const sourceDirs = getSourceTaskDirs(projectDir);
      const filenames = ["TASK.md", "SKILL.md", "task.ts"];
      const rawTaskId = journalCtx.taskId.startsWith(journalCtx.epicId + "/")
        ? journalCtx.taskId.slice(journalCtx.epicId.length + 1)
        : journalCtx.taskId;
      const segments = rawTaskId.split("/").filter(Boolean);
      const flat = [...segments];
      const seedData = segments.length > 0 ? [segments[0]] : [];
      for (let i = 1; i < segments.length; i++) seedData.push("tasks", segments[i]);
      const layouts = segments.length > 1 ? [flat, seedData] : [flat];

      outer: for (const sourceDir of sourceDirs) {
        const sourceDirNorm = sourceDir.replace(/\\/g, "/");
        const endsWithEpic = sourceDirNorm.endsWith(
          `/${journalCtx.epicId}/tasks`,
        );
        const prefixes: string[][] = endsWithEpic
          ? [[]]
          : [[], [journalCtx.epicId]];
        for (const prefix of prefixes) {
          for (const layout of layouts) {
            const taskDir = join(sourceDir, ...prefix, ...layout);
            for (const filename of filenames) {
              const candidate = join(taskDir, filename);
              if (existsSync(candidate)) {
                targetPath = candidate;
                content = await readFile(candidate, "utf-8");
                break outer;
              }
            }
          }
        }
      }
    }

    if (!targetPath || !content) {
      console.log(`   ⚠️  Could not find task file to auto-fix`);
      return;
    }

    // Programmatic find-and-replace — no AI needed for a simple string swap.
    const updatedContent = content.replace(
      new RegExp(originalPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
      correctedPattern,
    );
    if (updatedContent !== content) {
      await writeFile(targetPath, updatedContent, "utf-8");
      console.log(`   🔧 Auto-fixed pattern in: ${targetPath}`);
      console.log(`      "${originalPattern}" → "${correctedPattern}"`);
    } else {
      console.log(`   ⚠️  Pattern "${originalPattern}" not found in ${targetPath}`);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Sibling Probing (bare paths only)                                 */
  /* ------------------------------------------------------------------ */

  /**
   * For a bare path whose final segment does not exist on disk, enumerate
   * real siblings of the first missing segment and return candidate
   * replacement paths. Catches directory renames that static heuristics
   * miss, without hard-coding any project-specific names.
   */
  private async probeSiblings(
    pattern: string,
    projectDir: string,
  ): Promise<string[]> {
    const candidates: string[] = [];
    const parts = pattern.split("/").filter(Boolean);
    if (parts.length === 0) return candidates;

    // Walk from the deepest segment outward: whichever segment is the
    // first non-existent one, that's the rename candidate.
    for (let depth = parts.length; depth > 0; depth--) {
      const parentParts = parts.slice(0, depth - 1);
      const missingSegment = parts[depth - 1];
      const parentAbs = join(projectDir, ...parentParts);
      if (!existsSync(parentAbs)) continue;
      try {
        if (!statSync(parentAbs).isDirectory()) continue;
      } catch {
        continue;
      }
      const missingExists = existsSync(join(parentAbs, missingSegment));
      if (missingExists) continue; // this level is fine — look deeper/shallower

      let siblings: string[];
      try {
        siblings = readdirSync(parentAbs);
      } catch {
        continue;
      }
      for (const sibling of siblings) {
        if (sibling === missingSegment) continue;
        try {
          if (!statSync(join(parentAbs, sibling)).isDirectory()) continue;
        } catch {
          continue;
        }
        const rebuilt = [
          ...parentParts,
          sibling,
          ...parts.slice(depth),
        ].join("/");
        candidates.push(rebuilt);
      }
      // Only probe the first broken level — deeper levels are irrelevant
      // once we found the one that diverges.
      break;
    }
    return candidates;
  }

  /* ------------------------------------------------------------------ */
  /*  Pattern Variation Generation                                     */
  /* ------------------------------------------------------------------ */

  private generatePatternVariations(pattern: string): string[] {
    const variations: string[] = [];

    // Variation 1: Add one directory level with a wildcard.
    //   dir/*.ext → dir/*/*.ext
    if (pattern.includes("/*.")) {
      const oneDeeper = pattern.replace(/\/\*\./, "/*/*.");
      if (oneDeeper !== pattern) {
        variations.push(oneDeeper);
      }
    }

    // Variation 2: Widen file wildcard to "**".
    //   dir/*.ext → dir/**/*.ext
    // This covers renamed-filename cases generically without the framework
    // hard-coding any project-specific filename conventions.
    const parts = pattern.split("/");
    if (parts.length > 1 && !pattern.includes("**")) {
      const dir = parts.slice(0, -1).join("/");
      const file = parts[parts.length - 1];
      variations.push(`${dir}/**/${file}`);
    }

    // Variation 3: Remove one directory level.
    //   dir/sub/*.ext → dir/*.ext
    const dirParts = pattern.split("/");
    if (dirParts.length > 2) {
      const shallower = [...dirParts];
      shallower.splice(-2, 1); // Remove second-to-last component
      const shallowerPattern = shallower.join("/");
      if (shallowerPattern !== pattern) {
        variations.push(shallowerPattern);
      }
    }

    // Variation 4: Case variations for each path component.
    const caseVariants = this.generateCaseVariations(pattern);
    variations.push(...caseVariants);

    // Deduplicate and filter out the original pattern
    return [...new Set(variations)].filter((v) => v !== pattern);
  }

  private generateCaseVariations(pattern: string): string[] {
    const variations: string[] = [];
    const parts = pattern.split("/");

    // Try toggling case of each non-wildcard component
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (
        part.length === 0 ||
        part.includes("*") ||
        part === "." ||
        part === ".."
      ) {
        continue;
      }

      // Toggle first letter case
      const toggled = this.toggleFirstChar(part);
      if (toggled !== part) {
        const variant = [...parts];
        variant[i] = toggled;
        variations.push(variant.join("/"));
      }

      // Try all lowercase
      if (part !== part.toLowerCase()) {
        const variant = [...parts];
        variant[i] = part.toLowerCase();
        variations.push(variant.join("/"));
      }

      // Try all uppercase
      if (part !== part.toUpperCase()) {
        const variant = [...parts];
        variant[i] = part.toUpperCase();
        variations.push(variant.join("/"));
      }
    }

    return variations;
  }

  private toggleFirstChar(str: string): string {
    if (str.length === 0) return str;
    const first = str[0];
    const toggled =
      first === first.toUpperCase() ? first.toLowerCase() : first.toUpperCase();
    return toggled + str.slice(1);
  }
}
