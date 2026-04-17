#!/usr/bin/env tsx
/**
 * Quick Kimi Test - One-liner test
 * 
 * Usage: npx tsx src/quick-test-kimi.ts
 */

import { agentfn } from "@converge/agentfn";

async function quickTest() {
  console.log("Testing Kimi backend...\n");
  
  try {
    const kimi = agentfn({
      provider: "kimi",
      prompt: "Say exactly 'Kimi is working!' and nothing else.",
      timeoutMs: 30000,
    });
    
    const result = await kimi();
    
    console.log("✓ Success!");
    console.log("  Provider:", result.provider);
    console.log("  Response:", result.data.slice(0, 100));
    console.log("  Duration:", result.durationMs, "ms");
    
  } catch (error: any) {
    console.error("✗ Failed:", error.message);
    console.error("\nTroubleshooting:");
    console.error("1. Check 'kimi' CLI is installed: which kimi");
    console.error("2. Check API key is set: echo $MOONSHOT_API_KEY");
    console.error("3. Run full diagnostics: npx tsx src/test-kimi.ts");
    process.exit(1);
  }
}

quickTest();
