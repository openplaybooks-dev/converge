/**
 * Converge Config Validator
 *
 * Validates `ConvergeConfig` objects with clear, actionable error messages.
 * Uses Zod (already a project dependency from `src/storage/types.ts`).
 *
 * Validation is intentionally lenient: most fields are optional, and
 * unknown keys are stripped rather than rejected. The goal is to catch
 * clear mistakes (missing `name`, wrong types) early with good messages.
 */

import { z } from "zod";
import type { ConvergeConfig } from "./types.ts";

/* ------------------------------------------------------------------ */
/*  Sub-schemas                                                        */
/* ------------------------------------------------------------------ */

const DiscoveryConfigSchema = z
  .object({
    tasks: z.array(z.string()).optional(),
    epics: z.array(z.string()).optional(),
    checks: z.array(z.string()).optional(),
    plans: z.array(z.string()).optional(),
    agents: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
    watch: z.boolean().optional(),
    spawn: z.enum(["subtasks-only", "unrestricted"]).optional(),
  })
  .strict();

const RuntimeConfigSchema = z
  .object({
    maxStallCount: z.number().int().positive().optional(),
    parallelExecution: z.boolean().optional(),
    maxParallelTasks: z.number().int().positive().optional(),
    enableCheckpoints: z.boolean().optional(),
    logLevel: z.enum(["debug", "info", "warn", "error"]).optional(),
    jsonLogs: z.boolean().optional(),
    milestone: z.string().optional(),
  })
  .strict();

// Plugin entry: string | [string, object] | { name, options? }
const PluginEntrySchema = z.union([
  z.string(),
  z.tuple([z.string(), z.record(z.unknown())]),
  z.object({ name: z.string(), options: z.record(z.unknown()).optional() }),
]);

/* ------------------------------------------------------------------ */
/*  Root Schema                                                        */
/* ------------------------------------------------------------------ */

const ConvergeConfigSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  dir: z.string().optional(),
  discovery: DiscoveryConfigSchema.optional(),
  plugins: z.array(PluginEntrySchema).optional(),
  variables: z.record(z.unknown()).optional(),
  // hooks: validated structurally but not deeply (functions can't be Zod-validated)
  hooks: z.record(z.function()).optional(),
  runtime: RuntimeConfigSchema.optional(),
  agents: z.record(z.string()).optional(),
  skills: z.record(z.string()).optional(),
});

/* ------------------------------------------------------------------ */
/*  Validator                                                          */
/* ------------------------------------------------------------------ */

/**
 * Validate a converge config object. Throws with a clear, multi-line
 * error message listing all issues found.
 *
 * @param config - Raw object (parsed from PROJECT.md frontmatter)
 * @param source - Config file path (included in error messages)
 * @returns The validated config (unknown fields stripped)
 */
export function validateConvergeConfig(
  config: unknown,
  source = "PROJECT.md",
): ConvergeConfig {
  const result = ConvergeConfigSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => {
        const path = e.path.length > 0 ? e.path.join(".") : "(root)";
        return `  · ${path}: ${e.message}`;
      })
      .join("\n");

    throw new Error(
      `Invalid configuration in ${source}:\n${errors}\n\n` +
        `Tip: See PROJECT.md format reference.`,
    );
  }

  return result.data as ConvergeConfig;
}
