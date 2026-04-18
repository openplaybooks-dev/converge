/**
 * MissingInputPatternRepairStrategy
 *
 * Detects and fixes glob pattern mismatches in task input declarations.
 *
 * Common scenarios:
 *   - Pattern too restrictive: designs slash star.html vs designs slash star slash design.html
 *   - Missing directory level: src slash star.ts vs src slash components slash star.ts
 *   - Wrong wildcard depth: double-star slash star.html needed instead of star.html
 *   - Case sensitivity: assets slash Images slash star.png vs assets slash images slash star.png
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

import { join } from "node:path";
import type { Gap } from "../../gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { logTaskEvent } from "../../journal/writer.ts";

/* ------------------------------------------------------------------ */
/*  MissingInputPatternRepairStrategy                                */
/* ------------------------------------------------------------------ */

export class MissingInputPatternRepairStrategy implements FixStrategy {
  readonly name = "missing-input-pattern";
  readonly description =
    "Detects glob pattern mismatches and suggests corrections";
  readonly priority = 8.5;

  canHandle(gap: Gap): boolean {
    // Only handle missing-dependency/blocker gaps with glob patterns
    return (
      (gap.metadata?.gapKind === "blocker" ||
        gap.metadata?.gapKind === "input") &&
      gap.metadata?.missingInputs !== undefined &&
      Array.isArray(gap.metadata.missingInputs) &&
      gap.metadata.missingInputs.some((input: string) => input.includes("*"))
    );
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   🔍 Checking for glob pattern mismatches...`);

    try {
      const missingInputs = gap.metadata?.missingInputs as string[] | undefined;
      if (!missingInputs) {
        return {
          success: false,
          reason: "No missingInputs in gap metadata",
          shouldRetry: false,
        };
      }
      const globPatterns = missingInputs.filter((input) => input.includes("*"));

      if (globPatterns.length === 0) {
        return {
          success: false,
          reason: "No glob patterns found in missing inputs",
          shouldRetry: false,
        };
      }

      // Try to find files with pattern variations for each glob
      for (const pattern of globPatterns) {
        console.log(`   📐 Testing pattern variations for: ${pattern}`);

        const variations = this.generatePatternVariations(pattern);
        const { glob } = await import("glob");

        for (const variant of variations) {
          const matches = await glob(variant, { cwd: projectDir });

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
              ctx,
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
  /*  AI-Powered Auto-Fix                                              */
  /* ------------------------------------------------------------------ */

  private async autoFixPattern(
    originalPattern: string,
    correctedPattern: string,
    projectDir: string,
    journalCtx: { epicId: string; taskId: string },
    ctx: StrategyContext,
  ): Promise<void> {
    const { readFile, writeFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const { existsSync } = await import("node:fs");

    // Find the task file (SKILL.md or task.ts)
    const taskDir = join(
      projectDir,
      ".converge",
      "epics",
      journalCtx.epicId,
      journalCtx.taskId,
    );
    const skillPath = join(taskDir, "SKILL.md");
    const taskPath = join(taskDir, "task.ts");

    let targetPath: string;
    let content: string;

    if (existsSync(skillPath)) {
      targetPath = skillPath;
      content = await readFile(skillPath, "utf-8");
    } else if (existsSync(taskPath)) {
      targetPath = taskPath;
      content = await readFile(taskPath, "utf-8");
    } else {
      console.log(`   ⚠️  Could not find task file to auto-fix`);
      return;
    }

    // Use AI to fix the pattern intelligently
    if (!ctx.ai) {
      console.log(`   ⚠️  AI context not available, using programmatic fix`);
      // Fallback to simple replacement
      const updatedContent = content.replace(
        new RegExp(originalPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        correctedPattern,
      );
      if (updatedContent !== content) {
        await writeFile(targetPath, updatedContent, "utf-8");
        console.log(`   🔧 Auto-fixed pattern (programmatic): ${targetPath}`);
      }
      return;
    }

    console.log(`   🤖 Using AI to fix pattern mismatch...`);

    const aiContext = ctx.ai();
    const fixPrompt = `You are fixing a glob pattern mismatch in a task definition file.

PROBLEM:
- Current pattern: "${originalPattern}"
- Actual files exist matching: "${correctedPattern}"
- The pattern needs to be updated to match the real file structure

FILE TO FIX:
${targetPath}

CURRENT FILE CONTENT:
\`\`\`
${content}
\`\`\`

TASK:
Update the file to use the corrected pattern "${correctedPattern}" instead of "${originalPattern}".

IMPORTANT RULES:
1. ONLY change the pattern string - preserve everything else exactly
2. Handle both YAML array format (inputs: - "pattern") and TypeScript (.inputs(['pattern']))
3. If the pattern appears multiple times, update ALL occurrences
4. Preserve exact formatting, indentation, and whitespace
5. Return ONLY the complete updated file content, nothing else

OUTPUT:
Return the complete fixed file content as a single code block.`;

    try {
      const fixedContent = (await aiContext.ask(fixPrompt)).asText();

      // Extract code block if AI wrapped it
      let finalContent = fixedContent;
      const codeBlockMatch = fixedContent.match(
        /```(?:typescript|yaml|md)?\n([\s\S]*?)\n```/,
      );
      if (codeBlockMatch) {
        finalContent = codeBlockMatch[1];
      }

      // Write the fixed content
      await writeFile(targetPath, finalContent, "utf-8");
      console.log(`   🔧 AI-fixed pattern in: ${targetPath}`);
      console.log(`      "${originalPattern}" → "${correctedPattern}"`);
    } catch (error: any) {
      console.error(`   ❌ AI fix failed: ${error.message}`);
      console.log(`   🔄 Falling back to programmatic fix...`);

      // Fallback to regex replacement
      const updatedContent = content.replace(
        new RegExp(originalPattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
        correctedPattern,
      );
      if (updatedContent !== content) {
        await writeFile(targetPath, updatedContent, "utf-8");
        console.log(`   🔧 Auto-fixed pattern (fallback): ${targetPath}`);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Pattern Variation Generation                                     */
  /* ------------------------------------------------------------------ */

  private generatePatternVariations(pattern: string): string[] {
    const variations: string[] = [];

    // Variation 1: Add one directory level with wildcard
    // .stitch/designs/*.html → .stitch/designs/*/*.html
    if (pattern.includes("/*.")) {
      const oneDeeper = pattern.replace(/\/\*\./, "/*/*.");
      if (oneDeeper !== pattern) {
        variations.push(oneDeeper);
      }
    }

    // Variation 2: Add specific common filename
    // .stitch/designs/*.html → .stitch/designs/*/design.html
    if (pattern.includes("/*.html")) {
      variations.push(pattern.replace("/*.html", "/*/design.html"));
      variations.push(pattern.replace("/*.html", "/*/index.html"));
    }
    if (pattern.includes("/*.tsx")) {
      variations.push(pattern.replace("/*.tsx", "/*/index.tsx"));
    }
    if (pattern.includes("/*.ts")) {
      variations.push(pattern.replace("/*.ts", "/*/index.ts"));
    }

    // Variation 3: Use recursive wildcard
    // .stitch/designs/*.html → .stitch/designs/**/*.html
    const parts = pattern.split("/");
    if (parts.length > 1 && !pattern.includes("**")) {
      const dir = parts.slice(0, -1).join("/");
      const file = parts[parts.length - 1];
      variations.push(`${dir}/**/${file}`);
    }

    // Variation 4: Remove one directory level
    // .stitch/designs/screens/*.html → .stitch/designs/*.html
    const dirParts = pattern.split("/");
    if (dirParts.length > 2) {
      const shallower = [...dirParts];
      shallower.splice(-2, 1); // Remove second-to-last component
      const shallowerPattern = shallower.join("/");
      if (shallowerPattern !== pattern) {
        variations.push(shallowerPattern);
      }
    }

    // Variation 5: Case variations for each path component
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
