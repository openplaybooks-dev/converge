/**
 * Inner Correction Loop
 *
 * Runs INSIDE the convergence loop when checks fail, BEFORE the external
 * GapResolutionPipeline is invoked. This gives the AI a chance to self-correct
 * with full task context still in scope, rather than starting fresh.
 *
 * Each attempt:
 *   1. Build a targeted repair prompt from the diagnosis
 *   2. Run the agent with repair tools
 *   3. Re-run the after phase to check if the fix worked
 *   4. If all checks pass → resolved; otherwise → re-diagnose and retry
 */

import { writeFile, mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { getTaskCorrectionsDir } from "../../journal/structure.ts";
import { logTaskEvent } from "../../journal/writer.ts";
import { runAgent } from "../../navigator/repair/agent-runner.ts";
import { runAfterPhase } from "./after.ts";
import { diagnoseFailure } from "./diagnose.ts";
import type { AfterPhaseResult, CheckDef, AfterPhaseMeta } from "./after.ts";
import type { StructuredDiagnosis, DiagnosisHint } from "./diagnose.ts";
import type { InputSnapshot } from "./before.ts";
import type { JournalContext } from "../../navigator/repair/types.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface CorrectionAttempt {
  attemptNumber: number;
  diagnosis: StructuredDiagnosis;
  fixApplied: boolean;
  fixDescription: string;
  checkResults: AfterPhaseResult["checkResults"];
  resolved: boolean;
  durationMs: number;
}

export interface CorrectionLoopResult {
  resolved: boolean;
  attemptsUsed: number;
  maxAttempts: number;
  history: CorrectionAttempt[];
}

export interface CorrectionLoopOptions {
  taskId: string;
  epicId: string;
  taskDescription?: string;
  taskOutputs?: string[];
  checks: CheckDef[];
  diagnosisHints?: DiagnosisHint[];
  correctionBudget: number;
  inputSnapshot: InputSnapshot;
  startMs: number;
  label?: string;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function runCorrectionLoop(
  projectDir: string,
  initialDiagnosis: StructuredDiagnosis,
  initialAfterResult: AfterPhaseResult,
  opts: CorrectionLoopOptions,
): Promise<CorrectionLoopResult> {
  const {
    taskId,
    epicId,
    checks,
    diagnosisHints,
    correctionBudget,
    inputSnapshot,
    startMs,
    taskDescription,
    taskOutputs,
    label,
  } = opts;

  const correctionsDir = getTaskCorrectionsDir(projectDir, epicId, taskId);
  await mkdir(correctionsDir, { recursive: true });

  const journalCtx: JournalContext = { epicId, taskId };
  const history: CorrectionAttempt[] = [];

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "CORRECTION_LOOP_START",
    `Inner correction loop starting (budget: ${correctionBudget})`,
    { correctionBudget },
  );

  let currentDiagnosis = initialDiagnosis;
  let currentAfterResult = initialAfterResult;

  for (let attempt = 1; attempt <= correctionBudget; attempt++) {
    const attemptStart = Date.now();

    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "CORRECTION_ATTEMPTED",
      `Correction attempt ${attempt}/${correctionBudget}: ${currentDiagnosis.errorClass}`,
      {
        attempt,
        automatable: currentDiagnosis.automatable,
      },
    );

    // If not automatable, bail immediately
    if (!currentDiagnosis.automatable) {
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "CORRECTION_FAILED",
        `Correction attempt ${attempt} skipped — not automatable`,
        { attempt },
      );

      history.push({
        attemptNumber: attempt,
        diagnosis: currentDiagnosis,
        fixApplied: false,
        fixDescription: "(skipped — not automatable)",
        checkResults: currentAfterResult.checkResults,
        resolved: false,
        durationMs: Date.now() - attemptStart,
      });
      break;
    }

    // Build repair prompt
    const repairPrompt = buildRepairPrompt(
      projectDir,
      currentDiagnosis,
      currentAfterResult,
      taskDescription,
      taskOutputs,
    );

    // Run targeted repair agent
    let fixApplied = false;
    let fixDescription = "AI repair attempt";
    try {
      await runAgent({
        phase: `correction_${attempt}`,
        prompt: repairPrompt,
        agentOptions: {
          allowedTools: ["Read", "Write", "Edit", "Bash", "Glob"],
          timeoutMs: 180_000,
        },
        projectDir,
        journalCtx,
        label: label ?? taskId,
      });
      fixApplied = true;
      fixDescription = `Applied fix for: ${currentDiagnosis.likelyCause.slice(0, 80)}`;
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "CORRECTION_APPLIED",
        `Correction ${attempt} applied`,
        { attempt },
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      fixDescription = `Agent failed: ${msg.slice(0, 100)}`;
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "CORRECTION_FAILED",
        `Correction ${attempt} agent call failed: ${msg.slice(0, 100)}`,
        { attempt },
      );
    }

    // Re-run after phase to check if fix worked
    const meta: AfterPhaseMeta = {
      taskId,
      epicId,
      attempt: currentDiagnosis.attempt,
      correctionAttempts: attempt,
      startMs,
      description: taskDescription,
      outputs: taskOutputs,
    };
    const recheck = await runAfterPhase(
      projectDir,
      epicId,
      taskId,
      checks,
      inputSnapshot,
      meta,
    );

    // Append to correction-log.jsonl
    const logEntry = {
      attempt,
      timestamp: new Date().toISOString(),
      fixApplied,
      fixDescription,
      allChecksPassed: recheck.allChecksPassed,
      failedChecks: recheck.checkResults
        .filter((r) => !r.passed)
        .map((r) => r.id),
    };
    await appendFile(
      join(correctionsDir, "correction-log.jsonl"),
      JSON.stringify(logEntry) + "\n",
    );

    const correctionRecord: CorrectionAttempt = {
      attemptNumber: attempt,
      diagnosis: currentDiagnosis,
      fixApplied,
      fixDescription,
      checkResults: recheck.checkResults,
      resolved: recheck.allChecksPassed,
      durationMs: Date.now() - attemptStart,
    };
    history.push(correctionRecord);

    // Update the attempt file with resolved status
    await writeFile(
      join(correctionsDir, `attempt-${currentDiagnosis.attempt}.json`),
      JSON.stringify(
        {
          ...currentDiagnosis,
          fixApplied,
          fixDescription,
          resolved: recheck.allChecksPassed,
        },
        null,
        2,
      ),
    );

    if (recheck.allChecksPassed) {
      await logTaskEvent(
        projectDir,
        epicId,
        taskId,
        "CORRECTION_VERIFIED",
        `Correction ${attempt} verified — all checks pass`,
        { attempt },
      );
      return {
        resolved: true,
        attemptsUsed: attempt,
        maxAttempts: correctionBudget,
        history,
      };
    }

    await logTaskEvent(
      projectDir,
      epicId,
      taskId,
      "CORRECTION_FAILED",
      `Correction ${attempt} did not resolve all checks`,
      { attempt },
    );

    // Re-diagnose for next attempt
    if (attempt < correctionBudget) {
      currentAfterResult = recheck;
      currentDiagnosis = await diagnoseFailure(projectDir, recheck, "", {
        taskId,
        epicId,
        diagnosisHints,
        attempt: attempt + 1,
      });
    }
  }

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "CORRECTION_LOOP_EXHAUSTED",
    `Correction loop exhausted after ${history.length} attempt(s)`,
    {
      attemptsUsed: history.length,
      correctionBudget,
    },
  );

  return {
    resolved: false,
    attemptsUsed: history.length,
    maxAttempts: correctionBudget,
    history,
  };
}

/* ------------------------------------------------------------------ */
/*  Repair prompt builder                                               */
/* ------------------------------------------------------------------ */

function buildRepairPrompt(
  projectDir: string,
  diagnosis: StructuredDiagnosis,
  afterResult: AfterPhaseResult,
  taskDescription?: string,
  taskOutputs?: string[],
): string {
  const failedChecks = afterResult.checkResults.filter((r) => !r.passed);
  const checkBlock = failedChecks
    .map(
      (c) =>
        `Check: ${c.description}\nCommand: ${c.cmd}\nExit: ${c.exitCode}\nOutput:\n${(c.stdout + "\n" + c.stderr).trim().slice(0, 300)}`,
    )
    .join("\n\n---\n\n");

  return `You are a precise code repair agent. A task's verification checks failed.
Make the minimal targeted fix to resolve the failing checks.

PROJECT DIRECTORY: ${projectDir}

TASK: ${taskDescription ?? "complete the task"}

DIAGNOSIS:
Error type: ${diagnosis.errorClass}
Likely cause: ${diagnosis.likelyCause}
Suggested fix: ${diagnosis.suggestedFix}

FAILING CHECKS:
${checkBlock || "(no check output captured)"}

EXPECTED OUTPUTS:
${(taskOutputs ?? []).map((f) => `- ${f}`).join("\n") || "(see task definition)"}

INSTRUCTIONS:
1. Read the relevant files to understand the current state
2. Apply the suggested fix (${diagnosis.suggestedFix})
3. Verify the fix by running the failing check commands
4. Use Write/Edit tools to make file changes
5. Use Bash tool to run verification commands

Focus only on making the failing checks pass. Do not refactor unrelated code.`;
}
