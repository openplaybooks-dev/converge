#!/usr/bin/env tsx
/**
 * Reproduction script for Claude CLI hang issue
 *
 * Tests two scenarios:
 * 1. WITH MCP bypass flags (--strict-mcp-config --mcp-config) - HANGS for 2 minutes
 * 2. WITHOUT MCP bypass flags - Works immediately
 */

import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

async function testClaudeStartup(
  testName: string,
  args: string[],
  prompt: string,
): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`TEST: ${testName}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`Command: claude ${args.join(" ")}`);
  console.log(`Prompt: ${prompt}`);
  console.log(`Starting at: ${new Date().toISOString()}`);

  const startTime = Date.now();
  let firstOutputTime: number | null = null;

  return new Promise((resolve, reject) => {
    const proc = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        CLAUDE_CODE_DISABLE_BACKGROUND_TASKS: "1",
      },
    });

    proc.stdin!.write(prompt);
    proc.stdin!.end();

    let stdout = "";
    let stderr = "";
    let hasOutput = false;

    // Timeout after 30 seconds for testing purposes
    const timeout = setTimeout(() => {
      proc.kill();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n❌ TIMEOUT after ${elapsed}s (no output)`);
      console.log(`   This confirms the hang issue!`);
      reject(new Error(`Timeout after ${elapsed}s`));
    }, 30000);

    proc.stdout!.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      if (!hasOutput) {
        hasOutput = true;
        firstOutputTime = Date.now();
        const elapsed = ((firstOutputTime - startTime) / 1000).toFixed(1);
        console.log(`\n✅ First output after ${elapsed}s`);
      }
      stdout += text;
      process.stdout.write(text);
    });

    proc.stderr!.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
      process.stderr.write(chunk.toString());
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      if (code === 0) {
        console.log(`\n✅ SUCCESS in ${elapsed}s`);
        console.log(
          `   Time to first output: ${firstOutputTime ? ((firstOutputTime - startTime) / 1000).toFixed(1) : "N/A"}s`,
        );
        resolve();
      } else {
        console.log(`\n❌ FAILED with exit code ${code} after ${elapsed}s`);
        if (stderr) {
          console.log(`   stderr: ${stderr.slice(0, 200)}`);
        }
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

async function main() {
  console.log("Claude CLI Hang Reproduction Script");
  console.log("====================================\n");

  const testPrompt = 'Say "Hello" and nothing else.';

  // Test 1: WITH MCP bypass (the problematic scenario)
  console.log(
    "\n📋 Test 1: WITH --strict-mcp-config and --mcp-config (EXPECTED TO HANG)",
  );
  const sessionId1 = randomUUID();
  const tempMcpConfig1 = join(tmpdir(), `test-mcp-${sessionId1}.json`);
  writeFileSync(tempMcpConfig1, '{"mcpServers":{}}', "utf-8");

  try {
    await testClaudeStartup(
      "WITH MCP bypass flags",
      [
        "--dangerously-skip-permissions",
        "-p",
        "--no-session-persistence",
        "--strict-mcp-config",
        "--mcp-config",
        tempMcpConfig1,
      ],
      testPrompt,
    );
  } catch (err: any) {
    console.log(`\n⚠️  Test 1 result: ${err.message}`);
  } finally {
    try {
      unlinkSync(tempMcpConfig1);
    } catch {}
  }

  // Wait a bit between tests
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Test 2: WITHOUT MCP bypass (the working scenario)
  console.log("\n\n📋 Test 2: WITHOUT --strict-mcp-config (EXPECTED TO WORK)");

  try {
    await testClaudeStartup(
      "WITHOUT MCP bypass flags",
      ["--dangerously-skip-permissions", "-p", "--no-session-persistence"],
      testPrompt,
    );
  } catch (err: any) {
    console.log(`\n⚠️  Test 2 result: ${err.message}`);
  }

  console.log("\n\n" + "=".repeat(70));
  console.log("CONCLUSION");
  console.log("=".repeat(70));
  console.log("If Test 1 timed out and Test 2 succeeded, this confirms that");
  console.log("the --strict-mcp-config flag causes Claude CLI to hang.");
  console.log("");
  console.log("FIX: Remove the MCP bypass mechanism from claudefn.ts");
  console.log("=".repeat(70));
}

main().catch(console.error);
