/**
 * RFC 0021 — Declarative spawn manifests.
 *
 * Public surface:
 *   - `applyManifest`: ingest a JSONL manifest, render TASK.md, upsert into
 *     tasks.jsonl, write a structured per-row result file.
 *   - `parseManifestText`, `SpawnRowSchema`: schema for the manifest.
 *   - `execDirFor`, `ensureExecDir`: per-task execution directory plumbing.
 */
export {
  applyManifest,
  type ApplyOptions,
  type ApplyReport,
  type SpawnResult,
} from "./apply.ts";
export {
  parseManifestText,
  SpawnRowSchema,
  type ManifestParseError,
  type ManifestParseResult,
  type SpawnErrorCode,
  type SpawnRow,
} from "./manifest.ts";
export { execDirFor, ensureExecDir } from "./exec-dir.ts";
