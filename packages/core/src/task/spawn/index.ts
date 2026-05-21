/**
 * RFC 0031 — Declarative spawn manifests (internal IR).
 *
 * Public surface:
 *   - `applyManifest`: ingest a JSONL manifest, render TASK.md, upsert into
 *     tasks.jsonl with unified taskRef + params rows.
 *   - `parseManifestText`, `SpawnRowSchema`: schema for the manifest.
 *   - `execDirFor`, `ensureExecDir`: per-task execution directory plumbing.
 *   - `loadTemplates`, `findTemplate`: template registry.
 *   - `appendUnifiedSpawnRow`: programmatic API for appending spawned tasks.
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

export {
  loadTemplates,
  findTemplate,
  type TemplateDef,
  type TemplateParam,
  type TemplateParamType,
  type TemplateExamples,
} from "./templates.ts";
export {
  appendUnifiedSpawnRow,
  type UnifiedSpawnRow,
} from "./unified-spawn.ts";
