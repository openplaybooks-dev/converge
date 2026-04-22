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

    // Resolve script path — may already be a concrete file, or a task
    // directory containing the script under a conventional layout.
    const candidates =
      scriptPath.endsWith(".js") ||
      scriptPath.endsWith(".ts") ||
      scriptPath.endsWith(".mjs") ||
      scriptPath.endsWith(".cjs")
        ? [scriptPath]
        : [
            join(scriptPath, "wbs.js"),
            join(scriptPath, "wbs.ts"),
            join(scriptPath, "wbs", "index.js"),
            join(scriptPath, "wbs", "index.ts"),
            join(scriptPath, "wbs", "index.mjs"),
            join(scriptPath, "wbs.mjs"),
          ];

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

    // Also collect templates that will be referenced by the WBS
    const templateFiles = await this.collectTemplateFiles(resolvedScriptPath, projectDir);

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
      templateFiles,
      projectDir,
    });

    console.log(
      `   [wbs-script-repair] Calling AI to fix script (attempt ${attemptNumber})...`,
    );

    let agentSuccess = false;
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
      agentSuccess = true;
      console.log(`   [wbs-script-repair] AI fix applied`);
    } catch (err: any) {
      console.error(`   [wbs-script-repair] AI repair failed: ${err.message}`);
      return { success: false, reason: `AI repair failed: ${err.message}` };
    }

    // Self-test: validate the fixed script can be imported and basic context works
    if (agentSuccess) {
      console.log(`   [wbs-script-repair] Running self-test validation...`);
      const testResult = await this.runSelfTest(resolvedScriptPath, projectDir);
      if (!testResult.success) {
        console.error(`   [wbs-script-repair] Self-test failed: ${testResult.error}`);
        return { success: false, reason: `Self-test failed: ${testResult.error}` };
      }
      console.log(`   [wbs-script-repair] Self-test passed`);
    }

    return {
      success: true,
      reason: "WBS script repaired by AI",
      retryMode: "full",
    };
  }

  /**
   * Self-test validation for fixed WBS script.
   * Validates the script without executing it — checks placeholders, syntax,
   * required exports, and referenced helper functions.
   */
  private async runSelfTest(
    scriptPath: string,
    projectDir: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const scriptContent = await readFile(scriptPath, "utf-8");
      const { existsSync } = await import("fs");

      const checks: Array<{ name: string; pass: boolean; msg: string }> = [];

      // Check 1: No unresolved template placeholders
      const placeholderMatch = scriptContent.match(/\{\{[^}]*\}\}/);
      checks.push({
        name: "no-placeholders",
        pass: !placeholderMatch,
        msg: placeholderMatch
          ? `Unresolved placeholder: ${placeholderMatch[0]}`
          : "OK",
      });

      // Check 2: Has required run function
      const hasRunFn = scriptContent.includes("export async function run") ||
                       scriptContent.includes("export function run");
      checks.push({
        name: "has-run-fn",
        pass: hasRunFn,
        msg: hasRunFn ? "OK" : "Missing 'export async function run'",
      });

      // Check 3: Expected vars are referenced in code (not just comments)
      const codeOnly = scriptContent.split("//")[0].split("/*")[0];
      for (const v of ["featureId", "featureTitle"]) {
        const varPattern = new RegExp(`\\b${v}\\b`);
        const found = varPattern.test(codeOnly);
        checks.push({
          name: `var-${v}`,
          pass: found,
          msg: found ? `OK` : `Variable '${v}' not found in code`,
        });
      }

      // Check 4: helpers.js has joinPaths if script references it
      const helpersPath = join(dirname(scriptPath), "helpers.js");
      if (existsSync(helpersPath) && scriptContent.includes("./helpers")) {
        const helpersContent = await readFile(helpersPath, "utf-8");
        checks.push({
          name: "helpers-joinPaths",
          pass: helpersContent.includes("joinPaths"),
          msg: helpersContent.includes("joinPaths") ? "OK" : "helpers.js missing joinPaths",
        });
      }

      // Check 5: JavaScript syntax validity
      let syntaxOk = false;
      try {
        new Function(scriptContent);
        syntaxOk = true;
      } catch (e: any) {
        checks.push({
          name: "syntax",
          pass: false,
          msg: `Syntax error: ${e.message}`,
        });
      }
      if (syntaxOk) {
        checks.push({ name: "syntax", pass: true, msg: "OK" });
      }

      // Report failures
      for (const check of checks) {
        if (!check.pass) {
          console.error(`   [self-test] FAIL: ${check.name} - ${check.msg}`);
        }
      }

      const failed = checks.filter(c => !c.pass);
      if (failed.length > 0) {
        return {
          success: false,
          error: failed.map(c => `${c.name}: ${c.msg}`).join("; "),
        };
      }

      console.log(`   [self-test] All ${checks.length} checks passed`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
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

  /**
   * Collect template files that the WBS script references.
   * This ensures the AI sees the templates that will be spawned with {{vars}}.
   */
  private async collectTemplateFiles(
    scriptPath: string,
    projectDir: string,
  ): Promise<Array<{ path: string; content: string }>> {
    const results: Array<{ path: string; content: string }> = [];
    const scriptContent = await readFile(scriptPath, "utf-8");

    // Find TEMPLATE_BASE path construction
    const templateBaseMatch = scriptContent.match(/TEMPLATE_BASE\s*=\s*([^;]+)/);
    if (!templateBaseMatch) return results;

    // Try to resolve the template base directory
    const scriptDir = dirname(scriptPath);
    const templateRelPath = templateBaseMatch[1]
      .replace(/join\([^)]+\)/g, "templates")
      .replace(/relative\([^)]+\)/g, "")
      .replace(/['""]/g, "")
      .trim();

    // Glob for all TASK.md templates under the template directory
    const templateDir = join(scriptDir, "templates", "feature");
    if (!existsSync(templateDir)) return results;

    try {
      const templateFiles = await glob("**/TASK.md", {
        cwd: templateDir,
        absolute: true,
      });

      for (const tf of templateFiles) {
        try {
          const content = await readFile(tf, "utf-8");
          const relPath = relative(projectDir, tf);
          results.push({
            path: relPath,
            content:
              content.length > 6144
                ? content.slice(0, 6144) + "\n...(truncated)"
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
    templateFiles: Array<{ path: string; content: string }>;
    projectDir: string;
  }): string {
    const {
      scriptPath,
      scriptSource,
      errorMessage,
      errorStack,
      taskMdContent,
      inputFiles,
      templateFiles,
      projectDir,
    } = opts;

    let inputSection = "";
    if (inputFiles.length > 0) {
      inputSection = "\n## Referenced Project Files\n\n";
      for (const f of inputFiles) {
        inputSection += `### ${f.path}\n\`\`\`\n${f.content}\n\`\`\`\n\n`;
      }
    }

    let templateSection = "";
    if (templateFiles.length > 0) {
      templateSection = "\n## WBS Template Files (these use {{variables}})\n\n";
      templateSection += "IMPORTANT: These templates use {{variable}} placeholders that the WBS script must populate via `vars` when calling `ctx.spawn()`.\n\n";
      for (const f of templateFiles) {
        templateSection += `### ${f.path}\n\`\`\`markdown\n${f.content}\n\`\`\`\n\n`;
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
${taskMdSection}${templateSection}${inputSection}
## Instructions

1. Read the script source and the error carefully.
2. Read the WBS Template Files section above — these show the {{variable}} placeholders that MUST be provided in the vars object when calling ctx.spawn().
3. Diagnose the root cause — the error "Available vars: X, Y, Z" means the script's vars object is missing some variables that the template references.
4. Fix the vars object in the script to include ALL variables that the templates use (e.g., featurePath, routePaths, stepDeps).
5. Write the corrected script back to: ${scriptPath}
   - Use the Write tool to write the complete fixed file.
   - The script must be valid JavaScript/ESM.
   - The vars object passed to ctx.spawn() must include ALL variables referenced in the template TASK.md files.
   - If a variable is optional, provide a sensible default (empty string, empty array, etc.).

IMPORTANT: You MUST write the fixed script using the Write tool. Do not just explain the fix.`;
  }
}
