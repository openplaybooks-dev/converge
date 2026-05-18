/**
 * SeedGeneratorRepairStrategy
 *
 * Fixes root cause in Seed generators when multiple tasks fail with the same pattern.
 * This strategy detects systemic issues and repairs the generator code directly.
 *
 * Use case:
 *   - Multiple tasks spawned by same Seed have identical gap types
 *   - Root cause is in the generator's task.ts code (e.g., hardcoded wrong paths)
 *   - Fixing individual tasks won't prevent future failures
 *
 * Approach:
 *   1. Detect pattern: 2+ related tasks with same gap type
 *   2. AI analyzes Seed generator code
 *   3. AI generates corrected generator code
 *   4. Apply fix and regenerate affected tasks
 */

import { z } from "zod";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Gap } from "../../../task/gap/types.ts";
import type {
  FixStrategy,
  StrategyContext,
  StrategyOutcome,
} from "../types.ts";
import { createAIContext } from "../../../ai/context.ts";
import { createFilesystemHelper } from "../helpers/filesystem.ts";
import { logTaskEvent } from "../../../journal/writer.ts";

/* ------------------------------------------------------------------ */
/*  Schemas                                                           */
/* ------------------------------------------------------------------ */

const GeneratorDiagnosisSchema = z.object({
  isGeneratorBug: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  reasoning: z.string(),
  bugLocation: z.string().describe("Line number or code section in generator"),
  suggestedFix: z.string().describe("Code changes needed"),
  affectedTasks: z.array(z.string()).describe("Task IDs that will be fixed"),
});

type GeneratorDiagnosis = z.infer<typeof GeneratorDiagnosisSchema>;

/* ------------------------------------------------------------------ */
/*  SeedGeneratorRepairStrategy                                       */
/* ------------------------------------------------------------------ */

export class SeedGeneratorRepairStrategy implements FixStrategy {
  readonly name = "seed-generator-repair";
  readonly description =
    "Fixes Seed generators that spawn tasks with incorrect definitions";
  readonly priority = 10; // High priority - fixes root cause

  canHandle(gap: Gap): boolean {
    // Only apply when gap metadata indicates systemic issue
    return gap.metadata?.isSystemicIssue === true;
  }

  async tryFix(gap: Gap, ctx: StrategyContext): Promise<StrategyOutcome> {
    const { projectDir, journalCtx } = ctx;

    console.log(`   🔍 Analyzing Seed generator for systemic issue...`);

    try {
      // Initialize helpers
      const ai = createAIContext(projectDir, journalCtx);
      const filesystem = createFilesystemHelper(projectDir);

      // Get generator path from gap metadata
      const generatorPath = gap.metadata?.seedGeneratorPath as string;
      if (!generatorPath) {
        return {
          success: false,
          reason: "No Seed generator path in gap metadata",
          shouldRetry: false,
        };
      }

      const fullGeneratorPath = join(projectDir, generatorPath);
      if (!existsSync(fullGeneratorPath)) {
        return {
          success: false,
          reason: `Seed generator not found: ${generatorPath}`,
          shouldRetry: false,
        };
      }

      // Read generator code
      const generatorCode = await filesystem.readFile(fullGeneratorPath);

      // Get related gaps from metadata
      const relatedGaps = (gap.metadata?.relatedGaps as any[]) || [];

      // PHASE 1: Diagnose if this is a generator bug
      console.log(`   🧠 AI analyzing generator code...`);
      const diagnosis = await this.diagnose(
        gap,
        generatorCode,
        generatorPath,
        relatedGaps,
        ai,
      );

      if (!diagnosis.isGeneratorBug) {
        console.log(`   ↩  Not a generator bug: ${diagnosis.reasoning}`);
        return {
          success: false,
          reason: diagnosis.reasoning,
          shouldRetry: false,
        };
      }

      if (diagnosis.confidence === "low") {
        console.log(`   ⚠️  Low confidence diagnosis, skipping for safety`);
        return {
          success: false,
          reason: `Low confidence generator diagnosis: ${diagnosis.reasoning}`,
          shouldRetry: false,
        };
      }

      // PHASE 2: Generate fix
      console.log(`   🔧 Generating fixed generator code...`);
      let fixedCode = await this.generateFix(
        generatorCode,
        generatorPath,
        diagnosis,
        ai,
      );

      // Clean up the code - remove any explanatory text before the first import
      const importMatch = fixedCode.match(/(import\s+[\s\S]*)/);
      if (importMatch) {
        fixedCode = importMatch[1];
      }

      // PHASE 3: Apply fix
      console.log(`   💾 Applying fix to generator...`);
      await filesystem.writeFile(fullGeneratorPath, fixedCode);

      // PHASE 4: Regenerate affected tasks
      console.log(
        `   🔄 Regenerating ${diagnosis.affectedTasks.length} affected tasks...`,
      );
      await this.regenerateAffectedTasks(
        diagnosis.affectedTasks,
        ctx,
        filesystem,
      );

      // Log success
      await logTaskEvent(
        projectDir,
        journalCtx.epicId,
        journalCtx.taskId,
        "Seed_GENERATOR_FIXED",
        `Fixed Seed generator and regenerated ${diagnosis.affectedTasks.length} tasks`,
        {
          strategyName: this.name,
          generatorPath,
          bugLocation: diagnosis.bugLocation,
          affectedTasks: diagnosis.affectedTasks,
        },
      );

      // Extract parent task ID from generator path
      // Path is like: .converge/epics/03-implement-app/002-generate-react-pages/task.ts
      // We want: 002-generate-react-pages
      const pathParts = generatorPath.split("/");
      const parentTaskId = pathParts[pathParts.length - 2]; // Get directory before task.ts

      return {
        success: true,
        reason: `Fixed Seed generator and regenerated ${diagnosis.affectedTasks.length} tasks`,
        retryMode: {
          type: "backoff",
          runFirst: [parentTaskId],
          reason: `Parent Seed task ${parentTaskId} needs to rerun to regenerate child tasks with fixed code`,
        },
        metadata: {
          fixedFile: generatorPath,
          regeneratedTasks: diagnosis.affectedTasks,
          parentTaskId,
        },
      };
    } catch (err: any) {
      console.error(`   ❌ Strategy failed:`, err.message);
      return {
        success: false,
        reason: `Generator repair failed: ${err.message}`,
        shouldRetry: false,
      };
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Diagnosis                                                         */
  /* ------------------------------------------------------------------ */

  private async diagnose(
    gap: Gap,
    generatorCode: string,
    generatorPath: string,
    relatedGaps: any[],
    ai: ReturnType<typeof createAIContext>,
  ): Promise<GeneratorDiagnosis> {
    const prompt = `You are analyzing a Seed generator for potential bugs.

**Gap Details:**
${JSON.stringify(gap, null, 2)}

**Related Tasks:** (all spawned by same Seed generator)
${relatedGaps.map((g) => `- ${g.taskId}: ${g.description}`).join("\n")}

**Seed Generator Code:**
\`\`\`typescript
${generatorCode}
\`\`\`

**Question:**
Is this gap caused by a bug in the Seed generator itself?

Analyze:
1. Do multiple spawned tasks have the same type of gap?
2. Does the generator hardcode assumptions that are wrong?
3. Would fixing the generator prevent future tasks from failing?

Return JSON:
\`\`\`json
{
  "isGeneratorBug": true,
  "confidence": "high",
  "reasoning": "The generator hardcodes flat file paths in outputs[] but Stitch CLI outputs to directory structure. All 3 spawned tasks have identical output path mismatch.",
  "bugLocation": "Line 45: .outputs(['.stitch/designs/\${screenId}.html'])",
  "suggestedFix": "Change to: .outputs(['.stitch/designs/\${screenId}/design.html'])",
  "affectedTasks": ["003-001-design-home", "003-002-design-lesson", "003-003-design-progress"]
}
\`\`\`

Focus on identifying systemic issues that affect multiple tasks, not isolated failures.`;

    return await ai.askJson<GeneratorDiagnosis>(
      prompt,
      GeneratorDiagnosisSchema,
      {
        phase: "diagnose",
        label: "Seed Generator Diagnosis",
        timeoutMs: 180_000,
      },
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Fix Generation                                                    */
  /* ------------------------------------------------------------------ */

  private async generateFix(
    generatorCode: string,
    generatorPath: string,
    diagnosis: GeneratorDiagnosis,
    ai: ReturnType<typeof createAIContext>,
  ): Promise<string> {
    const prompt = `You are fixing a Seed generator bug.

**Current Generator Code:**
\`\`\`typescript
${generatorCode}
\`\`\`

**Diagnosis:**
${diagnosis.reasoning}

**Bug Location:**
${diagnosis.bugLocation}

**Suggested Fix:**
${diagnosis.suggestedFix}

**Task:**
Generate the corrected Seed generator code that fixes: ${diagnosis.suggestedFix}

Requirements:
1. Fix the output path format
2. Fix the check commands to match
3. Add comments explaining the fix
4. Preserve all existing logic
5. Ensure backward compatibility where possible

Return ONLY the corrected TypeScript code, no explanation.
Do NOT wrap it in markdown code blocks.`;

    const response = await ai.ask(prompt, {
      phase: "fix",
      label: "Generate Fixed Code",
      timeoutMs: 180_000,
    });

    return response.asText();
  }

  /* ------------------------------------------------------------------ */
  /*  Task Regeneration                                                 */
  /* ------------------------------------------------------------------ */

  private async regenerateAffectedTasks(
    taskIds: string[],
    ctx: StrategyContext,
    filesystem: ReturnType<typeof createFilesystemHelper>,
  ): Promise<void> {
    for (const taskId of taskIds) {
      try {
        // Delete WIP attempt directory for each task
        const wipPath = join(
          ctx.projectDir,
          ".converge",
          "journal",
          "epics",
          ctx.journalCtx.epicId,
          "tasks",
          taskId,
          "attempts",
          "wip",
        );

        await filesystem.removeDirectory(wipPath);

        // Also delete the generated task file so Seed can regenerate it
        // Pattern: .converge/epics/{epicId}/{parentTaskId}/task/{childTaskId}/task.ts
        const taskFilePath = join(
          ctx.projectDir,
          ".converge",
          "journal",
          "epics",
          ctx.journalCtx.epicId,
          "tasks",
          taskId.replace(/^.*-(\d+-\w+)$/, "$1"), // Get child task part
        );

        // Try to find and delete the generated task.ts file
        // This is usually in .converge/epics/.../task/{taskId}/task.ts
        const generatedTaskPath = join(
          ctx.projectDir,
          ".converge",
          "epics",
          ctx.journalCtx.epicId,
          ctx.journalCtx.taskId, // parent task
          "task",
          taskId,
          "task.ts",
        );

        try {
          await filesystem.removeFile(generatedTaskPath);
          console.log(
            `   ✓ Regenerated task: ${taskId} (deleted generated file for regeneration)`,
          );
        } catch {
          // File might not exist or different path structure
          console.log(`   ✓ Regenerated task: ${taskId} (WIP cleared)`);
        }
      } catch (err: any) {
        console.warn(
          `   ⚠️  Failed to regenerate task ${taskId}:`,
          err.message,
        );
      }
    }
  }
}
