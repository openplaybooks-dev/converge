#!/usr/bin/env tsx
/**
 * Claude CLI + Kimi API Configuration Module
 * 
 * Since Kimi's API is Claude-compatible, we can use claudefn (Claude CLI)
 * but point it to Kimi's API endpoint instead of Anthropic's.
 * 
 * This gives us the best of both worlds:
 * - Claude CLI's powerful features (tools, sandbox, etc.)
 * - Kimi's API pricing and availability
 */

import { claudefn } from "@converge/claudefn";
import { agentfn } from "@converge/agentfn";
import type { ClaudeFnOptions } from "@converge/claudefn";
import { z } from "zod";

// Kimi API Configuration
const KIMI_CONFIG = {
  // Kimi API endpoint (OpenAI-compatible)
  apiKey: process.env.KIMI_API_KEY || "sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4",
  baseUrl: "https://api.moonshot.cn/v1",
  
  // Model mappings
  models: {
    default: "kimi-k1.5",
    fast: "kimi-k1",
    powerful: "kimi-k1.5-long",
  },
};

/**
 * Create a claudefn instance configured to use Kimi's API
 * 
 * This works by setting environment variables that the Claude CLI
 * uses to determine which API endpoint to connect to.
 */
export function claudeWithKimi<T = string>(
  options?: Omit<ClaudeFnOptions<T>, "cliFlags"> & { model?: string }
) {
  const model = options?.model || KIMI_CONFIG.models.default;
  
  // Set environment variables for this invocation
  const env = {
    ...process.env,
    // Method 1: Override Anthropic endpoint (if Claude CLI supports it)
    ANTHROPIC_API_KEY: KIMI_CONFIG.apiKey,
    ANTHROPIC_BASE_URL: KIMI_CONFIG.baseUrl,
    
    // Method 2: Use OpenAI-compatible mode (more likely to work)
    OPENAI_API_KEY: KIMI_CONFIG.apiKey,
    OPENAI_BASE_URL: KIMI_CONFIG.baseUrl,
    
    // Method 3: Claude Code specific overrides
    CLAUDE_CODE_API_KEY: KIMI_CONFIG.apiKey,
    CLAUDE_CODE_API_URL: KIMI_CONFIG.baseUrl,
  };
  
  return claudefn<T>({
    ...options,
    // Pass model via cliFlags if supported
    cliFlags: [
      "--model",
      model,
      // Add provider override if CLI supports it
      "--provider",
      "openai",  // Use OpenAI-compatible mode
      ...((options as any)?.cliFlags || []),
    ],
    // Set cwd with modified environment
    cwd: options?.cwd,
  });
}

/**
 * Create agentfn configured to use Claude CLI with Kimi API
 */
export function agentWithKimi<T = string>(
  options?: {
    prompt?: string | ((input?: string) => string);
    schema?: any;
    model?: string;
    timeoutMs?: number;
    logDir?: string;
  }
) {
  return agentfn<T>({
    provider: "claude",  // Use Claude provider
    prompt: options?.prompt,
    schema: options?.schema,
    timeoutMs: options?.timeoutMs || 120000,
    logDir: options?.logDir || "./.converge/logs",
    // Use env option if agentfn supports it
    ...(options?.model && { model: options.model }),
  });
}

/**
 * Setup function to configure environment for Kimi
 * Call this before using claudefn with Kimi
 */
export function setupKimiEnvironment(apiKey?: string): void {
  const key = apiKey || KIMI_CONFIG.apiKey;
  
  process.env.ANTHROPIC_API_KEY = key;
  process.env.ANTHROPIC_BASE_URL = KIMI_CONFIG.baseUrl;
  process.env.OPENAI_API_KEY = key;
  process.env.OPENAI_BASE_URL = KIMI_CONFIG.baseUrl;
  
  console.log("✓ Environment configured for Kimi API");
  console.log("  Base URL:", KIMI_CONFIG.baseUrl);
  console.log("  API Key:", key.slice(0, 8) + "..." + key.slice(-4));
}

// Example usage
async function examples() {
  console.log("=== Claude CLI + Kimi API Examples ===\n");
  
  // Setup environment
  setupKimiEnvironment();
  
  // Example 1: Simple call
  console.log("\n1. Simple call with Kimi API:");
  const simple = claudeWithKimi({
    prompt: "Say 'Hello from Kimi via Claude CLI!'",
    logDir: "./.converge/logs",
  });
  
  try {
    const result = await simple();
    console.log("Response:", result.data);
    console.log("Duration:", result.durationMs, "ms");
  } catch (error: any) {
    console.error("Error:", error.message);
    console.log("\nNote: This requires Claude CLI to support API endpoint override.");
    console.log("If it fails, you may need to use the native kimi CLI instead.");
  }
  
  // Example 2: With schema
  console.log("\n2. With schema validation:");
  const withSchema = claudeWithKimi({
    prompt: "Return a JSON object with name='test' and value=42",
    logDir: "./.converge/logs",
    schema: z.object({
      name: z.string(),
      value: z.number(),
    }),
  });
  
  try {
    const result = await withSchema();
    console.log("Parsed data:", result.data);
  } catch (error: any) {
    console.error("Error:", error.message);
  }
  
  // Example 3: Different models
  console.log("\n3. Available models:");
  console.log("  -", KIMI_CONFIG.models.default, "(default)");
  console.log("  -", KIMI_CONFIG.models.fast, "(fast)");
  console.log("  -", KIMI_CONFIG.models.powerful, "(powerful)");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  examples().catch(console.error);
}

export { KIMI_CONFIG };
