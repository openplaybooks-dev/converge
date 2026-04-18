/**
 * Summary.md Writer
 *
 * Writes (always overwrites) the task's summary.md with a 9-section
 * document that gives any AI agent complete situational awareness without
 * requiring it to read multiple files.
 *
 * No agentfn call — purely deterministic rendering from structured data.
 */

import { writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { existsSync } from "node:fs";
import { getJournalStructure } from "../journal/structure.ts";
import { logTaskEvent } from "../journal/writer.ts";
import type { BeforePhaseResult } from "./before.ts";
import type { AfterPhaseResult } from "./after.ts";
import type { CorrectionLoopResult } from "./correct.ts";
import type { StructuredDiagnosis } from "./diagnose.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface SummaryInput {
  taskId: string;
  epicId: string;
  description?: string;
  outputs?: string[];
  attempt: number;
  phase: "before" | "execute" | "after";
  status: "running" | "complete" | "failed";
  agentOutputTail?: string; // last 500 chars of agent stdout
  agentExitReason?: string; // e.g. "TIMEOUT after 300,000ms" or "success"
  before?: BeforePhaseResult;
  after?: AfterPhaseResult;
  correction?: CorrectionLoopResult;
  diagnosis?: StructuredDiagnosis;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                    */
/* ------------------------------------------------------------------ */

export async function writeSummaryMd(
  projectDir: string,
  input: SummaryInput,
): Promise<void> {
  const { taskId, epicId } = input;
  const structure = getJournalStructure(projectDir, epicId, taskId);
  if (!structure.task) return;

  const content = renderSummary(input);
  await writeFile(join(structure.task, "summary.md"), content, "utf8");

  await logTaskEvent(
    projectDir,
    epicId,
    taskId,
    "SUMMARY_WRITTEN",
    `Summary updated (${content.length} chars) — status: ${input.status}`,
    {
      phase: input.phase,
      status: input.status,
      attempt: input.attempt,
    },
  );
}

/* ------------------------------------------------------------------ */
/*  Renderer                                                            */
/* ------------------------------------------------------------------ */

function renderSummary(input: SummaryInput): string {
  const { taskId, description, outputs, attempt, phase, status } = input;
  const now = new Date().toISOString();

  const statusEmoji =
    status === "complete" ? "✓" : status === "failed" ? "✗" : "⟳";
  const lines: string[] = [
    `# Task Summary: ${taskId}`,
    `**Status**: ${statusEmoji} ${status} | **Attempt**: ${attempt} | **Last phase**: ${phase} | **Updated**: ${now}`,
    "",
  ];

  // Section 1: What this task is supposed to do
  lines.push("## 1. What This Task Is Supposed to Do");
  lines.push(description ?? taskId);
  if (outputs && outputs.length > 0) {
    lines.push("");
    lines.push(`**Outputs required**: ${outputs.join(", ")}`);
  }
  lines.push("");

  // Section 2: Inputs (before snapshot)
  lines.push("## 2. Inputs (Before Snapshot)");
  if (input.before?.inputSnapshot) {
    const snap = input.before.inputSnapshot;
    lines.push("| Pattern | Files | Status |");
    lines.push("|---------|-------|--------|");
    for (const inp of snap.inputs) {
      const status = inp.satisfied ? "SATISFIED" : "**MISSING**";
      lines.push(`| \`${inp.pattern}\` | ${inp.matchCount} | ${status} |`);
    }
  } else {
    lines.push("_(Before phase not yet run)_");
  }
  lines.push("");

  // Section 3: What the agent did
  lines.push("## 3. What the Agent Did (Execute)");
  if (input.agentExitReason) {
    lines.push(`Exit: ${input.agentExitReason}`);
  }
  if (input.agentOutputTail) {
    lines.push("");
    lines.push("Last output:");
    lines.push("```");
    lines.push(input.agentOutputTail.slice(-500));
    lines.push("```");
  } else {
    lines.push("_(No output captured)_");
  }
  lines.push("");

  // Section 4: File diff
  lines.push("## 4. What Changed (After Diff)");
  if (input.after?.diff) {
    const { diff } = input.after;
    lines.push("| Category | Files |");
    lines.push("|----------|-------|");
    lines.push(
      `| Created  | ${diff.created.length > 0 ? diff.created.join(", ") : "_(none)_"} |`,
    );
    lines.push(
      `| Modified | ${diff.modified.length > 0 ? diff.modified.join(", ") : "_(none)_"} |`,
    );
    lines.push(
      `| Deleted  | ${diff.deleted.length > 0 ? diff.deleted.join(", ") : "_(none)_"} |`,
    );
  } else {
    lines.push("_(After phase not yet run)_");
  }
  lines.push("");

  // Section 5: Check results
  lines.push("## 5. Check Results");
  if (input.after?.checkResults && input.after.checkResults.length > 0) {
    lines.push("| ID | Description | Result | Output |");
    lines.push("|----|-------------|--------|--------|");
    for (const cr of input.after.checkResults) {
      const result = cr.passed ? "✓ PASS" : "✗ FAIL";
      const output = `${cr.stdout}\n${cr.stderr}`
        .trim()
        .slice(0, 100)
        .replace(/\n/g, " ");
      lines.push(
        `| ${cr.id} | ${cr.description} | ${result} | \`${output}\` |`,
      );
    }
  } else {
    lines.push("_(No checks run yet)_");
  }
  lines.push("");

  // Section 6: Diagnosis
  lines.push("## 6. Diagnosis");
  if (input.diagnosis) {
    const d = input.diagnosis;
    lines.push(
      `**Error**: ${d.errorClass} | **Automatable**: ${d.automatable ? "YES" : "NO"} | **Confidence**: ${(d.confidenceScore * 100).toFixed(0)}%`,
    );
    if (d.hintMatched) lines.push(`**Hint matched**: \`${d.hintMatched}\``);
    lines.push("");
    lines.push(`**Likely cause**: ${d.likelyCause}`);
    lines.push("");
    lines.push(`**Suggested fix**: ${d.suggestedFix}`);
  } else if (status === "complete") {
    lines.push("_(Task completed successfully — no diagnosis needed)_");
  } else {
    lines.push("_(Diagnosis not yet run)_");
  }
  lines.push("");

  // Section 7: Correction attempts
  lines.push("## 7. Correction Attempts");
  if (input.correction && input.correction.history.length > 0) {
    lines.push("| # | Fix Applied | Checks Passed | Resolved |");
    lines.push("|---|-------------|---------------|---------|");
    for (const ca of input.correction.history) {
      const passed = ca.checkResults.filter((r) => r.passed).length;
      const total = ca.checkResults.length;
      lines.push(
        `| ${ca.attemptNumber} | ${ca.fixDescription.slice(0, 60)} | ${passed}/${total} | ${ca.resolved ? "✓" : "✗"} |`,
      );
    }
  } else {
    lines.push("_(No correction attempts)_");
  }
  lines.push("");

  // Section 8: Upstream context (from before/context.md)
  lines.push("## 8. Upstream Context");
  if (
    input.before?.contextDoc &&
    input.before.contextDoc.trim() &&
    !input.before.contextDoc.includes("_(No prior")
  ) {
    lines.push(input.before.contextDoc.slice(0, 1000));
  } else {
    lines.push("_(No ancestor tasks completed)_");
  }
  lines.push("");

  // Section 9: Recommended next action
  lines.push("## 9. Recommended Next Action");
  if (status === "complete") {
    lines.push("Task completed successfully. No action required.");
  } else if (input.diagnosis) {
    if (!input.diagnosis.automatable) {
      lines.push(
        `**Manual intervention required.** ${input.diagnosis.suggestedFix}`,
      );
    } else if (input.correction && !input.correction.resolved) {
      lines.push(
        `Inner correction loop exhausted (${input.correction.attemptsUsed}/${input.correction.maxAttempts} attempts). Falling through to external repair pipeline.`,
      );
      lines.push("");
      lines.push(input.diagnosis.suggestedFix);
    } else {
      lines.push(input.diagnosis.suggestedFix);
    }
  } else {
    lines.push("Re-run the task.");
  }
  lines.push("");
  lines.push(`---`);
  lines.push(`_Generated by Converge lifecycle — ${now}_`);

  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/*  Read existing summary (for downstream context)                     */
/* ------------------------------------------------------------------ */

export async function readSummaryMd(
  projectDir: string,
  epicId: string,
  taskId: string,
  maxChars = 800,
): Promise<string> {
  const structure = getJournalStructure(projectDir, epicId, taskId);
  if (!structure.task) return "";
  const path = join(structure.task, "summary.md");
  if (!existsSync(path)) return "";
  try {
    const content = await readFile(path, "utf8");
    return content.slice(0, maxChars);
  } catch {
    return "";
  }
}
