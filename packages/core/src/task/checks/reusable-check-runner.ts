/**
 * Reusable Check Runner
 *
 * Runs a TestDef (from a .test.md file) against a given context.
 * Supports two check types:
 * - cmd:  shell command with {{ args.<key> }} substitution
 * - js:   JavaScript executed in a child Node process with a context API
 */

import { execSync, execFileSync } from "node:child_process";
import type { TestDef } from "../../config/test-md-definition.ts";

export interface RunContext {
  inputs: string[];
  vars: Record<string, unknown>;
}

export async function runReusableCheck(
  test: TestDef,
  ctx: RunContext,
): Promise<{ passed: boolean; message?: string }> {
  if (test.type === "cmd") {
    return runCmdCheck(test, ctx);
  }
  return runJsCheck(test, ctx);
}

function runCmdCheck(
  test: TestDef,
  ctx: RunContext,
): { passed: boolean; message?: string } {
  const script = substituteArgs(test.script, ctx);
  try {
    execSync(script, { stdio: "pipe", timeout: 30_000 });
    return { passed: true };
  } catch (err: any) {
    return {
      passed: false,
      message: err.stderr?.toString() || err.message || "Command failed",
    };
  }
}

function runJsCheck(
  test: TestDef,
  ctx: RunContext,
): { passed: boolean; message?: string } {
  const userScript = substituteArgs(test.script, ctx);

  const bootstrap = [
    `const ctx_inputs = ${JSON.stringify(ctx.inputs)};`,
    `const ctx_vars = ${JSON.stringify(ctx.vars)};`,
    `const assert = (condition, message) => { if (!condition) throw new Error(message || 'Assertion failed'); };`,
    `const readFile = (path) => require('fs').readFileSync(path, 'utf-8');`,
    `const context = { inputs: ctx_inputs, vars: ctx_vars, assert, readFile };`,
    userScript,
  ].join("\n");

  try {
    execFileSync(process.execPath, ["-e", bootstrap], {
      stdio: "pipe",
      timeout: 30_000,
    });
    return { passed: true };
  } catch (err: any) {
    return {
      passed: false,
      message: err.stderr?.toString() || err.message || "JS check failed",
    };
  }
}

function substituteArgs(
  script: string,
  ctx: RunContext,
): string {
  return script.replace(/\{\{\s*args\.(\w+)\s*\}\}/g, (_, key) => {
    if (key in ctx.vars) return String(ctx.vars[key]);
    return `{{ args.${key} }}`;
  });
}
