/**
 * Real integration test — calls codexfn with the actual codex CLI.
 *
 * Requires `codex` CLI installed and authenticated.
 * Skips gracefully if the binary is absent.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { codexfn } from "@openplaybooks/codexfn";

function hasBinary(name: string): boolean {
  try {
    execSync(`which ${name}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

// Live-AI opt-in (same convention as mixed-model.test.ts): these tests
// assert on real agent output, so they only run with CONVERGE_LIVE_AI=1.
const runLive = process.env.CONVERGE_LIVE_AI === "1";
const describeReal = hasBinary("codex") && runLive ? describe : describe.skip;

describeReal("codexfn — real integration", () => {
  it("answers a simple math question", async () => {
    const fn = codexfn({
      prompt: "What is 2+2? Answer with just the number.",
      sandbox: "read-only",
    });
    const result = await fn();
    expect(result.raw.length).toBeGreaterThan(0);
    expect(result.durationMs).toBeGreaterThan(0);
    expect(/\b4\b/.test(result.raw)).toBe(true);
  }, 120_000);

  it("generates structured JSON output", async () => {
    // zod isn't a root devDependency; only the codex binary path needs it,
    // and the binary's absence already short-circuits the describe.
    const { z } = await import("zod");
    const nameSchema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const fn = codexfn({
      prompt:
        'Return a JSON object with "name" (string) and "age" (number) for a fictional character. Output ONLY the JSON object, no markdown.',
      schema: nameSchema,
      sandbox: "read-only",
    });
    const result = await fn();
    expect(typeof result.data.name).toBe("string");
    expect(result.data.name.length).toBeGreaterThan(0);
    expect(typeof result.data.age).toBe("number");
    expect(result.data.age).toBeGreaterThan(0);
    // raw should be preserved alongside parsed data
    expect(result.raw.length).toBeGreaterThan(0);
  }, 120_000);
});
