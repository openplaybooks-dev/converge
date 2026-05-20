/**
 * RFC 0021 — Declarative spawn manifests (internal IR).
 * RFC 0024 — AI-native spawn invocation (the AI's surface).
 *
 * Public surface:
 *   - `applyManifest`: ingest a JSONL manifest, render TASK.md, upsert into
 *     tasks.jsonl, write a structured per-row result file. (RFC 0021)
 *   - `parseManifestText`, `SpawnRowSchema`: schema for the manifest.
 *   - `execDirFor`, `ensureExecDir`: per-task execution directory plumbing.
 *   - `ingestSpawnDir`: post-body preview→apply pipeline for `spawn.yml`
 *     invocations. (RFC 0024 — the orchestrator the new spawner mode uses.)
 *   - `loadTemplates`, `findTemplate`: template registry.
 *   - `discoverInvocations`: scan `spawn/` for `<id>/spawn.yml` files.
 *   - `expandInvocation`: render one invocation into a `SpawnRow`.
 *   - `writeStatusMarkdown`: the single AI-facing transparency surface.
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
  discoverInvocations,
  type DiscoveredInvocation,
  type SpawnInvocation,
  type SpawnFileEvidence,
  type SpawnFileErrorCode,
  type DiscoveryResult,
} from "./discover.ts";
export {
  expandInvocation,
  type ExpandedRow,
  type ExpandResult,
} from "./expand.ts";
export {
  detectStrayManifests,
  detectStrayTaskMd,
} from "./strays.ts";
export {
  writeStatusMarkdown,
  type StatusSummary,
  type StatusOkRow,
} from "./status.ts";
export {
  ingestSpawnDir,
  type IngestOptions,
  type IngestReport,
} from "./ingest.ts";
