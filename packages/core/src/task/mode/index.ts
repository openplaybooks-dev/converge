/**
 * RFC 0022 — Task mode contract.
 *
 * Public surface for the typed `mode:` field, mode inference (back-compat),
 * post-body validator, and converger wave loop. The four modes (task,
 * spawner, converger, gateway) are the structural fix for the
 * five-way silence problem in the runtime (RFC 0022 §Problem).
 */
export {
  TaskModeSchema,
  SpawnerConfigSchema,
  ConvergerConfigSchema,
  ModeCheckSchema,
  parseTaskModeFrontmatter,
  type TaskMode,
  type SpawnerConfig,
  type ConvergerConfig,
  type ModeCheck,
  type ParsedModeFrontmatter,
  type ModeParseResult,
  type RawModeInput,
} from "./schema.ts";

export { inferMode } from "./inference.ts";

export {
  validatePostBody,
  type ModeErrorCode,
  type ModeValidation,
  type TaskModeView,
  type ValidatorContext,
} from "./validator.ts";

export {
  runConvergerWave,
  type WaveContext,
  type WaveExecutor,
  type WaveOutcome,
} from "./converger.ts";
