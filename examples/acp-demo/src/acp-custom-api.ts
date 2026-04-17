#!/usr/bin/env tsx
/**
 * ACP (Agent SDK) with Custom API URL and Key
 * 
 * This example demonstrates using the Agent SDK with:
 * - Custom API endpoint (e.g., Kimi, OpenAI-compatible)
 * - Custom API key
 * 
 * Since Kimi's API is Claude-compatible, we can use the Agent SDK
 * directly with Kimi's endpoint instead of Anthropic's.
 */

import { agentfn } from "@crew/agentfn";
import { scpfn, sendFeedback } from "@crew/scpfn";
import { z } from "zod";

// Configuration for Kimi API
const KIMI_API_KEY = process.env.KIMI_API_KEY || "sk-e8Ti33rX28HLFeFeuUug4f3Tg0vL2j15wat9A0c0chXvWmBem4";
const KIMI_BASE_URL = "https://api.moonshot.cn/v1";

console.log("=== ACP with Custom API (Kimi) ===\n");
console.log("API Key:", KIMI_API_KEY.slice(0, 8) + "..." + KIMI_API_KEY.slice(-4));
console.log("Base URL:", KIMI_BASE_URL);

// Example 1: Using scpfn directly with custom API
async function directScpfnExample() {
  console.log("\n--- Example 1: Direct scpfn with Custom API ---");
  
  const kimi = scpfn({
    prompt: "Say 'Hello from Kimi via Agent SDK!'",
    logDir: "./.harness/logs",
    timeoutMs: 60000,
    // Custom API configuration
    apiKey: KIMI_API_KEY,
    baseUrl: KIMI_BASE_URL,
    // Kimi model
    model: "kimi-k1.5",
  });
  
  try {
    const result = await kimi();
    console.log("✓ Success!");
    console.log("  Response:", result.data);
    console.log("  Duration:", result.durationMs, "ms");
    console.log("  Session ID:", result.sessionId);
  } catch (error: any) {
    console.error("✗ Failed:", error.message);
  }
}

// Example 2: Using agentfn with ACP provider + custom API
async function agentfnAcpExample() {
  console.log("\n--- Example 2: agentfn with ACP + Custom API ---");
  
  const kimi = agentfn({
    provider: "acp",  // Use ACP (Agent SDK) provider
    prompt: "Explain TypeScript generics in one sentence",
    logDir: "./.harness/logs",
    timeoutMs: 60000,
    // Pass custom API config via sdkOptions
    apiKey: KIMI_API_KEY,
    baseUrl: KIMI_BASE_URL,
    model: "kimi-k1.5",
  });
  
  try {
    const result = await kimi();
    console.log("✓ Success!");
    console.log("  Provider:", result.provider);  // "acp"
    console.log("  Response:", result.data.slice(0, 100));
    console.log("  Duration:", result.durationMs, "ms");
  } catch (error: any) {
    console.error("✗ Failed:", error.message);
  }
}

// Example 3: With schema validation
async function schemaExample() {
  console.log("\n--- Example 3: Schema Validation with Custom API ---");
  
  const analyzeCode = scpfn({
    prompt: "Analyze this function and return JSON: function add(a, b) { return a + b; }",
    logDir: "./.harness/logs",
    timeoutMs: 60000,
    apiKey: KIMI_API_KEY,
    baseUrl: KIMI_BASE_URL,
    model: "kimi-k1.5",
    schema: z.object({
      issues: z.array(z.string()),
      suggestions: z.array(z.string()),
      score: z.number().min(0).max(10),
    }),
  });
  
  try {
    const result = await analyzeCode();
    console.log("✓ Success!");
    console.log("  Parsed data:", JSON.stringify(result.data, null, 2));
  } catch (error: any) {
    console.error("✗ Failed:", error.message);
  }
}

// Example 4: Session resumption with custom API
async function sessionExample() {
  console.log("\n--- Example 4: Session Resumption with Custom API ---");
  
  const assistant = scpfn({
    prompt: "{{input}}",
    logDir: "./.harness/logs",
    timeoutMs: 60000,
    apiKey: KIMI_API_KEY,
    baseUrl: KIMI_BASE_URL,
    model: "kimi-k1.5",
  });
  
  try {
    // First interaction
    const result1 = await assistant("What are JavaScript closures?");
    console.log("✓ First response received");
    console.log("  Response:", result1.data.slice(0, 100) + "...");
    console.log("  Session ID:", result1.sessionId);
    
    // Resume session with same API config
    if (result1.sessionId) {
      const followUp = await sendFeedback({
        sessionId: result1.sessionId,
        prompt: "Show me a practical example",
        logDir: "./.harness/logs",
        timeoutMs: 60000,
        apiKey: KIMI_API_KEY,  // Must use same API config
        baseUrl: KIMI_BASE_URL,
      });
      
      console.log("✓ Follow-up response received");
      console.log("  Response:", followUp.data.slice(0, 100) + "...");
    }
  } catch (error: any) {
    console.error("✗ Failed:", error.message);
  }
}

// Example 5: Different Kimi models
async function modelComparison() {
  console.log("\n--- Example 5: Model Comparison ---");
  
  const models = [
    { name: "kimi-k1", desc: "Fast" },
    { name: "kimi-k1.5", desc: "Balanced" },
    { name: "kimi-k1.5-long", desc: "Long context" },
  ];
  
  for (const model of models) {
    console.log(`\nTesting ${model.name} (${model.desc}):`);
    
    const fn = scpfn({
      prompt: "Count from 1 to 3",
      logDir: "./.harness/logs",
      timeoutMs: 30000,
      apiKey: KIMI_API_KEY,
      baseUrl: KIMI_BASE_URL,
      model: model.name,
    });
    
    try {
      const start = Date.now();
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`  ✓ Response: ${result.data.slice(0, 50)}...`);
      console.log(`  ✓ Duration: ${duration}ms`);
    } catch (error: any) {
      console.error(`  ✗ Error: ${error.message}`);
    }
  }
}

// Example 6: With hooks and streaming
async function streamingExample() {
  console.log("\n--- Example 6: Streaming with Custom API ---");
  
  const chunks: string[] = [];
  
  const kimi = scpfn({
    prompt: "Write a short poem about coding",
    logDir: "./.harness/logs",
    timeoutMs: 60000,
    apiKey: KIMI_API_KEY,
    baseUrl: KIMI_BASE_URL,
    model: "kimi-k1.5",
    hooks: {
      onStream: (chunk) => {
        chunks.push(chunk);
        process.stdout.write(".");
      },
    },
  });
  
  try {
    const result = await kimi();
    console.log("\n✓ Success!");
    console.log("  Chunks received:", chunks.length);
    console.log("  Total length:", result.data.length, "chars");
    console.log("  Response preview:", result.data.slice(0, 100) + "...");
  } catch (error: any) {
    console.error("\n✗ Failed:", error.message);
  }
}

// Run all examples
async function main() {
  console.log("Testing ACP with custom API (Kimi)...\n");
  
  await directScpfnExample();
  await agentfnAcpExample();
  await schemaExample();
  await sessionExample();
  await modelComparison();
  await streamingExample();
  
  console.log("\n=== All examples completed ===");
}

main().catch((error) => {
  console.error("\nFatal error:", error);
  process.exit(1);
});
