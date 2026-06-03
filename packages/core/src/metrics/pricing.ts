/**
 * Model Pricing Utilities
 *
 * Calculate costs from token usage when provider doesn't return cost,
 * or recalculate for verification.
 */

import type { ModelPricing, SubscriptionConfig } from "../storage/types.ts";

/**
 * Default Claude pricing (MiniMax-M2.7 as approximation of Claude pricing)
 * Prices per 1M tokens
 */
export const DEFAULT_PRICING: Record<string, ModelPricing> = {
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
    outputPer1M: 1.1,
  },
  // Kimi / Moonshot
  "kimi-k2": {
    inputPer1M: 0.6,
    outputPer1M: 2.4,
  },
  // Qwen
  "qwen-max": {
    inputPer1M: 0.4,
    outputPer1M: 1.2,
  },
  "qwen-plus": {
    inputPer1M: 0.2,
    outputPer1M: 0.6,
  },
  // Gemini
  "gemini-2.5-pro": {
    inputPer1M: 3.5,
    outputPer1M: 10.5,
  },
  "gemini-2.5-flash": {
    inputPer1M: 0.3,
    outputPer1M: 1.5,
  },
  // Fallback
  default: {
    inputPer1M: 1.0,
    outputPer1M: 3.0,
  },
};

/**
 * Calculate cost from token usage and pricing
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.inputPer1M;
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPer1M;
  return inputCost + outputCost;
}

/**
 * Calculate cost using a specific model's pricing from the pricing map
 */
export function calculateCostWithModel(
  inputTokens: number,
  outputTokens: number,
  model: string,
  customPricing?: Record<string, ModelPricing>,
): number {
  // Try custom pricing first
  if (customPricing) {
    const pricing = customPricing[model] ?? customPricing["default"];
    if (pricing) {
      return calculateCost(inputTokens, outputTokens, pricing);
    }
  }

  // Fall back to default pricing
  const pricing = DEFAULT_PRICING[model] ?? DEFAULT_PRICING["default"];
  return calculateCost(inputTokens, outputTokens, pricing);
}

/**
 * Calculate subscription-based effective cost
 * effective_cost = (requests_made / quota) * flat_fee
 */
export function calculateSubscriptionCost(
  sessionCount: number,
  subscription: SubscriptionConfig,
): number {
  if (!subscription.enabled) return 0;
  const effective =
    (sessionCount / subscription.requestsIncluded) * subscription.flatFee;
  return Math.min(effective, subscription.flatFee); // Cap at flat fee
}

/**
 * Extract model name from events.jsonl metadata
 * The model info is stored in the task metadata
 */
export function extractModelFromMetadata(
  metadata: Record<string, unknown>,
): string {
  // Check various fields where model might be stored
  if (typeof metadata.model === "string") {
    return metadata.model;
  }
  if (typeof metadata.modelId === "string") {
    return metadata.modelId;
  }
  if (typeof metadata.ai === "object" && metadata.ai !== null) {
    const ai = metadata.ai as Record<string, unknown>;
    if (typeof ai.model === "string") {
      return ai.model;
    }
  }
  return "MiniMax-M2.7"; // Default fallback
}
