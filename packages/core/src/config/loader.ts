/**
 * Converge Config Loader
 *
 * Discovers and loads `.converge/PROJECT.md` or `.converge/project.yaml` from the filesystem,
 * walking up the directory tree like Vite/ESLint/Prettier.
 *
 * PROJECT.md uses YAML frontmatter for structured configuration.
 * project.yaml is pure YAML (no frontmatter) used by the V2 storage system.
 * Hook strings are converted to async functions that spawn scripts.
 *
 * The search walks up from `startDir` to the filesystem root.
 * Returns `null` if no config file is found (CLI falls back to
 * existing behavior — backward compatible).
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { parse as parseYaml } from 'yaml';
import type { ConvergeConfig } from './types.ts';
import type { ConvergeHooks, HookEvent } from '../hooks/types.ts';

/** Legacy config file name inside .converge/ (with YAML frontmatter) */
const LEGACY_CONFIG_NAME = '.converge/PROJECT.md';
/** V2 storage config file name inside .converge/ (pure YAML) */
const V2_CONFIG_NAME = '.converge/project.yaml';

/* ------------------------------------------------------------------ */
/*  Discovery                                                          */
/* ------------------------------------------------------------------ */

/**
 * Config file type
 */
export type ConfigFileType = 'PROJECT.md' | 'project.yaml';

/**
 * Find `.converge/PROJECT.md` or `.converge/project.yaml` by walking up from `startDir`.
 * Prefers PROJECT.md (legacy) but falls back to project.yaml (V2 storage).
 *
 * @returns Object with absolute path and type, or `null` if not found.
 *
 * @example
 * const result = await findConvergeConfig(process.cwd());
 * // → { path: '/my-project/.converge/PROJECT.md', type: 'PROJECT.md' } or null
 */
export async function findConvergeConfig(startDir: string): Promise<{ path: string; type: ConfigFileType } | null> {
  let dir = resolve(startDir);

  while (true) {
    // Try legacy PROJECT.md first
    const legacyCandidate = resolve(dir, LEGACY_CONFIG_NAME);
    if (existsSync(legacyCandidate)) {
      return { path: legacyCandidate, type: 'PROJECT.md' };
    }

    // Fall back to V2 project.yaml
    const v2Candidate = resolve(dir, V2_CONFIG_NAME);
    if (existsSync(v2Candidate)) {
      return { path: v2Candidate, type: 'project.yaml' };
    }

    const parent = dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

/* ------------------------------------------------------------------ */
/*  YAML Frontmatter Parsing                                           */
/* ------------------------------------------------------------------ */

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---/;

/**
 * Load and parse a PROJECT.md config file (YAML frontmatter format).
 *
 * Reads YAML frontmatter and maps it to ConvergeConfig.
 * Hook strings are converted to functions via convertScriptHooks().
 * The markdown body (after frontmatter) is used as `description`
 * fallback when not set in frontmatter.
 *
 * @throws If the file cannot be read or the YAML is invalid.
 */
async function loadProjectMdConfig(configPath: string): Promise<ConvergeConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch (err: any) {
    throw new Error(
      `Failed to read config from ${configPath}:\n  ${err.message}`
    );
  }

  const match = raw.match(FRONTMATTER_RE);
  if (!match) {
    throw new Error(
      `${configPath} must contain YAML frontmatter (---\\n...\\n---).\n` +
      `See PROJECT.md format reference.`
    );
  }

  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = parseYaml(match[1]) as Record<string, unknown>;
  } catch (err: any) {
    throw new Error(
      `Invalid YAML in ${configPath}:\n  ${err.message}`
    );
  }

  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    throw new Error(
      `${configPath} frontmatter must be a YAML mapping.\n` +
      `See PROJECT.md format reference.`
    );
  }

  // Extract markdown body as description fallback
  const body = raw.slice(match[0].length).trim();
  const projectDir = dirname(dirname(configPath)); // .converge/PROJECT.md → project root

  return buildConfigFromData(frontmatter, projectDir, body);
}

/**
 * Load and parse a project.yaml config file (pure YAML format).
 *
 * Reads pure YAML and maps it to ConvergeConfig.
 * Hook strings are converted to functions via convertScriptHooks().
 *
 * @throws If the file cannot be read or the YAML is invalid.
 */
async function loadProjectYamlConfig(configPath: string): Promise<ConvergeConfig> {
  let raw: string;
  try {
    raw = await readFile(configPath, 'utf-8');
  } catch (err: any) {
    throw new Error(
      `Failed to read config from ${configPath}:\n  ${err.message}`
    );
  }

  let data: Record<string, unknown>;
  try {
    data = parseYaml(raw) as Record<string, unknown>;
  } catch (err: any) {
    throw new Error(
      `Invalid YAML in ${configPath}:\n  ${err.message}`
    );
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(
      `${configPath} must be a YAML mapping (object).\n` +
      `See project.yaml format reference.`
    );
  }

  const projectDir = dirname(dirname(configPath)); // .converge/project.yaml → project root

  return buildConfigFromData(data, projectDir);
}

/**
 * Build ConvergeConfig from parsed data.
 */
function buildConfigFromData(
  data: Record<string, unknown>,
  projectDir: string,
  body?: string
): ConvergeConfig {
  const config: ConvergeConfig = {
    name: data.name as string,
    description: (data.description as string) || body || undefined,
    dir: (data.dir as string) || projectDir,
    discovery: data.discovery as ConvergeConfig['discovery'],
    plugins: data.plugins as ConvergeConfig['plugins'],
    variables: data.variables as ConvergeConfig['variables'],
    runtime: data.runtime as ConvergeConfig['runtime'],
    agents: data.agents as ConvergeConfig['agents'],
    skills: data.skills as ConvergeConfig['skills'],
    ai: data.ai as ConvergeConfig['ai'],
  };

  // Convert hook strings to async functions
  if (data.hooks && typeof data.hooks === 'object') {
    config.hooks = convertScriptHooks(
      data.hooks as Record<string, string>,
      projectDir,
    );
  }

  // Strip undefined values
  for (const key of Object.keys(config) as (keyof ConvergeConfig)[]) {
    if (config[key] === undefined) {
      delete config[key];
    }
  }

  return config;
}

/**
 * Load and parse a config file (auto-detects format based on file extension).
 *
 * Supports:
 * - PROJECT.md: YAML frontmatter with markdown body
 * - project.yaml: Pure YAML format
 *
 * @throws If the file cannot be read or the YAML is invalid.
 */
export async function loadConvergeConfig(configPath: string, type?: ConfigFileType): Promise<ConvergeConfig> {
  // Auto-detect type from path if not provided
  const configType = type || (configPath.endsWith('project.yaml') ? 'project.yaml' : 'PROJECT.md');

  if (configType === 'project.yaml') {
    return loadProjectYamlConfig(configPath);
  } else {
    return loadProjectMdConfig(configPath);
  }
}

/* ------------------------------------------------------------------ */
/*  Hook String → Function Conversion                                  */
/* ------------------------------------------------------------------ */

const HOOK_TIMEOUT_MS = 30_000;

/**
 * Convert a YAML hooks map (event → shell command string) into
 * typed ConvergeHooks (event → async function).
 *
 * Each hook spawns the script with:
 * - `HOOK_EVENT` env var set to the event name
 * - `HOOK_PAYLOAD` env var set to a simplified JSON payload
 *
 * Errors are swallowed (matches HookRegistry isolation behavior).
 */
function convertScriptHooks(
  hooks: Record<string, string>,
  projectDir: string,
): ConvergeHooks {
  const result: ConvergeHooks = {};

  for (const [event, script] of Object.entries(hooks)) {
    if (typeof script !== 'string') continue;

    const hookEvent = event as HookEvent;
    const resolvedScript = resolve(projectDir, script);

    (result as Record<string, Function>)[hookEvent] = async (payload: unknown) => {
      const safePayload = buildSafePayload(hookEvent, payload);

      try {
        await new Promise<void>((res, rej) => {
          const child = execFile(resolvedScript, [], {
            cwd: projectDir,
            timeout: HOOK_TIMEOUT_MS,
            env: {
              ...process.env,
              HOOK_EVENT: hookEvent,
              HOOK_PAYLOAD: JSON.stringify(safePayload),
            },
          }, (err) => {
            if (err) rej(err);
            else res();
          });
          child.unref();
        });
      } catch {
        // Swallow errors — hooks must not crash the workflow
      }
    };
  }

  return result;
}

/**
 * Build a safe, serializable payload subset for hook scripts.
 * Strips non-serializable values (functions, circular refs).
 */
function buildSafePayload(event: string, payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') {
    return { event };
  }

  const safe: Record<string, unknown> = { event };

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    if (typeof value === 'function') continue;
    if (typeof value === 'object' && value !== null) {
      // Only include simple scalar properties from nested objects
      if ('taskId' in value) safe.taskId = (value as any).taskId;
      if ('epicId' in value) safe.epicId = (value as any).epicId;
      if (value instanceof Error) safe.error = value.message;
      continue;
    }
    safe[key] = value;
  }

  return safe;
}

/* ------------------------------------------------------------------ */
/*  Convenience: find + load in one call                              */
/* ------------------------------------------------------------------ */

/**
 * Find and load the converge config from `startDir` (or its ancestors).
 *
 * Returns `null` if no config file is found — the caller should fall
 * back to default behavior.
 *
 * @example
 * const config = await resolveConvergeConfig(process.cwd());
 * if (config) {
 *   // use config.hooks, config.discovery, etc.
 * }
 */
export async function resolveConvergeConfig(
  startDir: string
): Promise<{ config: ConvergeConfig; configPath: string; type: ConfigFileType } | null> {
  const result = await findConvergeConfig(startDir);
  if (!result) return null;

  const config = await loadConvergeConfig(result.path, result.type);
  return { config, configPath: result.path, type: result.type };
}
