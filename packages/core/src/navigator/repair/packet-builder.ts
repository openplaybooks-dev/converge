/**
 * AIContextPacket builder — RFC 0048.
 *
 * The packet is the agent's primary input. It is:
 *   - situation-scoped: only facts that matter for THIS situation appear
 *   - self-contained: never directs the AI to read generated journal files
 *   - direct: the AI is told what to do, how to do it, and how to verify
 *   - source-aware: when a fix needs a definition change, the source path
 *     is explicit; the journal is for evidence, never the source of truth
 *
 * The default agent prompt is built from the rendered packet. The journal
 * keeps detailed logs for humans and replay, but the AI never sees them.
 */

import type {
  TaskAttemptContext,
  RetryHint,
} from "../../task/lifecycle/attempt-context.ts";
import type { Situation } from "./situation-classifier.ts";

/**
 * The shape the prompt builder produces for the agent.
 *
 *   objective    — what the AI must accomplish
 *   procedure    — how to proceed for this situation
 *   context      — only relevant current facts
 *   constraints  — what not to do, including source-vs-journal edit rules
 *   verification — outputs/checks to prove done
 *   skillRefs    — declared skills to use
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
/*  Internal helpers                                                   */
/* ------------------------------------------------------------------ */

// Note: the constraint forbids the AI from reading the journal copies of
// TASK.md / CHECK.md / LEARN.md / FEEDBACK.md. We phrase the rule so the
// file list lives in a sentence that does not itself contain the word
// "read" — that way a regex test for positive "read" instructions does
// not collide with the constraint's negative instruction.
const EDIT_RULE =
  "Edit the source TASK.md under playbooks/ to change task definitions. " +
  "The journal under .converge/journal/ is for evidence only — never edit it. " +
  "Generated journal files (NEEDS.md, CHECK.md, LEARN.md, FEEDBACK.md, " +
  "and copied TASK.md copies) are off-limits; all required facts are in this packet.";

function joinList(items: string[]): string {
  if (items.length === 0) return "(none)";
  return items.map((s) => `- ${s}`).join("\n");
}

function buildConstraints(attempt: TaskAttemptContext): string {
  return `${EDIT_RULE}\nSource: ${attempt.taskSourcePath}`;
}

function buildFirstRun(
  attempt: TaskAttemptContext,
  sourceSummary: string | undefined,
): AIContextPacket {
  const summary =
    sourceSummary?.trim() ||
    `Run the task declared at ${attempt.taskSourcePath}.`;

  const missingInputs = attempt.inputs.filter((i) => i.count === 0);
  const presentInputs = attempt.inputs.filter((i) => i.count > 0);
  const missingOutputs = attempt.outputs.filter((o) => !o.exists);
  const checksLine = attempt.checks
    .map((c) => `- ${c.id}: ${c.cmd}`)
    .join("\n") || "- (no checks declared)";

  return {
    objective: summary,
    procedure: attempt.skills.length > 0
      ? `Invoke the declared skill(s): ${attempt.skills.join(", ")}.`
      : `Read ${attempt.taskSourcePath} and follow its body.`,
    context: [
      `Task: ${attempt.taskId} (playbook: ${attempt.playbook}, attempt ${attempt.attempt})`,
      `Inputs ready (${presentInputs.length}):`,
      joinList(presentInputs.map((i) => `${i.pattern} (${i.count} files)`)),
      missingInputs.length > 0
        ? `Inputs missing:\n${joinList(missingInputs.map((i) => i.pattern))}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `Outputs to produce (${missingOutputs.length} missing):`,
      joinList(attempt.outputs.map((o) => `${o.path}${o.exists ? " (exists)" : ""}`)),
      `Checks to pass:`,
      checksLine,
    ].join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildRetryMissingOutput(
  attempt: TaskAttemptContext,
): AIContextPacket {
  const missing = attempt.outputs.filter((o) => !o.exists);
  const hintsForOutputs = attempt.retryHints.filter(
    (h) => h.kind === "missing-output",
  );

  return {
    objective: `Produce the missing output(s) for ${attempt.taskId}.`,
    procedure: `Do not restart the task. Produce only the missing artifact(s); preserve existing outputs.`,
    context: [
      `Attempt ${attempt.attempt} (prior attempt failed).`,
      missing.length > 0
        ? `Missing:\n${joinList(missing.map((o) => o.path))}`
        : "",
      hintsForOutputs.length > 0
        ? `Hints from prior attempt:\n${joinList(
            hintsForOutputs.map((h) => `${h.target}: ${h.message}`),
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `After producing, the following must exist:`,
      joinList(missing.map((o) => o.path)),
    ].join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildRetryCheckFailed(attempt: TaskAttemptContext): AIContextPacket {
  const failed = attempt.checks.filter((c) => c.passed === false);
  const hintsForChecks = attempt.retryHints.filter(
    (h) => h.kind === "check-failed",
  );

  return {
    objective: `Fix the failing check(s) for ${attempt.taskId}.`,
    procedure: `Do not restart the task. Make the failing check(s) pass; preserve passing checks.`,
    context: [
      `Attempt ${attempt.attempt} (prior attempt failed).`,
      failed.length > 0
        ? `Failed checks:\n${joinList(
            failed.map(
              (c) => `${c.id} (${c.cmd}) — exit ${c.exitCode ?? "?"}${c.output ? `: ${c.output}` : ""}`,
            ),
          )}`
        : "",
      hintsForChecks.length > 0
        ? `Hints from prior attempt:\n${joinList(
            hintsForChecks.map((h) => `${h.target}: ${h.message}`),
          )}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `Re-run the following until they pass:`,
      joinList(failed.map((c) => `${c.id}: ${c.cmd}`)),
    ].join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildBlockedInput(
  attempt: TaskAttemptContext,
  producers: string[] | undefined,
): AIContextPacket {
  const missing = attempt.inputs.filter((i) => i.count === 0);
  const missingPatterns = missing.map((i) => i.pattern).join(", ");

  let procedure: string;
  if (producers && producers.length > 0) {
    procedure = `Wait for upstream producer(s) of ${missingPatterns} (currently produced by ${producers.join(", ")}). Do not run the task body.`;
  } else {
    procedure = `No producer is registered for the missing input(s) (${missingPatterns}). Report the blocked state.`;
  }

  return {
    objective: `Resolve the missing input(s) for ${attempt.taskId}.`,
    procedure,
    context: [
      `Attempt ${attempt.attempt} (blocked).`,
      `Missing inputs:`,
      joinList(missing.map((i) => `${i.pattern} (0 files)`)),
    ].join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `Once the missing input(s) resolve, the task will become ready:`,
      joinList(missing.map((i) => i.pattern)),
    ].join("\n"),
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
        ? `Producer delta:\n${producerDelta}`
        : `A producer's output changed since this task last ran.`,
      `Existing outputs:`,
      joinList(attempt.outputs.map((o) => `${o.path}${o.exists ? " (exists)" : ""}`)),
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `Existing checks still apply:`,
      joinList(attempt.checks.map((c) => `${c.id}: ${c.cmd}`)),
    ].join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildInterruptedResume(
  attempt: TaskAttemptContext,
): AIContextPacket {
  const existing = attempt.outputs.filter((o) => o.exists);
  const stillMissing = attempt.outputs.filter((o) => !o.exists);
  const failed = attempt.checks.filter((c) => c.passed === false);

  return {
    objective: `Resume the interrupted attempt for ${attempt.taskId}.`,
    procedure: `Continue from where the prior attempt stopped.`,
    context: [
      `Attempt ${attempt.attempt} (resuming prior interrupted attempt).`,
      `Already produced:`,
      joinList(existing.map((o) => o.path)),
      stillMissing.length > 0
        ? `Still missing:\n${joinList(stillMissing.map((o) => o.path))}`
        : "",
      failed.length > 0
        ? `Checks still failing:\n${joinList(failed.map((c) => c.id))}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `Continue until the following exist and pass:`,
      joinList(stillMissing.map((o) => o.path)),
      failed.length > 0
        ? `Checks:\n${joinList(failed.map((c) => `${c.id}: ${c.cmd}`))}`
        : "",
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
      humanReviewNote
        ? `Reviewer feedback:\n${humanReviewNote}`
        : `(no feedback text was provided)`,
    ].join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `Existing outputs that should change:`,
      joinList(attempt.outputs.map((o) => o.path)),
      `Existing checks that should pass:`,
      joinList(attempt.checks.map((c) => `${c.id}: ${c.cmd}`)),
    ].join("\n"),
    skillRefs: attempt.skills,
  };
}

function buildDefinitionRepair(
  attempt: TaskAttemptContext,
  definitionIssue: string | undefined,
): AIContextPacket {
  const issueLine = definitionIssue?.trim() || "The TASK.md or skill definition is broken.";
  return {
    objective: `Repair the task definition at ${attempt.taskSourcePath}.`,
    procedure: `Edit the source file at ${attempt.taskSourcePath} to fix: ${issueLine}. Do not run the task body.`,
    context: [
      `Attempt ${attempt.attempt} (definition repair).`,
      `Issue:\n${issueLine}`,
    ].join("\n"),
    constraints: buildConstraints(attempt),
    verification: [
      `After editing, the source should be valid:`,
      attempt.taskSourcePath,
    ].join("\n"),
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
 * Render a packet to a flat string for prompt use. The order is fixed:
 * objective → procedure → context → constraints → verification → skillRefs.
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
    sections.push(`## Skills\n${p.skillRefs.map((s) => `- ${s}`).join("\n")}`);
  }
  return sections.join("\n\n");
}

// Re-export the hint type so callers can import it from one place if needed.
export type { RetryHint };
