#!/usr/bin/env tsx
/**
 * Using Claude CLI with Kimi API
 * 
 * Since Kimi's API is Claude-compatible, we can use claudefn
 * but configure it to use Kimi's endpoint instead of Anthropic's.
 */

import { agentfn, setDefaultProvider } from "@openplaybooks/converge-agentfn";
import { z } from "zod";

// Configure environment to use Kimi API
const KIMI_API_KEY = process.env.KIMI_API_KEY || "process.env.KIMI_API_KEY";

// Method 1: Override environment variables globally
process.env.ANTHROPIC_API_KEY = KIMI_API_KEY;
process.env.ANTHROPIC_BASE_URL = "https://api.moonshot.cn/v1";

console.log("=== Claude CLI + Kimi API Configuration ===");
console.log("API Key:", KIMI_API_KEY.slice(0, 8) + "..." + KIMI_API_KEY.slice(-4));
console.log("Base URL:", process.env.ANTHROPIC_BASE_URL);

// Example 1: Simple text generation
async function simpleExample() {
  console.log("\n--- Example 1: Simple Text Generation ---");
  
  const kimi = agentfn({
    provider: "claude",  // Use Claude CLI
    prompt: "Explain TypeScript generics in simple terms",
    logDir: "./.converge/logs",
    timeoutMs: 60000,
    // Pass Kimi model via cliFlags
    cliFlags: ["--model", "kimi-k1.5"],
  });
  
  try {
    const result = await kimi();
    console.log("Response:", result.data.slice(0, 200) + "...");
    console.log("Provider:", result.provider);
    console.log("Duration:", result.durationMs, "ms");
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

// Example 2: With schema validation
async function schemaExample() {
  console.log("\n--- Example 2: Schema Validation ---");
  
  const analyzeCode = agentfn({
    provider: "claude",
    prompt: "Analyze this function and return JSON: function add(a, b) { return a + b; }",
    logDir: "./.converge/logs",
    timeoutMs: 60000,
    cliFlags: ["--model", "kimi-k1.5"],
    schema: z.object({
      issues: z.array(z.string()),
      suggestions: z.array(z.string()),
      score: z.number(),
    }),
  });
  
  try {
    const result = await analyzeCode();
    console.log("Parsed data:", JSON.stringify(result.data, null, 2));
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

// Example 3: With tools (Claude CLI feature)
async function toolsExample() {
  console.log("\n--- Example 3: With Tools ---");
  
  const fileAnalyzer = agentfn({
    provider: "claude",
    prompt: "Read ./package.json and tell me the project name and dependencies",
    logDir: "./.converge/logs",
    timeoutMs: 120000,
    cliFlags: ["--model", "kimi-k1.5"],
    allowedTools: ["Read", "Glob", "Bash"],  // Claude CLI tools
  });
  
  try {
    const result = await fileAnalyzer();
    console.log("Result:", result.data);
  } catch (error: any) {
    console.error("Error:", error.message);
    console.log("\nNote: Tools require Claude CLI to properly support Kimi API.");
  }
}

// Example 4: Different Kimi models
async function modelComparison() {
  console.log("\n--- Example 4: Model Comparison ---");
  
  const models = [
    { name: "kimi-k1", desc: "Fast" },
    { name: "kimi-k1.5", desc: "Balanced" },
    { name: "kimi-k1.5-long", desc: "Long context" },
  ];
  
  for (const model of models) {
    console.log(`\nTesting ${model.name} (${model.desc}):`);
    
    const fn = agentfn({
      provider: "claude",
      prompt: "Count from 1 to 3",
      logDir: "./.converge/logs",
      timeoutMs: 30000,
      cliFlags: ["--model", model.name],
    });
    
    try {
      const start = Date.now();
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`  Response: ${result.data.slice(0, 50)}...`);
      console.log(`  Duration: ${duration}ms`);
    } catch (error: any) {
      console.error(`  Error: ${error.message}`);
    }
  }
}

// Example 5: Session resumption (Claude CLI feature)
async function sessionExample() {
  console.log("\n--- Example 5: Session Resumption ---");
  
  // First call
  const assistant1 = agentfn({
    provider: "claude",
    prompt: "{{input}}",
    logDir: "./.converge/logs",
    cliFlags: ["--model", "kimi-k1.5"],
  });
  
  try {
    const result1 = await assistant1("What are JavaScript closures?");
    console.log("First response:", result1.data.slice(0, 100) + "...");
    console.log("Session ID:", result1.sessionId);
    
    // Resume session
    if (result1.sessionId) {
      const assistant2 = agentfn({
        provider: "claude",
        prompt: "{{input}}",
        logDir: "./.converge/logs",
        cliFlags: ["--model", "kimi-k1.5"],
        resume: result1.sessionId,  // Continue conversation
      });
      
      const result2 = await assistant2("Show me an example");
      console.log("Follow-up:", result2.data.slice(0, 100) + "...");
    }
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

// Run all examples
async function main() {
  console.log("\nTesting Claude CLI with Kimi API...\n");
  
  // Check if we have the required setup
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY not set");
    console.log("Set it with: export ANTHROPIC_API_KEY=your_kimi_key");
    process.exit(1);
  }
  
  await simpleExample();
  await schemaExample();
  await toolsExample();
  await modelComparison();
  await sessionExample();
  
  console.log("\n=== All examples completed ===");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
