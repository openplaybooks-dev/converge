/**
 * RFC 0048 efficiency benchmark — old (file-based) vs. new (packet-based) prompts.
 *
 * Run with:
 *   pnpm tsx packages/core/tests/bench/rfc-0048-efficiency.bench.ts
 *
 * The benchmark does NOT exercise the framework end-to-end. It reconstructs
 * what the old prompt would have looked like given a representative task,
 * and compares it to the new packet-based prompt on:
 *
 *   - prompt length (chars and ~tokens)
 *   - "read this file" directives
 *   - file reads the agent would have to perform
 *   - on-disk files written per attempt
 *
 * The numbers are an upper bound on the savings — the actual savings in a
 * real run depend on how many files the AI would have chosen to read.
 */

import {
  buildPacket,
  renderPacket,
  type AIContextPacket,
  type PacketInputs,
} from "../../src/navigator/repair/packet-builder.ts";
import { classifySituation } from "../../src/navigator/repair/situation-classifier.ts";
import type { TaskAttemptContext } from "../../src/task/lifecycle/attempt-context.ts";

/* ------------------------------------------------------------------ */
/*  Sample task                                                        */
/* ------------------------------------------------------------------ */

const SAMPLE_SKILL_BODY = `Generate a hero illustration for the demo project.
Use the input images as a style reference.
Output to out/foo.png.
Make the composition clean and modern.`;

function baseAttempt(): TaskAttemptContext {
  return {
    taskId: "01-build-illustration",
    playbook: "demo",
    attempt: 1,
    status: "ready",
    taskSourcePath: "playbooks/demo/tasks/01-build-illustration/TASK.md",
    inputs: [
      { pattern: "in/manifest.json", count: 1, samples: ["in/manifest.json"] },
      { pattern: "in/*.png", count: 4, samples: ["in/a.png", "in/b.png", "in/c.png", "in/d.png"] },
    ],
    outputs: [
      { path: "out/foo.png", exists: false },
      { path: "out/bar.png", exists: false },
    ],
    checks: [
      { id: "lint", description: "eslint", cmd: "pnpm lint", passed: true, exitCode: 0 },
      { id: "test", description: "vitest", cmd: "pnpm test", passed: false, exitCode: 1, output: "1 test failed" },
    ],
    skills: ["image-generate"],
    retryHints: [
      {
        kind: "check-failed",
        target: "test",
        message: "1 test failed (pnpm test)",
        sourceAttempt: 1,
      },
    ],
    logs: { events: "events.jsonl", provider: ["provider/run-1.log", "provider/run-2.log"] },
  };
}

const SAMPLE_DESCRIPTION =
  "Generate a hero illustration that matches the style of the input PNGs.";

/* ------------------------------------------------------------------ */
/*  Reconstruction of the OLD file-based approach                      */
/* ------------------------------------------------------------------ */

function oldNeedsMd(): string {
  return [
    `# Needs: 01-build-illustration`,
    ``,
    `## Description`,
    ``,
    SAMPLE_DESCRIPTION,
    ``,
    `## Inputs`,
    ``,
    `- \`in/manifest.json\``,
    `- \`in/*.png\``,
    ``,
    `## Expected Outputs`,
    ``,
    `- \`out/foo.png\``,
    `- \`out/bar.png\``,
    ``,
    `## Checks`,
    ``,
    `- **lint**: eslint`,
    `- **test**: vitest`,
    ``,
  ].join("\n");
}

function oldNeedsResultMd(): string {
  return [
    `# NEEDS.result.md — Attempt 1`,
    ``,
    `## Input State`,
    ``,
    `### \`in/manifest.json\``,
    `✓ **1 file(s)**`,
    ``,
    `- \`in/manifest.json\``,
    ``,
    `### \`in/*.png\``,
    `✓ **4 file(s)**`,
    ``,
    `- \`in/a.png\``,
    `- \`in/b.png\``,
    `- \`in/c.png\``,
    `- \`in/d.png\``,
    ``,
    `## Status`,
    ``,
    `✅ **READY** — 2 input pattern(s) satisfied`,
    ``,
    `Attempt 1 — 2 output(s) expected`,
    ``,
  ].join("\n");
}

function oldTaskMd(): string {
  return [
    `# Task: 01-build-illustration`,
    ``,
    SAMPLE_SKILL_BODY,
    ``,
  ].join("\n");
}

function oldCheckMd(): string {
  return [
    `# Checks: 01-build-illustration`,
    ``,
    `All checks must pass for this task to be considered complete.`,
    `Run each command from the project root. Fix failures and re-run.`,
    ``,
    `## lint`,
    `**Description**: eslint`,
    `**Command**: \`pnpm lint\``,
    ``,
    `## test`,
    `**Description**: vitest`,
    `**Command**: \`pnpm test\``,
    ``,
  ].join("\n");
}

/** Reconstruct the OLD prompt that asked the AI to read those files. */
function oldPromptRetry(): string {
  return [
    `Executing task (attempt 2).`,
    ``,
    `## Read`,
    ``,
    `1. **attempts/wip/NEEDS.result.md** — Available inputs`,
    `2. **attempts/wip/TASK.md** — Task definition`,
    `3. **attempts/wip/CHECK.md** — Validation checks`,
    ``,
    `## Execute`,
    ``,
    `Follow TASK.md instructions.`,
    `Run all checks in CHECK.md to verify.`,
    ``,
    `If a check fails and you can't fix it:`,
    `1. Write LEARN.md explaining the failure`,
    `2. Stop (framework will analyze)`,
  ].join("\n");
}

function oldPromptFirstRun(): string {
  return [
    `Executing task (attempt 1).`,
    ``,
    `## Read`,
    ``,
    `1. **attempts/wip/NEEDS.result.md** — Available inputs`,
    `2. **attempts/wip/TASK.md** — Task definition`,
    `3. **attempts/wip/CHECK.md** — Validation checks`,
    ``,
    `## Execute`,
    ``,
    `Follow TASK.md instructions.`,
    `Run all checks in CHECK.md to verify.`,
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/*  New approach: build the packet from the same data                 */
/* ------------------------------------------------------------------ */

function newPacketFirstRun(): AIContextPacket {
  const inputs: PacketInputs = {
    attempt: baseAttempt(),
    situation: "first-run",
    sourceSummary: SAMPLE_SKILL_BODY,
  };
  return buildPacket(inputs);
}

function newPacketRetryCheckFailed(): AIContextPacket {
  const attempt = baseAttempt();
  attempt.attempt = 2;
  attempt.status = "failed";
  const inputs: PacketInputs = {
    attempt,
    situation: classifySituation({
      attempt,
      hasPriorAttempt: true,
      priorStatus: "failed",
      hasHumanReview: false,
      producerChanged: false,
      isDefinitionIssue: false,
    }),
  };
  return buildPacket(inputs);
}

function newPacketRetryCheckFailedRendered(): string {
  return `## Attempt 2\n\n${renderPacket(newPacketRetryCheckFailed())}`;
}

function newPacketFirstRunRendered(): string {
  return `## Attempt 1\n\n${renderPacket(newPacketFirstRun())}`;
}

/* ------------------------------------------------------------------ */
/*  Metrics                                                            */
/* ------------------------------------------------------------------ */

interface Metrics {
  promptChars: number;
  approxTokens: number;
  readDirectives: number;
  filesAgentMustRead: number;
  filesWritten: number;
}

function countReadDirectives(s: string): number {
  const matches = s.match(/(?:read|Read|see|See)\s+[`*]?[\w/.-]+\.(md|jsonl?|log)/g);
  return matches?.length ?? 0;
}

/**
 * Approximate token count.
 *
 * Accepts either:
 *  - a string of text (counts its length and divides by 4), or
 *  - a number already representing a character count (e.g. the sum
 *    of prompt length + file reads in a scenario).
 */
function approxTokens(s: string | number): number {
  const charCount = typeof s === "number" ? s : s.length;
  return Math.ceil(charCount / 4);
}

function metrics(
  prompt: string,
  filesAgentMustRead: string[],
  filesWritten: string[],
): Metrics {
  return {
    promptChars: prompt.length,
    approxTokens: approxTokens(prompt),
    readDirectives: countReadDirectives(prompt),
    filesAgentMustRead: filesAgentMustRead.length,
    filesWritten: filesWritten.length,
  };
}

/* ------------------------------------------------------------------ */
/*  Report                                                             */
/* ------------------------------------------------------------------ */

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

function report(label: string, old: Metrics, neu: Metrics): void {
  const cols = [
    ["Metric", 24],
    ["Old", 14],
    ["New", 14],
    ["Δ", 14],
  ] as const;
  const header = cols
    .map(([name, w]) => pad(name, w))
    .join(" | ");
  const sep = cols.map(([, w]) => "-".repeat(w)).join("-+-");
  console.log(`\n# ${label}\n`);
  console.log(header);
  console.log(sep);
  const rows: Array<[string, number, number, (o: number, n: number) => string]> = [
    ["prompt chars", old.promptChars, neu.promptChars, (o, n) => formatDelta(o, n)],
    ["approx tokens (prompt only)", old.approxTokens, neu.approxTokens, (o, n) => formatDelta(o, n)],
    ["read .md/.json/.log directives in prompt", old.readDirectives, neu.readDirectives, (o, n) => formatDelta(o, n)],
    ["files agent must read to act", old.filesAgentMustRead, neu.filesAgentMustRead, (o, n) => formatDelta(o, n)],
    ["files written per attempt", old.filesWritten, neu.filesWritten, (o, n) => formatDelta(o, n)],
  ];
  for (const [name, o, n, fmt] of rows) {
    console.log(
      [pad(name, 24), pad(String(o), 14), pad(String(n), 14), pad(fmt(o, n), 14)].join(" | "),
    );
  }
}

function formatDelta(o: number, n: number): string {
  if (o === 0) return n === 0 ? "0" : `+${n}`;
  const diff = n - o;
  const pct = Math.round((diff / o) * 100);
  if (diff === 0) return "0";
  return `${diff > 0 ? "+" : ""}${diff} (${pct > 0 ? "+" : ""}${pct}%)`;
}

function totalScenario(
  prompt: string,
  filesAgentReads: string[],
  filesWritten: string[],
): { prompt: string; agentFiles: string[]; written: string[] } {
  return { prompt, agentFiles: filesAgentReads, written: filesWritten };
}

/* ------------------------------------------------------------------ */
/*  Run                                                                */
/* ------------------------------------------------------------------ */

function run(): void {
  // ── Scenario 1: first run ─────────────────────────────────────────
  // Old: agent reads 3 MD files (NEEDS.result, TASK, CHECK) before acting.
  // New: agent reads no files; the packet is the prompt.
  const firstRunOld = totalScenario(
    oldPromptFirstRun(),
    [oldNeedsResultMd(), oldTaskMd(), oldCheckMd()],
    [oldNeedsMd(), oldNeedsResultMd(), oldTaskMd(), oldCheckMd()],
  );
  const firstRunNew = totalScenario(
    newPacketFirstRunRendered(),
    [],
    [
      // attempt.json is the source of truth.
      "attempt.json (TaskAttemptContext — ~700 chars for this sample)",
      // The 4 derived MD views are still written by default (writeMarkdown: true).
      oldNeedsMd(),
      oldNeedsResultMd(),
      oldTaskMd(),
      oldCheckMd(),
    ],
  );

  // For the "total tokens consumed" comparison we add the chars the
  // agent would have had to read under the old approach. The new
  // approach is self-contained.
  const firstRunOldTotal =
    firstRunOld.prompt.length +
    firstRunOld.agentFiles.reduce((s, f) => s + f.length, 0);
  const firstRunNewTotal = firstRunNew.prompt.length;

  // ── Scenario 2: retry after check failure ────────────────────────
  const retryOld = totalScenario(
    oldPromptRetry(),
    [oldNeedsResultMd(), oldTaskMd(), oldCheckMd()],
    [oldNeedsMd(), oldNeedsResultMd(), oldTaskMd(), oldCheckMd()],
  );
  const retryNew = totalScenario(
    newPacketRetryCheckFailedRendered(),
    [],
    [
      "attempt.json (TaskAttemptContext — ~700 chars for this sample)",
      oldNeedsMd(),
      oldNeedsResultMd(),
      oldTaskMd(),
      oldCheckMd(),
    ],
  );
  const retryOldTotal =
    retryOld.prompt.length +
    retryOld.agentFiles.reduce((s, f) => s + f.length, 0);
  const retryNewTotal = retryNew.prompt.length;

  // ── Report ────────────────────────────────────────────────────────
  console.log("\n================================================================");
  console.log(" RFC 0048 efficiency benchmark — old (file-based) vs. new (packet)");
  console.log("================================================================");

  console.log("\n# Disk footprint (files written per attempt)");
  console.log("---------------------------------------------");
  console.log("OLD: NEEDS.md, NEEDS.result.md, TASK.md, CHECK.md, + result/learn artifacts");
  console.log("     (~5 markdown files + data/*.json for results)");
  console.log("NEW: attempt.json (source of truth) + the same 4 derived MD views");
  console.log("     The MD views are written by default for human inspection and recovery.");
  console.log("     Set writeMarkdown:false to skip them.");
  console.log("     → Disk footprint is roughly the same; the difference is in *who reads* them.");

  report(
    "First run",
    metrics(firstRunOld.prompt, firstRunOld.agentFiles, firstRunOld.written),
    metrics(firstRunNew.prompt, firstRunNew.agentFiles, firstRunNew.written),
  );
  console.log(
    `\n   Total chars (prompt + agent file reads): ` +
      `OLD ${firstRunOldTotal}  vs  NEW ${firstRunNewTotal}  (${formatDelta(firstRunOldTotal, firstRunNewTotal)})`,
  );
  console.log(
    `   Total approx tokens (prompt + agent file reads): ` +
      `OLD ${approxTokens(firstRunOldTotal)}  vs  NEW ${approxTokens(firstRunNewTotal)}  ` +
      `(${formatDelta(approxTokens(firstRunOldTotal), approxTokens(firstRunNewTotal))})`,
  );

  report(
    "Retry after check failure",
    metrics(retryOld.prompt, retryOld.agentFiles, retryOld.written),
    metrics(retryNew.prompt, retryNew.agentFiles, retryNew.written),
  );
  console.log(
    `\n   Total chars (prompt + agent file reads): ` +
      `OLD ${retryOldTotal}  vs  NEW ${retryNewTotal}  (${formatDelta(retryOldTotal, retryNewTotal)})`,
  );
  console.log(
    `   Total approx tokens (prompt + agent file reads): ` +
      `OLD ${approxTokens(retryOldTotal)}  vs  NEW ${approxTokens(retryNewTotal)}  ` +
      `(${formatDelta(approxTokens(retryOldTotal), approxTokens(retryNewTotal))})`,
  );

  // ── Side-by-side prompts ─────────────────────────────────────────
  console.log("\n================================================================");
  console.log(" Side-by-side prompt comparison (first run)");
  console.log("================================================================");
  console.log("\n--- OLD PROMPT (asks the agent to read 3 files) ---\n");
  console.log(firstRunOld.prompt);
  console.log("\n--- Files the agent must then read under the old approach ---");
  for (const f of firstRunOld.agentFiles) {
    console.log("\n>>> " + f.split("\n")[0]);
    console.log(f);
  }

  console.log("\n--- NEW PROMPT (self-contained packet) ---\n");
  console.log(firstRunNew.prompt);

  console.log("\n================================================================");
  console.log(" Side-by-side prompt comparison (retry after check failure)");
  console.log("================================================================");
  console.log("\n--- OLD PROMPT (asks the agent to read 3 files) ---\n");
  console.log(retryOld.prompt);

  console.log("\n--- NEW PROMPT (self-contained retry packet) ---\n");
  console.log(retryNew.prompt);

  // ── Qualitative wins ─────────────────────────────────────────────
  console.log("\n================================================================");
  console.log(" Qualitative wins of the new approach");
  console.log("================================================================");
  const wins = [
    [
      "Directness",
      "Old prompt says 'read 3 files'. New prompt tells the AI exactly what to do, how, and how to verify — no discovery.",
    ],
    [
      "Distraction",
      "Old files contain headers/formatting/markdown noise. The packet is structured and minimal.",
    ],
    [
      "Latency",
      "Old: 1 prompt + 3 file reads (4 round-trips). New: 1 prompt (1 round-trip).",
    ],
    [
      "Reliability",
      "Old files can be stale (LEARN.md from a prior attempt, mid-run edits). Packet is derived from the live attempt context.",
    ],
    [
      "Recoverability",
      "MD views are still written (writeMarkdown: true default) for human inspection and crash recovery. attempt.json is the source of truth.",
    ],
    [
      "Determinism",
      "Packet is a pure function of (attempt, situation, source summary). Same inputs = same prompt. The old file-read prompt was sensitive to file content and ordering.",
    ],
    [
      "Context window efficiency",
      "Packet is curated per situation. Retry packets contain only failing outputs/checks + retry hints. Old files contained everything whether the AI needed it or not.",
    ],
    [
      "Repair prompt hygiene",
      "No stale `executions/<runId>/tasks/<taskId>/` paths, no contradictory 'read the journal / don't edit the journal' rules, no cross-attempt file confusion.",
    ],
  ];
  for (const [name, desc] of wins) {
    console.log(`\n• ${name}: ${desc}`);
  }

  console.log("\n");
}

run();
