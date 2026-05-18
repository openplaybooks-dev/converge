#!/usr/bin/env tsx
/**
 * Kimi Backend Test Script
 * 
 * This script tests if the Kimi backend is working correctly.
 * Run with: npx tsx src/test-kimi.ts
 */

import { agentfn } from "@openplaybooks/converge-agentfn";
import { z } from "zod";
import { spawn } from "node:child_process";

// Colors for terminal output
const colors = {
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
  details?: any;
}

const results: TestResult[] = [];

function log(message: string, indent = 0) {
  console.log("  ".repeat(indent) + message);
}

// Test 1: Check if kimi CLI is installed
async function testCliInstalled(): Promise<TestResult> {
  log("\n" + colors.blue("Test 1: Check if 'kimi' CLI is installed"));
  
  return new Promise((resolve) => {
    const proc = spawn("which", ["kimi"]);
    let output = "";
    
    proc.stdout.on("data", (chunk) => output += chunk.toString());
    
    proc.on("close", (code) => {
      if (code === 0) {
        log(colors.green("✓") + " kimi CLI found at: " + output.trim(), 1);
        resolve({ name: "CLI Installed", passed: true, details: output.trim() });
      } else {
        log(colors.red("✗") + " kimi CLI not found in PATH", 1);
        log("  Please install the Kimi CLI:", 1);
        log("  npm install -g @moonshot-ai/kimi-cli", 2);
        resolve({ 
          name: "CLI Installed", 
          passed: false, 
          error: "kimi CLI not found in PATH" 
        });
      }
    });
  });
}

// Test 2: Check if API key is configured
async function testApiKey(): Promise<TestResult> {
  log("\n" + colors.blue("Test 2: Check API key configuration"));
  
  const envKey = process.env.MOONSHOT_API_KEY || process.env.KIMI_API_KEY;
  
  if (envKey) {
    log(colors.green("✓") + " API key found in environment variables", 1);
    log(colors.gray("  Key: " + envKey.slice(0, 8) + "..." + envKey.slice(-4)), 1);
    return { name: "API Key", passed: true, details: "Found in env" };
  }
  
  // Try to check kimi config
  return new Promise((resolve) => {
    const proc = spawn("kimi", ["config", "get", "apiKey"]);
    let output = "";
    let stderr = "";
    
    proc.stdout.on("data", (chunk) => output += chunk.toString());
    proc.stderr.on("data", (chunk) => stderr += chunk.toString());
    
    proc.on("close", (code) => {
      if (code === 0 && output.trim()) {
        log(colors.green("✓") + " API key found in kimi config", 1);
        resolve({ name: "API Key", passed: true, details: "Found in config" });
      } else {
        log(colors.red("✗") + " API key not found", 1);
        log("  Set one of these environment variables:", 1);
        log("  - MOONSHOT_API_KEY", 2);
        log("  - KIMI_API_KEY", 2);
        log("  Or run: kimi config set apiKey <your-key>", 1);
        resolve({ 
          name: "API Key", 
          passed: false, 
          error: "API key not configured" 
        });
      }
    });
  });
}

// Test 3: Simple API call
async function testSimpleCall(): Promise<TestResult> {
  log("\n" + colors.blue("Test 3: Simple API call"));
  
  const start = Date.now();
  
  try {
    const kimi = agentfn({
      provider: "kimi",
      prompt: "Say exactly 'Kimi is working!' and nothing else.",
      timeoutMs: 30000,
    });
    
    log("  Sending request...", 1);
    const result = await kimi();
    const duration = Date.now() - start;
    
    if (result.provider !== "kimi") {
      throw new Error(`Expected provider 'kimi', got '${result.provider}'`);
    }
    
    log(colors.green("✓") + ` Response received in ${duration}ms`, 1);
    log(colors.gray("  Response: " + result.data.slice(0, 100)), 1);
    
    return { 
      name: "Simple API Call", 
      passed: true, 
      duration,
      details: result.data.slice(0, 200)
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(colors.red("✗") + ` Failed after ${duration}ms`, 1);
    log("  Error: " + error.message, 1);
    return { 
      name: "Simple API Call", 
      passed: false, 
      duration,
      error: error.message 
    };
  }
}

// Test 4: Schema validation
async function testSchemaValidation(): Promise<TestResult> {
  log("\n" + colors.blue("Test 4: Schema validation"));
  
  const start = Date.now();
  
  try {
    const kimi = agentfn({
      provider: "kimi",
      prompt: "Return a JSON object with these exact fields: {\"name\": \"test\", \"value\": 42, \"active\": true}",
      timeoutMs: 30000,
      schema: z.object({
        name: z.string(),
        value: z.number(),
        active: z.boolean(),
      }),
    });
    
    log("  Sending request with schema...", 1);
    const result = await kimi();
    const duration = Date.now() - start;
    
    log(colors.green("✓") + ` Valid response in ${duration}ms`, 1);
    log(colors.gray("  Data: " + JSON.stringify(result.data)), 1);
    
    return { 
      name: "Schema Validation", 
      passed: true, 
      duration,
      details: result.data
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(colors.red("✗") + ` Failed after ${duration}ms`, 1);
    log("  Error: " + error.message, 1);
    return { 
      name: "Schema Validation", 
      passed: false, 
      duration,
      error: error.message 
    };
  }
}

// Test 5: Streaming
async function testStreaming(): Promise<TestResult> {
  log("\n" + colors.blue("Test 5: Streaming response"));
  
  const start = Date.now();
  const chunks: string[] = [];
  
  try {
    const kimi = agentfn({
      provider: "kimi",
      prompt: "Count from 1 to 5, each number on a new line.",
      timeoutMs: 30000,
      hooks: {
        onStream: (chunk) => {
          chunks.push(chunk);
        },
      },
    });
    
    log("  Sending request with streaming...", 1);
    const result = await kimi();
    const duration = Date.now() - start;
    
    if (chunks.length === 0) {
      throw new Error("No streaming chunks received");
    }
    
    log(colors.green("✓") + ` Received ${chunks.length} chunks in ${duration}ms`, 1);
    log(colors.gray("  Total length: " + result.data.length + " chars"), 1);
    
    return { 
      name: "Streaming", 
      passed: true, 
      duration,
      details: { chunkCount: chunks.length }
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(colors.red("✗") + ` Failed after ${duration}ms`, 1);
    log("  Error: " + error.message, 1);
    return { 
      name: "Streaming", 
      passed: false, 
      duration,
      error: error.message 
    };
  }
}

// Test 6: Template input
async function testTemplateInput(): Promise<TestResult> {
  log("\n" + colors.blue("Test 6: Template input ({{input}})"));
  
  const start = Date.now();
  
  try {
    const kimi = agentfn({
      provider: "kimi",
      prompt: "Echo back exactly: {{input}}",
      timeoutMs: 30000,
    });
    
    log("  Sending request with template...", 1);
    const testInput = "Hello from Kimi template test!";
    const result = await kimi(testInput);
    const duration = Date.now() - start;
    
    if (!result.data.includes(testInput)) {
      throw new Error("Template input not found in response");
    }
    
    log(colors.green("✓") + ` Response in ${duration}ms`, 1);
    log(colors.gray("  Response: " + result.data.slice(0, 100)), 1);
    
    return { 
      name: "Template Input", 
      passed: true, 
      duration,
      details: result.data.slice(0, 200)
    };
  } catch (error: any) {
    const duration = Date.now() - start;
    log(colors.red("✗") + ` Failed after ${duration}ms`, 1);
    log("  Error: " + error.message, 1);
    return { 
      name: "Template Input", 
      passed: false, 
      duration,
      error: error.message 
    };
  }
}

// Print summary
function printSummary(results: TestResult[]) {
  console.log("\n" + "=".repeat(50));
  console.log(colors.blue("Test Summary"));
  console.log("=".repeat(50));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  for (const result of results) {
    const icon = result.passed ? colors.green("✓") : colors.red("✗");
    const duration = result.duration ? ` (${result.duration}ms)` : "";
    console.log(`${icon} ${result.name}${duration}`);
    if (result.error) {
      console.log("  " + colors.red("Error: " + result.error));
    }
  }
  
  console.log("-".repeat(50));
  console.log(`Total: ${results.length} | ${colors.green(passed.toString() + " passed")} | ${colors.red(failed.toString() + " failed")}`);
  
  if (failed > 0) {
    console.log("\n" + colors.yellow("Troubleshooting:"));
    console.log("1. Make sure 'kimi' CLI is installed: npm install -g @moonshot-ai/kimi-cli");
    console.log("2. Set your API key: export MOONSHOT_API_KEY=your_key");
    console.log("3. Check your internet connection");
    console.log("4. Check the Kimi service status");
  }
}

// Main
async function main() {
  console.log(colors.blue("=".repeat(50)));
  console.log(colors.blue("Kimi Backend Diagnostic Tests"));
  console.log(colors.blue("=".repeat(50)));
  
  // Run all tests
  results.push(await testCliInstalled());
  results.push(await testApiKey());
  
  // Only run API tests if CLI is available
  const cliOk = results[0]?.passed && results[1]?.passed;
  
  if (cliOk) {
    results.push(await testSimpleCall());
    results.push(await testSchemaValidation());
    results.push(await testStreaming());
    results.push(await testTemplateInput());
  } else {
    log("\n" + colors.yellow("Skipping API tests - CLI or API key not configured"));
  }
  
  printSummary(results);
  
  process.exit(results.some(r => !r.passed) ? 1 : 0);
}

main().catch((error) => {
  console.error(colors.red("Fatal error:"), error);
  process.exit(1);
});
