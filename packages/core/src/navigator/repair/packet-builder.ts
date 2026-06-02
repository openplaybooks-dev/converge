/**
 * AIContextPacket builder — RFC 0048 (focused + complete form).
 *
 * The packet is the agent's primary input. Each section has one clear concern
 * so the agent can focus on what to do and the relevant context:
 *
 *   objective    — what the AI must accomplish
 *   procedure    — how to proceed for this situation
 *   context      — only relevant current facts
 *   constraints  — what not to do, including source-vs-journal edit rules
 *   verification — outputs/checks to prove done
 *   skillRefs    — declared skills to use
 *
 * Design principles (priority: task quality > AI focus > token cost):
 *
 *   1. **Quality first.** The packet contains all the info the AI needs to
 *      do the task well — full input samples (up to 5 per pattern),
 *      declared outputs, declared checks, the failure context on retry.
 *      Stripping for token savings at the cost of quality is a regression.
 *
 *   2. **Focus via sectioning.** Six clearly-named sections, each with one
 *      concern. The agent never has to figure out which file to read;
 *      it just reads the prompt.
 *
 *   3. **No boilerplate.** Empty sections (e.g. no skills) are not rendered.
 *
 *   4. **Self-contained.** The packet never directs the agent to read
 *      generated journal files (NEEDS.md / CHECK.md / LEARN.md / FEEDBACK.md).
 *      The journal under `.converge/journal/` is forensic evidence only.
 *
 *   5. **Source-aware.** When a fix requires a definition change, the
 *      source path is explicit in `constraints`. The journal is never the
 *      source of truth.
 *
 *   6. **Retry deduplication.** Failure details go in `context`; the goal
 *      (re-run command) goes in `verification`. The same check never
 *      appears in both — focus, not noise.
 */

import type {
  TaskAttemptContext,
  RetryHint,
} from "../../task/lifecycle/attempt-context.ts";
import type { Situation } from "./situation-classifier.ts";

/**
 * The shape the prompt builder produces for the agent.
 */
export interface AIContextPacket {
  objective: string;
  procedure: string;
  context: string;
  constraints: string;
  verification: string;
  skillRefs: string[];
}

export interface PacketInputs {
  attempt: TaskAttemptContext;
  situation: Situation;
  /** Source body summary, used by first-run. */
  sourceSummary?: string;
  /** Human review feedback, used by human-review-revision. */
  humanReviewNote?: string;
  /** Producer delta description, used by producer-rerun. */
  producerDelta?: string;
  /** Definition issue description, used by definition-repair. */
  definitionIssue?: string;
  /** Known producer task ids, used by blocked-input. */
  producers?: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MAX_SAMPLES_SHOWN = 5;

const EDIT_RULE = (source: string): string =>
  `Source: ${source} — edit for definition changes. The journal under .converge/journal/ is for evidence only — never edit or read generated files. All required facts are in this packet.`;

function joinList(items: string[]): string {
  if (items.length === 0) return "(none)";
  return items.map((s) => `- ${s}`).join("\n");
}

/** Render a compact input line: "in/*.png (4 files): a.png, b.png, c.png, d.png" */
function formatInputLine(input: TaskAttemptContext["inputs"][number]): string {
  if (input.count === 0) return `- \`${input.pattern}\` — no files found`;
  const shown = input.samples.slice(0, MAX_SAMPLES_SHOWN);
  const truncated = input.samples.length > MAX_SAMPLES_SHOWN
    ? `, …+${input.samples.length - MAX_SAMPLES_SHOWN} more`
    : "";
  return `- \`${input.pattern}\` (${input.count} file${input.count === 1 ? "" : "s"}): ${shown.join(", ")}${truncated}`;
}

function formatOutputLine(output: TaskAttemptContext["outputs"][number]): string {
  return output.exists
    ? `- \`${output.path}\` — exists`
    : `- \`${output.path}\` — missing`;
}

function formatCheckLine(check: TaskAttemptContext["checks"][number]): string {
  if (check.passed === true) {
    return `- ✓ \`${check.id}\`: \`${check.cmd}\``;
  }
  if (check.passed === false) {
    const exit = check.exitCode !== undefined ? ` (exit ${check.exitCode})` : "";
    return `- ✗ \`${check.id}\`: \`${check.cmd}\`${exit}`;
  }
  return `- \`${check.id}\`: \`${check.cmd}\``;
}

function firstLine(s: string | undefined, cap = 200): string {
  if (!s) return "";
  const line = s.split("\n")[0].trim();
  return line.length > cap ? line.slice(0, cap - 1) + "…" : line;
}

function firstSentence(s: string | undefined, cap = 240): string {
  if (!s) return "";
  const trimmed = s.trim();
  if (!trimmed) return "";
  return trimmed.length > cap ? trimmed.slice(0, cap - 1) + "…" : trimmed;
}

/* ------------------------------------------------------------------ */
/*  Per-situation builders                                             */
/*  Each returns a packet where every section has the info the AI     */
/*  needs to do the task well — no unnecessary stripping.             */
/* ------------------------------------------------------------------ */

function buildFirstRun(
  attempt: TaskAttemptContext,
  sourceSummary: string | undefined,
): AIContextPacket {
  const summary = firstSentence(sourceSummary) ||
    `Execute ${attempt.taskId}.`;

  // Context = what the agent needs to know before acting.
  //   - Task id and attempt.
  //   - Inputs (with samples) so the agent knows what's available.
  // Outputs and checks go in `verification` — the agent sees them once,
  // framed as the goal ("produce X, pass Y"), not duplicated as state.
  const contextLines: string[] = [
    `Task ${attempt.taskId} (playbook: ${attempt.playbook}, attempt ${attempt.attempt})`,
  ];
  if (attempt.inputs.length > 0) {
    contextLines.push("Inputs:");
    contextLines.push(...attempt.inputs.map(formatInputLine));
  }

  const verificationLines: string[] = [];
  if (attempt.outputs.length > 0) {
    verificationLines.push("Produce:", ...attempt.outputs.map(formatOutputLine));
  }
  if (attempt.checks.length > 0) {
    verificationLines.push("Pass:", ...attempt.checks.map(formatCheckLine));
  }

  return {
    objective: summary,
    procedure: attempt.skills.length > 0
      ? `Invoke the declared skill(s): ${attempt.skills.join(", ")}.`
      : `Read the source at \`${attempt.taskSourcePath}\` and follow the body.`,
    context: contextLines.join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: verificationLines.join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildRetryMissingOutput(attempt: TaskAttemptContext): AIContextPacket {
  // The `missing outputs` list is the action. The `retryHints` are
  // a redundant narration of the same fact. Drop the hints; the
  // agent has the action item.
  const missing = attempt.outputs.filter((o) => !o.exists);
  return {
    objective: missing.length > 0
      ? `Produce the missing output(s) for ${attempt.taskId}.`
      : `Resolve the missing output(s).`,
    procedure: `Do not restart the task. Produce only the missing artifact(s); preserve existing outputs.`,
    context: [
      `Attempt ${attempt.attempt} (prior attempt failed).`,
      ...missing.map(formatOutputLine),
    ].join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: missing.length > 0
      ? `Produce:\n${joinList(missing.map((o) => "`" + o.path + "`"))}`
      : "All declared outputs must exist.",
    skillRefs: attempt.skills,
  };
}

function buildRetryCheckFailed(attempt: TaskAttemptContext): AIContextPacket {
  // Same principle as retry-missing-output: the failed-checks list is
  // the action. Drop the `retryHints` (they restate the same fact in
  // prose) and keep the failure output (it tells the agent WHY).
  const failed = attempt.checks.filter((c) => c.passed === false);
  return {
    objective: failed.length > 0
      ? `Fix the failing check(s) for ${attempt.taskId}.`
      : `Fix the failing check(s).`,
    procedure: `Do not restart the task. Make the failing check(s) pass; preserve passing checks.`,
    context: [
      `Attempt ${attempt.attempt} (prior attempt failed).`,
      ...failed.map(formatCheckLine),
      ...failed
        .filter((c) => c.output?.trim())
        .map((c) => `  ${c.id}: ${firstLine(c.output)}`),
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: failed.length > 0
      ? `Re-run until passing:\n${joinList(failed.map((c) => `${c.id}: \`${c.cmd}\``))}`
      : "All checks must pass.",
    skillRefs: attempt.skills,
  };
}

function buildBlockedInput(
  attempt: TaskAttemptContext,
  producers: string[] | undefined,
): AIContextPacket {
  // The agent has nothing to do but wait. Verification is just
  // "do not run the task body" — there is no success criterion to
  // produce. The inputs are listed in `context`; the procedure says
  // who produces them; the rest is silence.
  const missing = attempt.inputs.filter((i) => i.count === 0);
  const missingPatterns = missing.map((i) => i.pattern);
  return {
    objective: `Wait for the missing input(s) for ${attempt.taskId}.`,
    procedure: producers && producers.length > 0
      ? `Producers: ${producers.join(", ")}. Do not run the task body.`
      : `No producer is registered. Report the blocked state.`,
    context: [
      `Attempt ${attempt.attempt} (blocked).`,
      ...missing.map(formatInputLine),
    ].join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: missingPatterns.length > 0
      ? `Do not run the task body. Wait for ${missingPatterns.map((p) => "`" + p + "`").join(", ")} to resolve.`
      : "Do not run the task body until inputs arrive.",
    skillRefs: [],
  };
}

function buildProducerRerun(
  attempt: TaskAttemptContext,
  producerDelta: string | undefined,
): AIContextPacket {
  return {
    objective: `Re-evaluate outputs in light of an upstream change.`,
    procedure: `Compare the existing outputs to the new producer output and adjust only what is stale. Do not restart from scratch.`,
    context: [
      `Attempt ${attempt.attempt} (producer rerun).`,
      producerDelta
        ? `Producer delta: ${firstSentence(producerDelta)}`
        : "A producer's output changed since this task last ran.",
      "Existing outputs:",
      ...attempt.outputs.map(formatOutputLine),
    ].join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: attempt.checks.length > 0
      ? `Existing checks still apply:\n${joinList(attempt.checks.map((c) => `${c.id}: \`${c.cmd}\``))}`
      : "Existing outputs are still correct.",
    skillRefs: attempt.skills,
  };
}

function buildInterruptedResume(attempt: TaskAttemptContext): AIContextPacket {
  const existing = attempt.outputs.filter((o) => o.exists);
  const stillMissing = attempt.outputs.filter((o) => !o.exists);
  const failed = attempt.checks.filter((c) => c.passed === false);
  return {
    objective: `Resume the interrupted attempt for ${attempt.taskId}.`,
    procedure: `Continue from where the prior attempt stopped. Do not begin again from scratch.`,
    context: [
      `Attempt ${attempt.attempt} (resuming prior interrupted attempt).`,
      existing.length > 0 ? "Already produced:" : "",
      ...existing.map(formatOutputLine),
      stillMissing.length > 0 ? "Still missing:" : "",
      ...stillMissing.map(formatOutputLine),
      failed.length > 0 ? "Checks still failing:" : "",
      ...failed.map(formatCheckLine),
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: [
      "Continue until the following exist and pass:",
      ...stillMissing.map(formatOutputLine),
      failed.length > 0 ? "Checks:" : "",
      ...failed.map((c) => `- ${c.id}: \`${c.cmd}\``),
    ]
      .filter(Boolean)
      .join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildHumanReviewRevision(
  attempt: TaskAttemptContext,
  humanReviewNote: string | undefined,
): AIContextPacket {
  return {
    objective: `Apply the human reviewer's feedback to ${attempt.taskId}.`,
    procedure: `Make only the changes the reviewer asked for. Do not redo work that is already accepted.`,
    context: [
      `Attempt ${attempt.attempt} (human review revision).`,
      "Reviewer feedback:",
      humanReviewNote?.trim() || "(no feedback text was provided)",
    ].join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: attempt.checks.length > 0
      ? `Re-verify:\n${joinList(attempt.checks.map((c) => `${c.id}: \`${c.cmd}\``))}`
      : "Existing outputs are still correct.",
    skillRefs: attempt.skills,
  };
}

function buildDefinitionRepair(
  attempt: TaskAttemptContext,
  definitionIssue: string | undefined,
): AIContextPacket {
  const issue = firstSentence(definitionIssue) || "TASK.md or skill definition is broken.";
  return {
    objective: `Repair the task definition at ${attempt.taskSourcePath}.`,
    procedure: `Edit the source file at \`${attempt.taskSourcePath}\` to fix: ${issue}. Do not run the task body.`,
    context: [
      `Attempt ${attempt.attempt} (definition repair).`,
      `Issue: ${issue}`,
    ].join("\n"),
    constraints: EDIT_RULE(attempt.taskSourcePath),
    verification: `After editing, the source should be valid: \`${attempt.taskSourcePath}\`.`,
    skillRefs: [],
  };
}

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export function buildPacket(inputs: PacketInputs): AIContextPacket {
  const { attempt, situation } = inputs;
  switch (situation) {
    case "first-run":
      return buildFirstRun(attempt, inputs.sourceSummary);
    case "retry-missing-output":
      return buildRetryMissingOutput(attempt);
    case "retry-check-failed":
      return buildRetryCheckFailed(attempt);
    case "blocked-input":
      return buildBlockedInput(attempt, inputs.producers);
    case "producer-rerun":
      return buildProducerRerun(attempt, inputs.producerDelta);
    case "interrupted-resume":
      return buildInterruptedResume(attempt);
    case "human-review-revision":
      return buildHumanReviewRevision(attempt, inputs.humanReviewNote);
    case "definition-repair":
      return buildDefinitionRepair(attempt, inputs.definitionIssue);
  }
}

/**
 * Render a packet to a flat string. Each section is `## Heading\n<body>`.
 * The `## Skills` section is omitted when `skillRefs` is empty.
 */
export function renderPacket(p: AIContextPacket): string {
  const sections: string[] = [
    `## Objective\n${p.objective}`,
    `## Procedure\n${p.procedure}`,
    `## Context\n${p.context}`,
    `## Constraints\n${p.constraints}`,
    `## Verification\n${p.verification}`,
  ];
  if (p.skillRefs.length > 0) {
    sections.push(`## Skills\n${p.skillRefs.join(", ")}`);
  }
  return sections.join("\n\n");
}

// Re-export the hint type so callers can import it from one place if needed.
export type { RetryHint };
