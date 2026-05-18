/**
 * AI Factory
 *
 * Provides a factory for creating AI function callers based on project configuration.
 * Reads the AI configuration from project.yaml and creates the appropriate
 * provider function (kimi, acp, claude, qwen, gemini).
 *
 * Usage:
 *   const ai = createAIFactory(projectConfig.ai);
 *   const result = await ai.call('Generate a React component');
 *
 * Or via context:
 *   const ai = ctx.ai.createCaller();
 *   const result = await ai.call('Generate a React component');
 */

import {
  agentfn,
  type AgentFnOptions,
  type AgentFnResult,
} from "@openplaybooks/converge-agentfn";
import type {
  AIConfig,
  AIProviderConfig,
  AIMultiProviderConfig,
} from "../storage/types.ts";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Expand environment variable references in a string.
 * Supports both ${VAR} and {{VAR}} syntax. The project.yaml examples and
 * playbook templates commonly use {{VAR}}, while shell-oriented configs often
 * use ${VAR}. Unknown variables are left unchanged so misconfiguration remains
 * visible in diagnostics instead of silently becoming an empty string.
 * @example expandEnvVars("Hello ${USER}") -> "Hello john" (if USER=john)
 * @example expandEnvVars("Bearer {{API_KEY}}") -> "Bearer sk-..."
 */
function readEnvValue(varName: string): string | undefined {
  const direct = process.env[varName];
  if (direct !== undefined) return direct;

  // The CLI loads .env early, but lower-level packages are also used directly in
  // tests and scripts. Support project-local .env fallback here so provider
  // config placeholders such as {{DEEPSEEK_API_KEY}} resolve consistently.
  try {
    for (const dir of [process.cwd(), process.env.INIT_CWD, process.env.PWD].filter(Boolean) as string[]) {
      const envPath = join(dir, ".env");
      if (!existsSync(envPath)) continue;
      for (const line of readFileSync(envPath, "utf8").split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        if (key !== varName) continue;
        let value = trimmed.slice(eqIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[varName] = value;
        return value;
      }
    }
  } catch {
    // Best-effort fallback. Leave unresolved if .env cannot be read.
  }
  return undefined;
}

function expandEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}|\{\{([^}]+)\}\}/g, (match, shellName, templateName) => {
    const varName = String(shellName || templateName).trim();
    const envValue = readEnvValue(varName);
    return envValue !== undefined ? envValue : match;
  });
}

/**
 * Expand environment variables in all string values of an object.
 */
function expandEnvVarsInObject(obj: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = expandEnvVars(value);
  }
  return result;
}

/**
 * Provider type alias for cleaner code
 */
export type AIProvider =
  | "claude"
  | "acp"
  | "kimi"
  | "qwen"
  | "gemini"
  | "openfn"
  | "codex"
  | "deepcode";

/**
 * Resolved AI configuration with provider name and resolved type
 */
export interface ResolvedAIConfig extends AIProviderConfig {
  /** Name of the provider as configured (e.g., 'acp', 'kimi', 'claude') */
  name: string;
  /**
   * Resolved provider type for agentfn.
   * This is the key from the providers map, or the provider field.
   */
  resolvedProvider: AIProvider;
  /** Environment variables to set when running this provider */
  env?: Record<string, string>;
}

/**
 * AI Caller interface - unified interface for all AI providers
 */
export interface AICaller {
  /** The resolved provider name */
  readonly provider: string;
  /** The resolved provider type */
  readonly providerType: AIProvider;

  /**
   * Call the AI with a prompt
   * @param prompt - The prompt text
   * @param options - Optional configuration overrides
   * @returns The AI response result
   */
  call<T = string>(
    prompt: string,
    options?: Partial<AgentFnOptions<T>>,
  ): Promise<AgentFnResult<T>>;
}

/**
 * Check if the config is a multi-provider config
 */
function isMultiProviderConfig(
  config: AIConfig,
): config is AIMultiProviderConfig {
  return (
    config !== undefined &&
    typeof config === "object" &&
    "providers" in config &&
    config.providers !== undefined
  );
}

/**
 * Resolve AI configuration from project config
 *
 * @param aiConfig - The AI configuration from ProjectConfig
 * @param preferredProvider - Optional preferred provider name (overrides default)
 * @returns The resolved provider configuration or null if not found
 */
export function resolveAIConfig(
  aiConfig: AIConfig | undefined,
  preferredProvider?: string,
): ResolvedAIConfig | null {
  if (!aiConfig) {
    return null;
  }

  // Check if this is a multi-provider config (has 'providers' and 'default')
  if (isMultiProviderConfig(aiConfig)) {
    const multiConfig = aiConfig;

    // Use preferred provider if specified, otherwise use default
    const providerName = preferredProvider || multiConfig.default;

    if (!providerName) {
      console.warn(
        "   ⚠️  No default provider configured in multi-provider AI config",
      );
      return null;
    }

    const providerConfig = multiConfig.providers[providerName];
    if (!providerConfig) {
      console.warn(
        `   ⚠️  Provider '${providerName}' not found in AI configuration`,
      );
      console.warn(
        `      Available providers: ${Object.keys(multiConfig.providers).join(", ")}`,
      );
      return null;
    }

    // The provider name IS the type (e.g., 'acp', 'kimi', 'claude')
    // Use explicit provider field if set, otherwise use the key name
    const resolvedProvider = (providerConfig.provider ||
      providerName) as AIProvider;

    return {
      name: providerName,
      resolvedProvider,
      ...providerConfig,
      ...(providerConfig.apiKey && { apiKey: expandEnvVars(providerConfig.apiKey) }),
      ...(providerConfig.baseUrl && { baseUrl: expandEnvVars(providerConfig.baseUrl) }),
      ...(providerConfig.model && { model: expandEnvVars(providerConfig.model) }),
      // Expand env var references like ${VAR} and {{VAR}} in env values
      ...(providerConfig.env && {
        env: expandEnvVarsInObject(providerConfig.env),
      }),
    };
  }

  // Single provider config - use the provider field as the name and type
  const singleConfig = aiConfig as AIProviderConfig;
  if (!singleConfig.provider) {
    console.warn("   ⚠️  AI configuration missing provider field");
    return null;
  }

  const resolvedProvider = singleConfig.provider as AIProvider;

  return {
    name: singleConfig.provider,
    resolvedProvider,
    ...singleConfig,
    ...(singleConfig.apiKey && { apiKey: expandEnvVars(singleConfig.apiKey) }),
    ...(singleConfig.baseUrl && { baseUrl: expandEnvVars(singleConfig.baseUrl) }),
    ...(singleConfig.model && { model: expandEnvVars(singleConfig.model) }),
    // Expand env var references like ${VAR} and {{VAR}} in env values
    ...(singleConfig.env && {
      env: expandEnvVarsInObject(singleConfig.env),
    }),
  };
}

/**
 * List available AI providers from configuration
 *
 * @param aiConfig - The AI configuration from ProjectConfig
 * @returns Array of available provider names, or empty array if single provider
 */
export function listAIProviders(aiConfig: AIConfig | undefined): string[] {
  if (!aiConfig) {
    return [];
  }

  if (isMultiProviderConfig(aiConfig)) {
    return Object.keys(aiConfig.providers);
  }

  // Single provider - return the provider name
  const singleConfig = aiConfig as AIProviderConfig;
  return singleConfig.provider ? [singleConfig.provider] : [];
}

/**
 * Create an AI caller based on project configuration
 *
 * @param aiConfig - The AI configuration from ProjectConfig
 * @param baseOptions - Base options to apply to all calls (cwd, allowedTools, etc.)
 * @param preferredProvider - Optional preferred provider name (overrides default)
 * @returns An AICaller instance or null if no valid config
 *
 * @example
 * const ai = createAIFactory(projectConfig.ai, { cwd: projectDir });
 * if (ai) {
 *   const result = await ai.call('Generate a React component');
 *   console.log(result.data);
 * }
 */
export function createAIFactory(
  aiConfig: AIConfig | undefined,
  baseOptions: Omit<AgentFnOptions<unknown>, "prompt"> = {},
  preferredProvider?: string,
): AICaller | null {
  const resolved = resolveAIConfig(aiConfig, preferredProvider);

  if (!resolved) {
    return null;
  }

  return {
    provider: resolved.name,
    providerType: resolved.resolvedProvider,

    async call<T = string>(
      prompt: string,
      options: Partial<AgentFnOptions<T>> = {},
    ): Promise<AgentFnResult<T>> {
      // Set environment variables from config (for Claude CLI with custom backends)
      const envBackup: Record<string, string | undefined> = {};
      if (resolved.env) {
        for (const [key, value] of Object.entries(resolved.env)) {
          envBackup[key] = process.env[key];
          process.env[key] = value;
        }
      }

      try {
        // Merge options: baseOptions < config < call options
        const mergedOptions = {
          // Base options from factory
          ...baseOptions,
          // Config-level options
          provider: resolved.resolvedProvider,
          ...(resolved.apiKey && { apiKey: resolved.apiKey }),
          ...(resolved.baseUrl && { baseUrl: resolved.baseUrl }),
          ...(resolved.model && { model: resolved.model }),
          ...(resolved.timeoutMs && { timeoutMs: resolved.timeoutMs }),
          ...(resolved.maxRetries && { maxRetries: resolved.maxRetries }),
          // Pass env vars directly to agentfn for Claude CLI
          // This ensures they're set when the process is spawned
          ...(resolved.env && { env: resolved.env }),
          // Call-level options (highest priority)
          ...options,
          // Prompt always from call
          prompt,
        } as AgentFnOptions<T>;

        const fn = agentfn<T>(mergedOptions);
        return await fn();
      } finally {
        // Restore environment variables
        for (const [key, value] of Object.entries(envBackup)) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
      }
    },
  };
}

/**
 * Create an AI caller with project directory context
 * This is the recommended way to create an AI caller from a project context
 *
 * @param projectDir - The project directory
 * @param aiConfig - The AI configuration from ProjectConfig
 * @returns An AICaller instance or null if no valid config
 */
export function createProjectAI(
  projectDir: string,
  aiConfig: AIConfig | undefined,
): AICaller | null {
  return createAIFactory(aiConfig, { cwd: projectDir });
}

/**
 * Default AI factory singleton
 * Used when no project config is available (falls back to agentfn defaults)
 */
export function createDefaultAI(
  baseOptions: Omit<AgentFnOptions<unknown>, "prompt"> = {},
): AICaller {
  return {
    provider: "default",
    providerType: "claude",

    async call<T = string>(
      prompt: string,
      options: Partial<AgentFnOptions<T>> = {},
    ): Promise<AgentFnResult<T>> {
      const mergedOptions = {
        ...baseOptions,
        ...options,
        prompt,
      } as AgentFnOptions<T>;

      const fn = agentfn<T>(mergedOptions);
      return await fn();
    },
  };
}
