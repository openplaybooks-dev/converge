/**
 * Dataset loader — downloads SWE-bench Lite from HuggingFace and caches locally.
 *
 * Cache location: ~/.cache/converge/swebench/swe-bench-lite.json
 * Source: HuggingFace datasets API (parquet → JSON via the rows API)
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { SWEBenchInstance } from "./types.ts";

const CACHE_DIR = join(homedir(), ".cache", "converge", "swebench");
const CACHE_FILE = join(CACHE_DIR, "swe-bench-lite.json");

/**
 * HuggingFace datasets API endpoint for SWE-bench Lite.
 * Uses the rows API which returns JSON directly — no parquet parsing needed.
 */
const HF_API_BASE =
  "https://datasets-server.huggingface.co/rows?dataset=princeton-nlp%2FSWE-bench_Lite&config=default&split=test";

/** Max rows per HuggingFace API request */
const PAGE_SIZE = 100;

/**
 * Load the SWE-bench Lite dataset.
 * Returns cached data if available, otherwise downloads from HuggingFace.
 */
export async function loadDataset(opts?: {
  /** Force re-download even if cached */
  forceRefresh?: boolean;
  /** Custom cache directory */
  cacheDir?: string;
}): Promise<SWEBenchInstance[]> {
  const cacheFile = opts?.cacheDir
    ? join(opts.cacheDir, "swe-bench-lite.json")
    : CACHE_FILE;
  const cacheDir = opts?.cacheDir ?? CACHE_DIR;

  // Return cached if available
  if (!opts?.forceRefresh && existsSync(cacheFile)) {
    const raw = await readFile(cacheFile, "utf-8");
    return JSON.parse(raw) as SWEBenchInstance[];
  }

  // Download from HuggingFace
  const instances: SWEBenchInstance[] = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const url = `${HF_API_BASE}&offset=${offset}&length=${PAGE_SIZE}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to fetch SWE-bench dataset: ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as {
      rows: Array<{ row: SWEBenchInstance }>;
      num_rows_total: number;
    };

    for (const { row } of data.rows) {
      instances.push(row);
    }

    offset += data.rows.length;
    hasMore = offset < data.num_rows_total && data.rows.length > 0;
  }

  // Cache to disk
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cacheFile, JSON.stringify(instances, null, 2), "utf-8");

  return instances;
}
