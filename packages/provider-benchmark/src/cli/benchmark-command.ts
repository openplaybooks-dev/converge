/**
 * CLI handler for `converge benchmark`.
 *
 * Deep journal analysis tool. Point at a journal directory, get
 * detailed metrics including per-tool timing, thinking breakdowns,
 * and failure patterns.
 */

import { resolve, join } from "node:path";
import { existsSync, writeFileSync } from "node:fs";
import { analyzeJournal } from "../analysis/session-analyzer.ts";
import { printAnalysisResult } from "../format/table-formatter.ts";
import { toJSON, toMinimalJSON } from "../format/json-formatter.ts";

export interface BenchmarkCommandOptions {
  /** Journal directory to analyze (default: .converge/journal) */
  journalDir?: string;
  /** Filter to a specific playbook subdirectory */
  playbook?: string;
  /** Label for this analysis run */
  label?: string;
  /** Tag with provider name */
  provider?: string;
  /** Tag with model name */
  model?: string;
  /** Output as JSON instead of table */
  json?: boolean;
  /** Output minimal JSON (no verbose arrays) */
  minimal?: boolean;
  /** Save result to file */
  save?: string;
  /** Enable deep .index.jsonl analysis */
  deep?: boolean;
}

export async function benchmarkCommand(
  options: BenchmarkCommandOptions = {},
): Promise<void> {
  // The CLI arg parser treats non-`=` boolean flags as consuming the next arg.
  // If --deep received a path string rather than boolean true, use it as journalDir.
  let journalDir: string;
  const deep =
    options.deep === true || typeof options.deep === "string";

  if (typeof options.journalDir === "string") {
    journalDir = resolve(options.journalDir);
  } else if (typeof options.deep === "string") {
    // --deep consumed the journal dir path
    journalDir = resolve(options.deep as unknown as string);
  } else {
    // Default: .converge/journal relative to cwd
    const projectDir = resolve(process.cwd());
    journalDir = join(projectDir, ".converge", "journal");
  }

  if (!existsSync(journalDir)) {
    console.log(`Journal directory not found: ${journalDir}`);
    console.log("Run a playbook first, then analyze the journal.");
    return;
  }

  console.log(`Analyzing journal: ${journalDir}`);
  if (deep) console.log("  (deep .index.jsonl analysis enabled)");

  const result = await analyzeJournal({
    journalDir,
    provider: options.provider,
    model: options.model,
    label: options.label,
    deep,
    playbook: options.playbook,
  });

  if (options.json || options.minimal) {
    const json = options.minimal
      ? toMinimalJSON(result)
      : toJSON(result);
    console.log(json);

    if (options.save) {
      const savePath = resolve(options.save);
      writeFileSync(savePath, json, "utf-8");
      console.log(`\nSaved to ${savePath}`);
    }
  } else {
    printAnalysisResult(result);

    if (options.save) {
      const savePath = resolve(options.save);
      writeFileSync(savePath, toJSON(result), "utf-8");
      console.log(`\nSaved to ${savePath}`);
    }

    console.log(""); // trailing newline
  }
}
