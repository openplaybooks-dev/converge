/**
 * SeedScriptRepairStrategy
 *
 * Handles gaps where a Seed script (seed.js) failed at runtime.
 * Reads the script source + error + project context, calls AI to
 * diagnose and produce a corrected script, writes it back.
 *
 * Gap kind: 'seed-script-error'
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { glob } from "glob";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { runAgent, getAgentLogDir } from "../agent-runner.ts";
import {
  computeSignature,
  lookup as repairMemoryLookup,
  record as repairMemoryRecord,
} from "../repair-memory.ts";

export class SeedScriptRepairStrategy implements FixStrategy {
  readonly name = "seed-script-repair";

  canHandle(gap: Gap): boolean {
    return gap.metadata?.gapKind === "seed-script-error";
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    const scriptPath = gap.metadata?.scriptPath as string | undefined;
    if (!scriptPath) {
      return { success: false, reason: "No scriptPath in gap metadata", shouldRetry: false };
    }

    // Resolve script path — may already be a concrete file, or a task
    // directory containing the script under a conventional layout.
    // Also check for seed/seed.js sibling pattern (sibling to parent dir, like deep-research/seed/seed.js)
    const isFile =
      scriptPath.endsWith(".js") ||
      scriptPath.endsWith(".ts") ||
      scriptPath.endsWith(".mjs") ||
      scriptPath.endsWith(".cjs") ||
      scriptPath.endsWith(".py") ||
      scriptPath.endsWith(".sh");

    // For relative paths, also try resolution against the project root —
    // matches the script-Seed executor's project-dir fallback so shared
    // tooling like `scripts/foo.py` is reachable from any task.
    const projectRel = scriptPath.startsWith("/")
      ? []
      : [join(projectDir, scriptPath)];

    const candidates = isFile
      ? [scriptPath, ...projectRel]
      : [
          join(scriptPath, "seed.js"),
          join(scriptPath, "seedData.ts"),
          join(scriptPath, "seed", "index.js"),
          join(scriptPath, "seed", "index.ts"),
          join(scriptPath, "seed", "index.mjs"),
          join(scriptPath, "seedData.mjs"),
          // Also check for sibling seed/ directory pattern (deep-research/seed/seed.js)
          join(scriptPath, "seed", "seed.js"),
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
        reason: `Seed script not found at ${scriptPath}`,
        shouldRetry: false,
      };
    }

    console.log(`   [seed-script-repair] Reading script: ${resolvedScriptPath}`);

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

    // Also collect templates that will be referenced by the Seed
    const templateFiles = await this.collectTemplateFiles(resolvedScriptPath, projectDir);

    const errorMessage =
      (gap.metadata?.errorMessage as string) ?? "Unknown error";
    const errorStack = (gap.metadata?.errorStack as string) ?? "";
    const attemptNumber = (gap.metadata?.attemptNumber as number) ?? 1;

    // ── Repair-memory short-circuit ─────────────────────────────────
    // If we've already fixed the same (script, error-tail) signature
    // in this playbook, replay the captured patch instead of paying
    // for an AI round trip. The signature is intentionally coarse —
    // siblings hitting the same root cause hash to the same key.
    const playbookName = (journalCtx?.epicId as string) || "default";
    const signature = computeSignature(resolvedScriptPath, errorMessage);
    const remembered = repairMemoryLookup(
      projectDir,
      playbookName,
      signature,
    );
    if (
      remembered &&
      remembered.lastSucceeded &&
      remembered.patch?.type === "file-replace"
    ) {
      const patchTarget = join(projectDir, remembered.patch.path);
      try {
        await writeFile(patchTarget, remembered.patch.content, "utf-8");
        console.log(
          `   [seed-script-repair] 🧠 replayed cached fix (signature=${signature}, occurrences=${remembered.occurrences})`,
        );
        repairMemoryRecord(projectDir, playbookName, {
          ...remembered,
          lastSucceeded: true,
        });
        const testResult = await this.runSelfTest(patchTarget, projectDir);
        if (testResult.success) {
          console.log(`   [seed-script-repair] cached fix self-test passed`);
          return {
            success: true,
            reason: `Seed script repaired from memory (${signature})`,
            retryMode: "full",
          };
        }
        console.log(
          `   [seed-script-repair] cached fix self-test failed (${testResult.error}) — falling through to AI repair`,
        );
      } catch (err: any) {
        console.log(
          `   [seed-script-repair] cached fix replay failed (${err.message}) — falling through to AI repair`,
        );
      }
    }

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
      `   [seed-script-repair] Calling AI to fix script (attempt ${attemptNumber})...`,
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
        label: `Fix Seed script: ${resolvedScriptPath}`,
      });
      agentSuccess = true;
      console.log(`   [seed-script-repair] AI fix applied`);
    } catch (err: any) {
      console.error(`   [seed-script-repair] AI repair failed: ${err.message}`);
      // Provider not installed — fail fast, don't retry
      if (err.message?.includes("is not installed")) {
        return { success: false, reason: err.message, shouldRetry: false };
      }
      return { success: false, reason: `AI repair failed: ${err.message}` };
    }

    // Self-test: validate the fixed script can be imported and basic context works
    if (agentSuccess) {
      console.log(`   [seed-script-repair] Running self-test validation...`);
      const testResult = await this.runSelfTest(resolvedScriptPath, projectDir);
      if (!testResult.success) {
        console.error(`   [seed-script-repair] Self-test failed: ${testResult.error}`);
        repairMemoryRecord(projectDir, playbookName, {
          signature,
          strategy: this.name,
          lastSucceeded: false,
          note: `self-test failed: ${testResult.error}`,
        });
        return { success: false, reason: `Self-test failed: ${testResult.error}` };
      }
      console.log(`   [seed-script-repair] Self-test passed`);

      // Capture the post-fix script as a replayable patch for next time.
      try {
        const fixedContent = await readFile(resolvedScriptPath, "utf-8");
        repairMemoryRecord(projectDir, playbookName, {
          signature,
          strategy: this.name,
          lastSucceeded: true,
          note: `error-tail: ${errorMessage.slice(-120)}`,
          patch: {
            type: "file-replace",
            path: relative(projectDir, resolvedScriptPath),
            content: fixedContent,
          },
        });
        console.log(
          `   [seed-script-repair] 💾 cached fix (signature=${signature})`,
        );
      } catch {
        /* memory is best-effort — never fail the repair on a bad write */
      }
    }

    return {
      success: true,
      reason: "Seed script repaired by AI",
      retryMode: "full",
    };
  }

  /**
   * Self-test validation for a fixed Seed script.
   *
   * Runs the script in a sandbox with a mock `ctx` and a captured `spawn`.
   * Pass = the script's `run()` completes without throwing AND spawns at
   * least one child. Fail = it throws, or it returns without spawning
   * (which means the Seed is silently a no-op).
   *
   * Replaces the prior pattern-matching self-test which produced false
   * positives by checking for invented requirements (specific variable
   * names, specific helper exports) the Seed doesn't actually need.
   */
  private async runSelfTest(
    scriptPath: string,
    projectDir: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Quick static checks first — cheap and catch the unambiguous bugs.
      const scriptContent = await readFile(scriptPath, "utf-8");

      // Required: an exported `run` function. Without it the runner has
      // nothing to invoke.
      const hasRunFn =
        /\bexport\s+(async\s+)?function\s+run\b/.test(scriptContent) ||
        /\bexport\s*\{\s*run\b/.test(scriptContent);
      if (!hasRunFn) {
        console.error(
          `   [self-test] FAIL: missing exported 'run' function`,
        );
        return {
          success: false,
          error: "Seed script must export a 'run' function",
        };
      }

      // Unresolved {{placeholder}} is intentional inside templates/, but
      // not at the script's top level. Allow placeholders only inside
      // string literals (the script may construct template paths that
      // contain {{prefix}} etc. — that's fine).
      // Heuristic: split on string-literal regex and only check non-string
      // segments. Cheaper safer version: skip this check entirely — sandbox
      // execution will catch any unresolved-placeholder bug as a runtime
      // error if it actually breaks anything.

      // Sandbox execution: import the script and run it with a mock ctx
      // that captures spawned children. We use a fresh module URL each
      // time so import-cache poisoning across attempts doesn't show stale
      // results.
      const cacheBuster = `?selftest=${Date.now()}.${Math.random().toString(36).slice(2)}`;
      const moduleUrl = `file://${scriptPath}${cacheBuster}`;
      let mod: { run?: (ctx: unknown) => Promise<void> | void };
      try {
        mod = await import(moduleUrl);
      } catch (e: unknown) {
        const msg = (e as Error)?.message || String(e);
        console.error(`   [self-test] FAIL: import error: ${msg}`);
        return { success: false, error: `import failed: ${msg}` };
      }

      if (typeof mod.run !== "function") {
        console.error(
          `   [self-test] FAIL: 'run' export is not a function (got ${typeof mod.run})`,
        );
        return {
          success: false,
          error: "'run' export must be a function",
        };
      }

      // Mock ctx: capture every spawn call. If the script reads files,
      // we let it — it runs against the real projectDir, which is the
      // accurate environment the real Seed execution will see.
      const spawned: Array<{ id?: string; title?: string }> = [];
      const ctx = {
        projectDir,
        spawn: async (def: unknown, opts?: unknown) => {
          // Capture whatever shape the script passes — both single-arg
          // (full task definition) and two-arg (template-ref + opts) forms.
          const obj = (opts ?? def) as { id?: string; title?: string };
          spawned.push({ id: obj?.id, title: obj?.title });
        },
        // Stub other commonly-used ctx fields with no-op defaults so the
        // script doesn't crash if it touches them.
        vars: {},
        log: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      };

      try {
        await mod.run(ctx);
      } catch (e: unknown) {
        const msg = (e as Error)?.message || String(e);
        console.error(`   [self-test] FAIL: run() threw: ${msg}`);
        return { success: false, error: `run() threw: ${msg}` };
      }

      if (spawned.length === 0) {
        console.error(
          `   [self-test] FAIL: run() completed but did not spawn any children`,
        );
        return {
          success: false,
          error: "run() did not spawn any children — Seed is a silent no-op",
        };
      }

      console.log(
        `   [self-test] OK — run() spawned ${spawned.length} task(s)`,
      );
      return { success: true };
    } catch (err: unknown) {
      const msg = (err as Error)?.message || String(err);
      return { success: false, error: msg };
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

    // Also glob for .stitch/*.json which Seed scripts commonly read
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
   * Collect template files that the Seed script references.
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
      templateSection = "\n## Seed Template Files (these use {{variables}})\n\n";
      templateSection += "IMPORTANT: These templates use {{variable}} placeholders that the Seed script must populate via `vars` when calling `ctx.spawn()`.\n\n";
      for (const f of templateFiles) {
        templateSection += `### ${f.path}\n\`\`\`markdown\n${f.content}\n\`\`\`\n\n`;
      }
    }

    let taskMdSection = "";
    if (taskMdContent) {
      taskMdSection = `\n## TASK.md (parent task)\n\`\`\`markdown\n${taskMdContent}\n\`\`\`\n`;
    }

    return `You are fixing a Seed script that failed at runtime.

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
2. Read the Seed Template Files section above — these show the {{variable}} placeholders that MUST be provided in the vars object when calling ctx.spawn().
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
