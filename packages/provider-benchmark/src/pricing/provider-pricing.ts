/**
 * Provider Pricing Table
 *
 * Extended pricing data for providers used in benchmarking.
 * Extends @openplaybooks/converge-core's DEFAULT_PRICING with additional providers.
 *
 * Prices are per 1M tokens.
 */

export interface ModelPricing {
  inputPer1M: number;
  outputPer1M: number;
}

export const PROVIDER_PRICING: Record<string, ModelPricing> = {
  // Anthropic (official)
  "claude-opus-4-5": {
    inputPer1M: 15.0,
    outputPer1M: 75.0,
  },
  "claude-sonnet-4-5": {
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  "claude-haiku-3-5": {
    inputPer1M: 0.8,
    outputPer1M: 4.0,
  },

  // MiniMax (Anthropic-compatible)
  "MiniMax-M2.7": {
    inputPer1M: 0.5,
    outputPer1M: 1.5,
  },

  // DeepSeek (Anthropic-compatible)
  "deepseek-v4-pro": {
    inputPer1M: 0.55,
    outputPer1M: 2.19,
  },
  "deepseek-v4-pro[1m]": {
    inputPer1M: 0.55,
    outputPer1M: 2.19,
  },
  "deepseek-v4-flash": {
    inputPer1M: 0.27,
    outputPer1M: 1.10,
  },

  // Kimi / Moonshot
  "kimi-k2": {
    inputPer1M: 0.60,
    outputPer1M: 2.40,
  },

  // Qwen
  "qwen-max": {
    inputPer1M: 0.40,
    outputPer1M: 1.20,
  },
  "qwen-plus": {
    inputPer1M: 0.20,
    outputPer1M: 0.60,
  },

  // Gemini
  "gemini-2.5-pro": {
    inputPer1M: 3.5,
    outputPer1M: 10.5,
  },
  "gemini-2.5-flash": {
    inputPer1M: 0.30,
    outputPer1M: 1.50,
  },

  // OpenAI
  "gpt-4o": {
    inputPer1M: 2.50,
    outputPer1M: 10.0,
  },
  "gpt-4o-mini": {
    inputPer1M: 0.15,
    outputPer1M: 0.60,
  },
};

/**
 * Look up pricing for a model, with fallback to a default rate.
 */
export function getProviderPricing(model?: string): ModelPricing {
  if (model && PROVIDER_PRICING[model]) {
    return PROVIDER_PRICING[model];
  }
  // Fallback: reasonable default for unknown models
  return { inputPer1M: 1.0, outputPer1M: 3.0 };
}
