/**
 * WbsScriptRepairStrategy
 *
 * Handles gaps where a WBS script (wbs.js) failed at runtime.
 * Reads the script source + error + project context, calls AI to
 * diagnose and produce a corrected script, writes it back.
 *
 * Gap kind: 'wbs-script-error'
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { glob } from "glob";
import type { Gap } from "../../gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { runAgent, getAgentLogDir } from "../agent-runner.ts";

export class WbsScriptRepairStrategy implements FixStrategy {
  readonly name = "wbs-script-repair";

  canHandle(gap: Gap): boolean {
    return gap.metadata?.gapKind === "wbs-script-error";
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    const scriptPath = gap.metadata?.scriptPath as string | undefined;
    if (!scriptPath) {
      return { success: false, reason: "No scriptPath in gap metadata" };
    }

    // Resolve script path — may be a directory (unit.path) or a file
    const candidates =
      scriptPath.endsWith(".js") || scriptPath.endsWith(".ts")
        ? [scriptPath]
        : [join(scriptPath, "wbs.js"), join(scriptPath, "wbs.ts")];

    let resolvedScriptPath: string | undefined;
    for (const c of candidates) {
      if (existsSync(c)) {
        resolvedScriptPath = c;
        break;
      }
    }

    if (!resolvedScriptPath) {
      return {
        success: false,
        reason: `WBS script not found at ${scriptPath}`,
      };
    }

    console.log(`   [wbs-script-repair] Reading script: ${resolvedScriptPath}`);

    // Read the script source
    let scriptSource: string;
    try {
      scriptSource = await readFile(resolvedScriptPath, "utf-8");
    } catch {
      return {
        success: false,
        reason: `Cannot read script: ${resolvedScriptPath}`,
      };
    }

    // Read TASK.md frontmatter from same directory (if exists)
    const taskMdPath = join(dirname(resolvedScriptPath), "TASK.md");
    let taskMdContent = "";
    if (existsSync(taskMdPath)) {
      try {
        taskMdContent = await readFile(taskMdPath, "utf-8");
      } catch {
        /* ignore */
      }
    }

    // Collect input files referenced by the script (scan for common patterns)
    const inputFiles = await this.collectInputFiles(scriptSource, projectDir);

    const errorMessage =
      (gap.metadata?.errorMessage as string) ?? "Unknown error";
    const errorStack = (gap.metadata?.errorStack as string) ?? "";
    const attemptNumber = (gap.metadata?.attemptNumber as number) ?? 1;

    // Build AI prompt
    const prompt = this.buildPrompt({
      scriptPath: resolvedScriptPath,
      scriptSource,
      errorMessage,
      errorStack,
      taskMdContent,
      inputFiles,
      projectDir,
    });

    console.log(
      `   [wbs-script-repair] Calling AI to fix script (attempt ${attemptNumber})...`,
    );

    try {
      await runAgent({
        phase: "wbs_script_repair",
        prompt,
        agentOptions: {
          allowedTools: ["Read", "Write", "Bash", "Glob"],
          timeoutMs: 180_000,
        },
        projectDir,
        journalCtx,
        label: `Fix WBS script: ${resolvedScriptPath}`,
      });

      console.log(`   [wbs-script-repair] AI fix applied`);
      return {
        success: true,
        reason: "WBS script repaired by AI",
        retryMode: "full",
      };
    } catch (err: any) {
      console.error(`   [wbs-script-repair] AI repair failed: ${err.message}`);
      return { success: false, reason: `AI repair failed: ${err.message}` };
    }
  }

  /**
   * Scan script source for file reads (readFile, JSON.parse, require) and
   * resolve referenced project files so the AI has context.
   */
  private async collectInputFiles(
    scriptSource: string,
    projectDir: string,
  ): Promise<Array<{ path: string; content: string }>> {
    const results: Array<{ path: string; content: string }> = [];

    // Extract paths from common patterns:
    //   readFile('path'), readFileSync('path'), require('path'), JSON.parse(readFile...)
    const pathPatterns = [
      /readFile(?:Sync)?\s*\(\s*(?:join\([^)]*,\s*)?['"`]([^'"`]+)['"`]/g,
      /require\s*\(\s*['"`]\.\/([^'"`]+)['"`]\s*\)/g,
      /['"`]([^'"`]*\.(?:json|md|txt))['"`]/g,
    ];

    const seenPaths = new Set<string>();

    for (const pattern of pathPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(scriptSource)) !== null) {
        const relPath = match[1];
        if (seenPaths.has(relPath)) continue;
        seenPaths.add(relPath);

        // Try to resolve from project dir
        const candidates = [
          join(projectDir, relPath),
          join(projectDir, ".stitch", relPath),
        ];

        for (const absPath of candidates) {
          if (existsSync(absPath)) {
            try {
              const content = await readFile(absPath, "utf-8");
              // Limit to 4KB to avoid bloating the prompt
              results.push({
                path: relPath,
                content:
                  content.length > 4096
                    ? content.slice(0, 4096) + "\n...(truncated)"
                    : content,
              });
            } catch {
              /* skip unreadable */
            }
            break;
          }
        }
      }
    }

    // Also glob for .stitch/*.json which WBS scripts commonly read
    try {
      const stitchFiles = await glob("**/.stitch/*.json", {
        cwd: projectDir,
        absolute: false,
      });
      for (const f of stitchFiles.slice(0, 5)) {
        if (seenPaths.has(f)) continue;
        seenPaths.add(f);
        try {
          const content = await readFile(join(projectDir, f), "utf-8");
          results.push({
            path: f,
            content:
              content.length > 4096
                ? content.slice(0, 4096) + "\n...(truncated)"
                : content,
          });
        } catch {
          /* skip */
        }
      }
    } catch {
      /* glob failed, skip */
    }

    return results;
  }

  private buildPrompt(opts: {
    scriptPath: string;
    scriptSource: string;
    errorMessage: string;
    errorStack: string;
    taskMdContent: string;
    inputFiles: Array<{ path: string; content: string }>;
    projectDir: string;
  }): string {
    const {
      scriptPath,
      scriptSource,
      errorMessage,
      errorStack,
      taskMdContent,
      inputFiles,
      projectDir,
    } = opts;

    let inputSection = "";
    if (inputFiles.length > 0) {
      inputSection = "\n## Referenced Project Files\n\n";
      for (const f of inputFiles) {
        inputSection += `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
      }
    }

    let taskMdSection = "";
    if (taskMdContent) {
      taskMdSection = `\n## TASK.md (parent task)\n\`\`\`markdown\n${taskMdContent}\n\`\`\`\n`;
    }

    return `You are fixing a WBS script that failed at runtime.

## Project Directory
${projectDir}

## Failed Script
Path: ${scriptPath}

\`\`\`javascript
${scriptSource}
\`\`\`

## Error
\`\`\`
${errorMessage}

${errorStack}
\`\`\`
${taskMdSection}${inputSection}
## Instructions

1. Read the script source and the error carefully.
2. Use the Read and Glob tools to inspect any additional project files if needed.
3. Diagnose the root cause of the runtime error.
4. Write the corrected script back to: ${scriptPath}
   - Use the Write tool to write the complete fixed file.
   - The script must be valid JavaScript/ESM.
   - Preserve the original intent and structure.
   - Only fix what caused the error — do not refactor or add features.
5. If the error is caused by missing data files, handle the missing case gracefully
   (e.g., use empty defaults, skip missing entries, log warnings).

IMPORTANT: You MUST write the fixed script using the Write tool. Do not just explain the fix.`;
  }
}
