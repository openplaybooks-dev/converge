import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, type ChildProcess } from "node:child_process";

const FIXTURE = resolve(
  process.cwd(),
  "tests",
  "test-human-review-playbook",
  ".converge",
  "playbooks",
  "handoff-review",
);
const CLI = resolve(process.cwd(), "packages", "cli", "dist", "index.js");

interface ProcResult { code: number; out: string }

/** Run a CLI command to completion (for short-lived commands). */
async function runCli(cwd: string, args: string[]): Promise<ProcResult> {
  return new Promise((resolveP) => {
    const child = spawn("node", [CLI, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout?.on("data", (c: Buffer) => { out += String(c); });
    child.stderr?.on("data", (c: Buffer) => { out += String(c); });
    child.once("exit", (code) => resolveP({ code: code ?? -1, out }));
  });
}

/** Spawn a long-running CLI command and return the process + a way to read its output. */
function spawnCli(cwd: string, args: string[]): { child: ChildProcess; out: () => string; exit: Promise<ProcResult> } {
  const child = spawn("node", [CLI, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let buf = "";
  child.stdout?.on("data", (c: Buffer) => { buf += String(c); });
  child.stderr?.on("data", (c: Buffer) => { buf += String(c); });
  const exit = new Promise<ProcResult>((res) => {
    child.once("exit", (code) => res({ code: code ?? -1, out: buf }));
  });
  return { child, out: () => buf, exit };
}

async function waitFor(predicate: () => boolean, timeoutMs: number, label: string): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for ${label} after ${timeoutMs}ms`);
}

describe("review flow (CLI-only, no HTTP)", { sequential: true }, () => {
  let ws: string;
  const procs: ChildProcess[] = [];
  let testIdx = 0;

  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), `rf-test-${++testIdx}-`));
    mkdirSync(join(ws, ".converge"), { recursive: true });
    writeFileSync(join(ws, ".converge", "project.yaml"), "name: test\n", "utf8");
  });

  afterEach(async () => {
    for (const p of procs) {
      try { p.kill("SIGKILL"); } catch { /* dead */ }
    }
    procs.length = 0;
    await new Promise((r) => setTimeout(r, 100));
    rmSync(ws, { recursive: true, force: true });
  });

  it("runner stays alive on awaiting-review; approve via CLI resumes it", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    const { child, out, exit } = spawnCli(ws, [
      "run", "--playbook=handoff-review", "--select=manager-report", "--stub",
    ]);
    procs.push(child);

    // Wait for the awaiting-review block to print.
    await waitFor(() => out().includes("awaiting-review"), 30_000, "awaiting-review line");

    const jsonl = join(ws, ".converge", "inventory", "handoff-review", "tasks.jsonl");
    const reviewRow = readFileSync(jsonl, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l))
      .find((row) => row.kind === "task" && row.id === "manager-report");
    expect(reviewRow?.status).toBe("awaiting-review");

    // The leaf produced its main-work deliverable AND the handoff review
    // artifact before the gate fired (the stub stands in for the AI).
    expect(existsSync(join(ws, "docs", "findings.json"))).toBe(true);
    expect(existsSync(join(ws, "docs", "review.html"))).toBe(true);

    // Approve from a second CLI invocation while the runner is still alive.
    const rev = await runCli(ws, [
      "review", "manager-report", "--approve", "--playbook=handoff-review",
    ]);
    expect(rev.code).toBeFalsy();
    expect(rev.out).toContain("Recorded approve");

    const final = await exit;
    expect(final.code).toBe(0);
    expect(final.out).toContain("received approve");
    const doneRow = readFileSync(jsonl, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l))
      .find((row) => row.kind === "task" && row.id === "manager-report");
    expect(doneRow?.status).toBe("done");
  }, 60_000);

  it("revise records the verdict; the next approve clears the gate", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    const { child, out, exit } = spawnCli(ws, [
      "run", "--playbook=handoff-review", "--select=manager-report", "--stub",
    ]);
    procs.push(child);

    await waitFor(() => out().includes("awaiting-review"), 30_000, "first awaiting-review");

    const rev1 = await runCli(ws, [
      "review", "manager-report",
      "--revise", "Add concrete risk metrics.",
      "--playbook=handoff-review",
    ]);
    expect(rev1.code).toBeFalsy();
    await waitFor(() => out().includes("received revise"), 15_000, "revise echo");

    const rev2 = await runCli(ws, [
      "review", "manager-report", "--approve", "--playbook=handoff-review",
    ]);
    expect(rev2.code).toBeFalsy();

    const final = await exit;
    expect(final.code).toBe(0);

    const jsonl = join(ws, ".converge", "inventory", "handoff-review", "reports", "manager-report.jsonl");
    const entries = readFileSync(jsonl, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(entries.map((e) => e.decision)).toEqual(["revise", "approve"]);
    expect(entries[0].feedback).toContain("risk metrics");
  }, 90_000);

  it("reject records the verdict and the runner does not mark the task done", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    const { child, out } = spawnCli(ws, [
      "run", "--playbook=handoff-review", "--select=manager-report", "--stub",
    ]);
    procs.push(child);

    await waitFor(() => out().includes("awaiting-review"), 30_000, "awaiting-review");

    const rej = await runCli(ws, [
      "review", "manager-report",
      "--reject", "Findings are unsupported.",
      "--playbook=handoff-review",
    ]);
    expect(rej.code).toBeFalsy();
    // The runner picks the verdict up and holds the gate (it does not complete).
    await waitFor(() => out().includes("received reject"), 15_000, "reject echo");

    const reports = join(ws, ".converge", "inventory", "handoff-review", "reports", "manager-report.jsonl");
    const entries = readFileSync(reports, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    expect(entries.map((e) => e.decision)).toEqual(["reject"]);
    expect(entries[0].feedback).toContain("unsupported");

    const tasks = join(ws, ".converge", "inventory", "handoff-review", "tasks.jsonl");
    const row = readFileSync(tasks, "utf8")
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l))
      .find((r) => r.kind === "task" && r.id === "manager-report");
    expect(row?.status).not.toBe("done");
  }, 60_000);

  it("any writer (not just `converge review`) can submit a verdict; runner picks it up", async () => {
    // Simulates the Studio UI: append a verdict directly to the JSONL.
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    const { child, out, exit } = spawnCli(ws, [
      "run", "--playbook=handoff-review", "--select=manager-report", "--stub",
    ]);
    procs.push(child);

    await waitFor(() => out().includes("awaiting-review"), 30_000, "awaiting-review");

    const jsonl = join(ws, ".converge", "inventory", "handoff-review", "reports", "manager-report.jsonl");
    mkdirSync(join(ws, ".converge", "inventory", "handoff-review", "reports"), { recursive: true });
    const entry = {
      ts: new Date().toISOString(),
      playbook: "handoff-review",
      taskId: "manager-report",
      reportTitle: "manager-report",
      summary: "",
      decision: "approve",
      feedback: "",
    };
    writeFileSync(jsonl, JSON.stringify(entry) + "\n", { flag: "a" });

    const final = await exit;
    expect(final.code).toBe(0);
  }, 60_000);

  it("review on an unknown task id exits 1 with a clear error", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });
    await runCli(ws, ["compile", "--playbook=handoff-review"]);

    const r = await runCli(ws, [
      "review", "does-not-exist", "--approve", "--playbook=handoff-review",
    ]);
    expect(r.code).toBe(1);
    expect(r.out.toLowerCase()).toContain("not found");
  }, 30_000);

  it("review --revise without a feedback string exits 1", async () => {
    const r = await runCli(ws, ["review", "manager-report", "--revise"]);
    expect(r.code).toBe(1);
    expect(r.out.toLowerCase()).toContain("non-empty feedback");
  }, 15_000);
});
