/**
 * Sprint/goal reconciliation — cross-check the "honest" reflection.md against
 * the "claimed" result.json so the framework catches the failure mode where
 * verify reports success but the AI's own retrospective admits otherwise.
 *
 * This is the framework's backpressure against shallow goal checks. Even if
 * `converge goals done` passes (because the checks are weak), this layer
 * compares verbatim what the reflection says vs. what the result claims and
 * surfaces the contradiction as a `contradictory-finding` gap.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Negation phrases that, when present in a reflection's "What was built" or
 * "What diverged" sections, indicate honest admission of partial failure.
 * The list is intentionally conservative — false positives would erode trust.
 */
const NEGATION_PATTERNS: RegExp[] = [
  /\bwas not (created|written|rewritten|implemented|finished|completed)\b/i,
  /\bwere not (created|written|rewritten|implemented|finished|completed)\b/i,
  /\bnot fully\b/i,
  /\bnot completed?\b/i,
  /\bskipped\b/i,
  /\bdiverged\b/i,
  /\bretained (the )?placeholder\b/i,
  /\bbootstrap placeholder\b/i,
  /\bstub(s|bed)?\b/i,
  /\bTODO\b/,
  /\bdid not (run|complete|finish|spawn)\b/i,
];

export interface ReconciliationFinding {
  sprintDir: string;
  goalId?: string;
  resultPassed: boolean;
  reflectionAdmitsFailure: boolean;
  evidence: {
    matchedPattern: string;
    matchedLine: string;
  }[];
  /** True if (claimed pass) AND (reflection admits failure). */
  contradictory: boolean;
}

/**
 * Reconcile one sprint's reflection.md against result.json.
 */
export function reconcileSprint(sprintDir: string): ReconciliationFinding | null {
  const reflectionPath = join(sprintDir, "reflection.md");
  const resultPath = join(sprintDir, "result.json");

  if (!existsSync(reflectionPath) || !existsSync(resultPath)) return null;

  let resultPassed = false;
  let goalId: string | undefined;
  try {
    const result = JSON.parse(readFileSync(resultPath, "utf8")) as {
      passed?: boolean;
      goalId?: string;
    };
    resultPassed = result.passed === true;
    goalId = result.goalId;
  } catch {
    return null;
  }

  const reflection = readFileSync(reflectionPath, "utf8");
  const lines = reflection.split("\n");
  const evidence: ReconciliationFinding["evidence"] = [];

  for (const line of lines) {
    // Skip markdown section headings ("## What diverged…") — those are
    // structural template scaffolding, not actual divergence claims. Match
    // only against bullet items and prose paragraphs.
    const trimmed = line.trim();
    if (trimmed.startsWith("#")) continue;
    if (trimmed === "") continue;

    for (const pat of NEGATION_PATTERNS) {
      if (pat.test(line)) {
        evidence.push({
          matchedPattern: pat.toString(),
          matchedLine: trimmed.slice(0, 200),
        });
        // Don't double-count a single line on multiple patterns.
        break;
      }
    }
  }

  const admits = evidence.length > 0;

  return {
    sprintDir,
    goalId,
    resultPassed,
    reflectionAdmitsFailure: admits,
    evidence,
    contradictory: resultPassed && admits,
  };
}

/**
 * Reconcile every sprint under `.converge/artifacts/<playbook>/sprints/`.
 * Returns only contradictory findings unless `includeAll` is true.
 */
export function reconcileAllSprints(
  workspace: string,
  playbook: string,
  options: { includeAll?: boolean } = {},
): ReconciliationFinding[] {
  const sprintsRoot = join(
    workspace,
    ".converge",
    "artifacts",
    playbook,
    "sprints",
  );
  if (!existsSync(sprintsRoot)) return [];

  const findings: ReconciliationFinding[] = [];
  for (const entry of readdirSync(sprintsRoot)) {
    const dir = join(sprintsRoot, entry);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const finding = reconcileSprint(dir);
    if (!finding) continue;
    if (options.includeAll || finding.contradictory) {
      findings.push(finding);
    }
  }
  return findings;
}

/**
 * Phantom work items: ids appearing in any sprint's work-items.json that
 * never produced a journal entry. Mirrors the wait-many phantom detector
 * but operates retrospectively across all sprints.
 */
export interface PhantomFinding {
  sprintDir: string;
  workItemsPath: string;
  phantomIds: string[];
}

export function findPhantomWorkItems(
  workspace: string,
  playbook: string,
): PhantomFinding[] {
  const sprintsRoot = join(
    workspace,
    ".converge",
    "artifacts",
    playbook,
    "sprints",
  );
  if (!existsSync(sprintsRoot)) return [];

  const journalRoot = join(workspace, ".converge", "journal", playbook, "tasks");
  const findings: PhantomFinding[] = [];

  for (const entry of readdirSync(sprintsRoot)) {
    const dir = join(sprintsRoot, entry);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const workItemsPath = join(dir, "work-items.json");
    if (!existsSync(workItemsPath)) continue;
    let ids: string[];
    try {
      const parsed = JSON.parse(readFileSync(workItemsPath, "utf8"));
      if (!Array.isArray(parsed)) continue;
      ids = parsed.map(String);
    } catch {
      continue;
    }
    const phantoms = ids.filter((id) => {
      const journalDir = join(journalRoot, id);
      return !existsSync(journalDir);
    });
    if (phantoms.length > 0) {
      findings.push({
        sprintDir: dir,
        workItemsPath,
        phantomIds: phantoms,
      });
    }
  }
  return findings;
}
