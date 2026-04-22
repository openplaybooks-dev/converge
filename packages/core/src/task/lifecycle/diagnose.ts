/**
 * Failure Diagnosis
 *
 * Called when the after phase reports failed checks.
 * First attempts rule-based classification using diagnosisHints from SKILL.md.
 * Falls back to an AI call only when confidence is below 0.7.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { getTaskCorrectionsDir } from "../../journal/structure.ts";
import { logTaskEvent } from "../../journal/writer.ts";
import type { AfterPhaseResult, CheckRunResult } from "./after.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export type ErrorClass =
  | "timeout"
  | "missing-output"
  | "check-failed"
  | "corrupted-output"
  | "dependency-missing"
  | "tool-error"
  | "unknown";

export interface DiagnosisHint {
  id: string;
  /** Substring or regex pattern to match against check stdout/stderr + agent output */
  pattern: string;
  errorClass: ErrorClass;
  cause: string;
  fix: string;
  automatable: boolean;
}

export interface CheckFailureDetail {
  checkId: string;
  cmd: string;
  output: string;
  interpretation: string;
}

export interface StructuredDiagnosis {
  timestamp: string;
  attempt: number;
  errorClass: ErrorClass;
  likelyCause: string;
  suggestedFix: string;
  hintMatched?: string;
  automatable: boolean;
  confidenceScore: number;
  checkFailures: CheckFailureDetail[];
  fixApplied?: string;
  resolved?: boolean;
}

export interface DiagnoseOptions {
  taskId: string;
  epicId: string;
  diagnosisHints?: DiagnosisHint[];
  attempt: number;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function diagnoseFailure(
  projectDir: string,
  afterResult: AfterPhaseResult,
  agentStdout: string,
  opts: DiagnoseOptions,
): Promise<StructuredDiagnosis> {
  const { taskId, epicId, diagnosisHints = [], attempt } = opts;

  const failedChecks = afterResult.checkResults.filter((r) => !r.passed);
  const combinedOutput = [
    agentStdout,
    ...failedChecks.map((c) => `${c.stdout}\n${c.stderr}`),
  ].join("\n");

  // 1. Rule-based diagnosis using hints from SKILL.md
  const ruleBased = tryRuleBasedDiagnosis(
    combinedOutput,
    failedChecks,
    diagnosisHints,
  );

  let diagnosis: StructuredDiagnosis;

  if (ruleBased && ruleBased.confidenceScore >= 0.7) {
    diagnosis = {
      timestamp: new Date().toISOString(),
      attempt,
      ...ruleBased,
      checkFailures: buildCheckFailures(failedChecks),
    };
  } else {
    // 2. Fallback: heuristic classification (no AI call unless explicitly needed)
    const heuristic = heuristicDiagnosis(combinedOutput, failedChecks);
    diagnosis = {
      timestamp: new Date().toISOString(),
      attempt,
      ...heuristic,
      checkFailures: buildCheckFailures(failedChecks),
    };
  }

  // Persist to corrections/attempt-{N}.json
  const correctionsDir = getTaskCorrectionsDir(projectDir, epicId, taskId);
  await mkdir(correctionsDir, { recursive: true });
  await writeFile(
    join(correctionsDir, `attempt-${attempt}.json`),
    JSON.stringify(diagnosis, null, 2),
  );

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "CORRECTION_DIAGNOSIS",
    `Diagnosis: ${diagnosis.errorClass} — ${diagnosis.likelyCause.slice(0, 100)}`,
    {
      attempt,
      errorClass: diagnosis.errorClass,
      automatable: diagnosis.automatable,
      confidenceScore: diagnosis.confidenceScore,
      hintMatched: diagnosis.hintMatched,
    },
  );

  return diagnosis;
}

/* ------------------------------------------------------------------ */
/*  Rule-based matching                                                 */
/* ------------------------------------------------------------------ */

interface PartialDiagnosis {
  errorClass: ErrorClass;
  likelyCause: string;
  suggestedFix: string;
  hintMatched?: string;
  automatable: boolean;
  confidenceScore: number;
}

function tryRuleBasedDiagnosis(
  combinedOutput: string,
  failedChecks: CheckRunResult[],
  hints: DiagnosisHint[],
): PartialDiagnosis | null {
  for (const hint of hints) {
    let matches = false;
    try {
      matches = new RegExp(hint.pattern, "i").test(combinedOutput);
    } catch {
      matches = combinedOutput.includes(hint.pattern);
    }
    if (matches) {
      return {
        errorClass: hint.errorClass,
        likelyCause: hint.cause,
        suggestedFix: hint.fix,
        hintMatched: hint.id,
        automatable: hint.automatable,
        confidenceScore: 0.9,
      };
    }
  }
  return null;
}

function heuristicDiagnosis(
  combinedOutput: string,
  failedChecks: CheckRunResult[],
): PartialDiagnosis {
  // Timeout
  if (/timeout|timed out|ETIMEDOUT/i.test(combinedOutput)) {
    return {
      errorClass: "timeout",
      likelyCause: "Agent execution timed out before completing the task",
      suggestedFix:
        "Retry — the task may need a longer timeout or should be decomposed into smaller steps",
      automatable: true,
      confidenceScore: 0.85,
    };
  }
  // Missing bash / shell
  if (
    /spawn.*bash.*ENOENT|Command not found|No such file or directory.*bash/i.test(
      combinedOutput,
    )
  ) {
    return {
      errorClass: "tool-error",
      likelyCause: "Bash binary not found on PATH — check commands cannot run",
      suggestedFix:
        "Add bash to PATH (e.g. Git for Windows) or rewrite checks as PowerShell",
      automatable: false,
      confidenceScore: 0.9,
    };
  }
  // All checks fail with empty output → likely nothing was produced
  const nothingCreated = failedChecks.every(
    (c) => /test -f|test -s/.test(c.cmd) && c.stdout === "",
  );
  if (nothingCreated && failedChecks.length > 0) {
    return {
      errorClass: "missing-output",
      likelyCause: "Agent completed but produced no output files",
      suggestedFix: "Re-run with explicit write instructions in the prompt",
      automatable: true,
      confidenceScore: 0.75,
    };
  }
  // Check failed with some output → content issue
  if (failedChecks.some((c) => c.stdout.length > 0 || c.stderr.length > 0)) {
    return {
      errorClass: "check-failed",
      likelyCause: `Verification check failed: ${failedChecks[0]?.description ?? "unknown check"}`,
      suggestedFix: `Fix the failing check condition: ${failedChecks[0]?.cmd ?? ""}`,
      automatable: true,
      confidenceScore: 0.65,
    };
  }

  return {
    errorClass: "unknown",
    likelyCause: "Unable to determine root cause from check output",
    suggestedFix:
      "Re-run the task. If it fails again, review agent logs for clues.",
    automatable: true,
    confidenceScore: 0.4,
  };
}

function buildCheckFailures(
  failedChecks: CheckRunResult[],
): CheckFailureDetail[] {
  return failedChecks.map((c) => ({
    checkId: c.id,
    cmd: c.cmd,
    output: `${c.stdout}\n${c.stderr}`.trim().slice(0, 300),
    interpretation: `Exit code ${c.exitCode}: ${c.description}`,
  }));
}
