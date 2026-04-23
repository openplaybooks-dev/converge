/**
 * Enriched Prompt Builder
 *
 * Replaces the bare task prompt with a structured document that includes:
 *   1. Context from upstream/sibling tasks (before/context.md)
 *   2. SKILL.md instructions (the body below the --- delimiter)
 *   3. Concrete input file manifest with sizes/mtimes from the snapshot
 *   4. Expected outputs with existence status
 *   5. Checks that must pass
 *
 * Optimization (Meta-Converge inspired):
 *   - Selective context: only includes gap-relevant inputs/checks
 *   - File index mode: lists paths without inline content for large manifests
 *   - Compact gap summary replaces verbose gap descriptions
 *
 * This gives the agent everything it needs to succeed without having to
 * discover inputs by itself — while minimizing token usage.
 */

import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { InputSnapshot } from "./before.ts";
import type { CheckDef } from "./after.ts";
import type { Gap } from "../../task/gap/types.ts";
import { formatCompactGaps } from "../../task/gap/types.ts";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface EnrichedPromptOptions {
  /** Body of SKILL.md below the --- delimiter */
  skillMarkdown: string;
  /** Content of before/context.md (may be empty) */
  contextDoc: string;
  /** Input file snapshot from before phase */
  inputSnapshot: InputSnapshot;
  /** Declared outputs from SKILL.md frontmatter */
  outputs: string[];
  /** Declared checks from SKILL.md frontmatter */
  checks: CheckDef[];
  /** Absolute path to the project directory */
  projectDir: string;
  /** Current gaps to focus context on (Meta-Converge optimization) */
  currentGaps?: Gap[];
  /** Use file index mode (paths only, no sizes/mtimes) for large manifests */
  fileIndexMode?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Main builder                                                        */
/* ------------------------------------------------------------------ */

export async function buildEnrichedPrompt(
  opts: EnrichedPromptOptions,
): Promise<string> {
  const {
    skillMarkdown,
    contextDoc,
    inputSnapshot,
    outputs,
    checks,
    projectDir,
    currentGaps,
    fileIndexMode,
  } = opts;

  const sections: string[] = [];

  // Section 1: Context from upstream tasks
  if (contextDoc && contextDoc.trim() && !contextDoc.includes("_(No prior")) {
    sections.push(`[CONTEXT FROM PRIOR TASKS]\n${contextDoc.trim()}`);
  }

  // Section 2: Task instructions (SKILL.md body)
  if (skillMarkdown.trim()) {
    sections.push(`[TASK INSTRUCTIONS]\n${skillMarkdown.trim()}`);
  }

  // Section 3: Input file manifest (selective or full)
  const useFileIndex =
    fileIndexMode ??
    inputSnapshot.inputs.reduce((n, inp) => n + (inp.files?.length ?? 0), 0) >
      30;
  const manifestLines = await buildInputManifest(projectDir, inputSnapshot, {
    currentGaps,
    fileIndexMode: useFileIndex,
  });
  if (manifestLines.length > 0) {
    const readHint =
      currentGaps && currentGaps.length > 0
        ? "\nRead only the files relevant to the current gap — do not process all inputs."
        : "";
    sections.push(
      `[INPUTS AVAILABLE]\nThe following files exist and are ready to read:${readHint}\n${manifestLines.join("\n")}`,
    );
  }

  // Section 4: Expected outputs (highlight missing only if gaps provided)
  const outputLines = await buildOutputStatus(projectDir, outputs, currentGaps);
  if (outputLines.length > 0) {
    sections.push(`[OUTPUTS REQUIRED]\n${outputLines.join("\n")}`);
  }

  // Section 5: Checks to pass (selective: only failing checks if gaps provided)
  const checkLines = buildCheckSection(checks, currentGaps);
  if (checkLines.length > 0) {
    sections.push(
      `[CHECKS TO PASS]\nAfter writing all files, these commands must exit 0:\n${checkLines.join("\n")}`,
    );
  }

  // Section 6: Compact gap summary (Meta-Converge optimization)
  if (currentGaps && currentGaps.length > 0) {
    sections.push(formatCompactGaps(currentGaps));
  }

  return sections.join("\n\n---\n\n");
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

interface ManifestOptions {
  currentGaps?: Gap[];
  fileIndexMode?: boolean;
}

async function buildInputManifest(
  projectDir: string,
  snapshot: InputSnapshot,
  options?: ManifestOptions,
): Promise<string[]> {
  const lines: string[] = [];
  let totalShown = 0;
  const { currentGaps, fileIndexMode } = options ?? {};

  // Determine which input patterns are gap-relevant
  const gapRelevantPatterns = currentGaps
    ? new Set(
        currentGaps
          .filter((g) => g.metadata?.inputPattern)
          .map((g) => g.metadata!.inputPattern as string),
      )
    : null;

  for (const inp of snapshot.inputs) {
    if (!inp.satisfied) {
      lines.push(`  (no files matched: ${inp.pattern})`);
      continue;
    }

    // Selective context: mark non-relevant patterns as summary only
    const isRelevant =
      !gapRelevantPatterns || gapRelevantPatterns.has(inp.pattern);
    const maxPerPattern = isRelevant ? 20 : 3; // Show fewer for non-relevant patterns

    const shown = inp.files.slice(0, maxPerPattern);
    const remaining = inp.files.length - shown.length;

    for (const f of shown) {
      if (fileIndexMode) {
        // File index mode: paths only (saves ~40% tokens per line)
        lines.push(`- ${f.path}`);
      } else {
        const kb = (f.sizeBytes / 1024).toFixed(1);
        const mtime = new Date(f.mtimeMs).toISOString().slice(0, 10);
        lines.push(`- ${f.path} (${kb} KB, modified ${mtime})`);
      }
      totalShown++;
      if (totalShown >= 50) break;
    }

    if (remaining > 0) {
      lines.push(`  ... and ${remaining} more matching \`${inp.pattern}\``);
    }
    if (totalShown >= 50) break;
  }

  return lines;
}

async function buildOutputStatus(
  projectDir: string,
  outputs: string[],
  currentGaps?: Gap[],
): Promise<string[]> {
  const lines: string[] = [];

  // If we have gap context, identify which outputs are missing from gaps
  const missingFromGaps = currentGaps
    ? new Set(
        currentGaps
          .filter((g) => (g.metadata?.gapKind as string) === "output")
          .map((g) => (g.metadata?.outputPath as string) ?? g.description)
          .filter(Boolean),
      )
    : null;

  for (const output of outputs) {
    let exists = false;
    try {
      await stat(join(projectDir, output));
      exists = true;
    } catch {
      /* does not exist */
    }

    if (exists) {
      // When gaps are known, show existing outputs as brief summary
      lines.push(`- ${output}  ✓ exists`);
    } else {
      lines.push(`- ${output}  ← MISSING (must create)`);
    }
  }
  return lines;
}

/**
 * Build check section — when gaps are available, highlight failing checks
 * and show passing checks as brief summary (saves tokens on retries).
 */
function buildCheckSection(checks: CheckDef[], currentGaps?: Gap[]): string[] {
  if (checks.length === 0) return [];

  // If no gap context, show all checks (first attempt)
  if (!currentGaps || currentGaps.length === 0) {
    return checks.map((c) => `- ${c.cmd}  # ${c.description}`);
  }

  // Identify failing check IDs from gaps
  const failingCheckIds = new Set(
    currentGaps
      .filter((g) => (g.metadata?.gapKind as string) === "check")
      .flatMap((g) => g.checks),
  );

  const lines: string[] = [];
  const passingChecks: string[] = [];

  for (const c of checks) {
    if (failingCheckIds.size === 0 || failingCheckIds.has(c.id ?? c.cmd)) {
      // Failing or unknown — show full detail
      lines.push(`- ${c.cmd}  # ${c.description} ← FAILING`);
    } else {
      // Passing — collect for brief summary
      passingChecks.push(c.id ?? c.description);
    }
  }

  if (passingChecks.length > 0) {
    lines.push(
      `- (${passingChecks.length} other checks passing: ${passingChecks.join(", ")})`,
    );
  }

  return lines;
}
