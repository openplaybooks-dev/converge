/**
 * Buggy Check Relaxer — Agent-driven check rewrite.
 *
 * The agent can flag a check it believes is wrong by writing `BUGGY_CHECK.md`
 * in its wip directory. After the attempt finishes, the runner reads the
 * file, validates it (the proposed cmd must lint cleanly), and rewrites the
 * check inside the materialized TASK.md so the next attempt picks it up.
 *
 * The source TASK.md (under .converge/playbooks/) is left untouched. Auto-
 * relaxation only persists for the current run's journal copy.
 *
 * BUGGY_CHECK.md format:
 *
 *   ---
 *   check_id: <id of the check the agent thinks is wrong>
 *   reason: <one sentence — what's wrong with the original predicate>
 *   proposed_cmd: <the corrected shell command>
 *   ---
 *
 *   Optional free-form notes after the frontmatter.
 *
 * The runner only auto-applies if:
 *   1. The proposed cmd is not a tautology against an empty sandbox
 *      (we'd be relaxing a real check into a fake one — refuse).
 *   2. The proposed cmd has valid bash syntax.
 *   3. The check_id matches a check in the materialized TASK.md.
 *
 * Otherwise, the BUGGY_CHECK.md is preserved but ignored, and a warning
 * is logged so a human can review.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface BuggyCheckProposal {
  checkId: string;
  reason: string;
  proposedCmd: string;
  notes?: string;
}

export type RelaxOutcome =
  | { applied: true; checkId: string; oldCmd: string; newCmd: string }
  | { applied: false; reason: string };

/* ------------------------------------------------------------------ */
/*  Parsing                                                            */
/* ------------------------------------------------------------------ */

/** Parse the agent's BUGGY_CHECK.md frontmatter. */
export async function readBuggyCheckProposal(
  wipDir: string,
): Promise<BuggyCheckProposal | null> {
  const path = join(wipDir, "BUGGY_CHECK.md");
  if (!existsSync(path)) return null;

  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return null;
  }

  // Frontmatter block: ---\n...\n---
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;

  let parsed: Record<string, unknown>;
  try {
    parsed = parseYaml(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }

  const checkId = parsed.check_id ? String(parsed.check_id) : "";
  const reason = parsed.reason ? String(parsed.reason) : "";
  const proposedCmd = parsed.proposed_cmd ? String(parsed.proposed_cmd) : "";

  if (!checkId || !proposedCmd) return null;

  return {
    checkId,
    reason: reason || "(no reason given)",
    proposedCmd,
    notes: match[2]?.trim() || undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Validation                                                         */
/* ------------------------------------------------------------------ */

/**
 * Cheap safety net: refuse to apply a proposal whose cmd would be a
 * tautology (passes against an empty sandbox). Otherwise the agent could
 * relax a strict check into something trivially true.
 */
async function validateProposal(
  proposal: BuggyCheckProposal,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const { exec } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execAsync = promisify(exec);
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");

  // 1. Syntax check
  try {
    const escaped = proposal.proposedCmd.replace(/'/g, "'\\''");
    await execAsync(`bash -n -c '${escaped}'`, { timeout: 5_000 });
  } catch (err: unknown) {
    return {
      ok: false,
      reason: `proposed cmd has bash syntax error: ${(err as Error).message}`,
    };
  }

  // 2. Tautology check — the proposed cmd must NOT pass against an empty dir.
  const sandbox = await mkdtemp(join(tmpdir(), "converge-relax-"));
  try {
    try {
      await execAsync(proposal.proposedCmd, {
        cwd: sandbox,
        timeout: 10_000,
        shell: "/bin/bash",
      });
      // Passed → refuse.
      return {
        ok: false,
        reason:
          "proposed cmd passes against empty sandbox — would replace a real " +
          "check with a tautology",
      };
    } catch {
      // Failed against empty → that's correct behaviour for a real check.
      return { ok: true };
    }
  } finally {
    await rm(sandbox, { recursive: true, force: true }).catch(() => {});
  }
}

/* ------------------------------------------------------------------ */
/*  Application                                                        */
/* ------------------------------------------------------------------ */

/**
 * Patch the cmd of a check inside CHECK.md (the journal's check spec).
 *
 * CHECK.md format is predictable:
 *   ## {checkId}
 *   **Description**: ...
 *   **Command**: `old cmd`
 *
 * Also writes data/check-relaxation.json so the relaxation persists
 * across attempts — writeContextSnapshot reads it for the next attempt.
 */
async function applyToCheckMd(
  attemptDir: string,
  checkId: string,
  newCmd: string,
): Promise<{ applied: boolean; oldCmd?: string }> {
  const checkMdPath = join(attemptDir, "CHECK.md");
  if (!existsSync(checkMdPath)) return { applied: false };

  const raw = await readFile(checkMdPath, "utf-8");

  // Find the check section and extract the current command
  const sectionRegex = new RegExp(
    `## ${escapeRegex(checkId)}\\n\\*\\*Description\\*\\*: [^\\n]*\\n\\*\\*Command\\*\\*: \`([^\`]+)\``,
    "m",
  );
  const match = raw.match(sectionRegex);
  if (!match) return { applied: false };

  const oldCmd = match[1];
  const updated = raw.replace(
    `## ${checkId}\n**Description**: ${match[0].split("\n**Description**: ")[1].split("\n**Command**")[0]}\n**Command**: \`${oldCmd}\``,
    `## ${checkId}\n**Description**: ${match[0].split("\n**Description**: ")[1].split("\n**Command**")[0]}\n**Command**: \`${newCmd}\``,
  );

  if (updated === raw) return { applied: false };

  await writeFile(checkMdPath, updated);

  // Persist the relaxation so writeContextSnapshot can re-apply it for the
  // next attempt (which regenerates CHECK.md from source checks).
  await mkdir(join(attemptDir, "data"), { recursive: true });
  await writeFile(
    join(attemptDir, "data", "check-relaxation.json"),
    JSON.stringify({ checkId, newCmd, oldCmd, appliedAt: new Date().toISOString() }),
  );

  return { applied: true, oldCmd };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

/**
 * Read BUGGY_CHECK.md from the wip dir, validate it, and apply the proposed
 * cmd to the materialized TASK.md. Safe to call after every attempt — it's
 * a no-op when no proposal is present.
 *
 * Returns the outcome so the caller can log it.
 */
export async function tryRelaxBuggyCheck(
  wipDir: string,
): Promise<RelaxOutcome> {
  const proposal = await readBuggyCheckProposal(wipDir);
  if (!proposal) return { applied: false, reason: "no BUGGY_CHECK.md present" };

  const validation = await validateProposal(proposal);
  if (!validation.ok) {
    return { applied: false, reason: validation.reason };
  }

  const result = await applyToCheckMd(
    wipDir,
    proposal.checkId,
    proposal.proposedCmd,
  );

  if (!result.applied) {
    return {
      applied: false,
      reason: `check_id "${proposal.checkId}" not found in CHECK.md`,
    };
  }

  return {
    applied: true,
    checkId: proposal.checkId,
    oldCmd: result.oldCmd ?? "(unknown)",
    newCmd: proposal.proposedCmd,
  };
}

/**
 * Load relaxations from a previous attempt so writeContextSnapshot can
 * re-apply them when generating CHECK.md for the next attempt (which
 * always starts from source checks).
 */
export async function loadRelaxationsFromPreviousAttempt(
  attemptDir: string,
): Promise<Array<{ checkId: string; newCmd: string }>> {
  const relaxPath = join(attemptDir, "data", "check-relaxation.json");
  if (!existsSync(relaxPath)) return [];
  try {
    const raw = await readFile(relaxPath, "utf-8");
    const parsed = JSON.parse(raw) as { checkId: string; newCmd: string };
    return [parsed];
  } catch {
    return [];
  }
}
