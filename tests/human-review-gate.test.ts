import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, ChildProcess } from "node:child_process";

const FIXTURE = resolve(
  process.cwd(),
  "tests",
  "test-human-review-playbook",
  ".converge",
  "playbooks",
  "handoff-review",
);
const CLI = resolve(process.cwd(), "packages", "cli", "dist", "index.js");

// Track all CLI processes spawned per test to ensure cleanup
const spawned: number[] = [];
let testIdx = 0;

async function cleanKill(pid: number) {
  try { process.kill(pid, "SIGKILL"); } catch { /* dead already */ }
  await new Promise((r) => setTimeout(r, 300));
}

async function waitForUrl(
  getOut: () => string,
  timeoutMs: number,
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const out = getOut();
    // Wait for a full URL with token param, not the short /studio/handoff/… path
    const m = out.match(/https?:\/\/\S+\?token=\S+/);
    if (m) {
      // URL found — verify server is actually listening before returning
      const url = m[0];
      try {
        const port = Number(new URL(url).port);
        const probe = await fetch(`http://127.0.0.1:${port}/?token=${new URL(url).searchParams.get("token")}`);
        if (probe.ok || probe.status === 401) return url;
      } catch {
        // Server not up yet — keep waiting
      }
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out waiting for URL in output`);
}

async function pollStudio(studioStatePath: string, timeoutMs: number) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(studioStatePath)) {
      try {
        const st = JSON.parse(readFileSync(studioStatePath, "utf8")) as { port: number; token: string };
        // Probe the base studio URL (which always exists if server is running)
        const probe = `http://127.0.0.1:${st.port}/?token=${st.token}`;
        try {
          const r = await fetch(probe);
          if (r.ok || r.status === 401) return st;
        } catch { /* not ready yet */ }
      } catch { /* file corrupt */ }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function waitForStudio(ws: string, timeoutMs: number) {
  const uiDir = join(ws, ".converge", "ui");
  const statePath = join(uiDir, "studio-server.json");
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (existsSync(statePath)) {
      try {
        const st = JSON.parse(readFileSync(statePath, "utf8")) as { port: number; token: string };
        const probe = `http://127.0.0.1:${st.port}/?token=${st.token}`;
        try {
          const r = await fetch(probe);
          if (r.ok || r.status === 401) return st;
          // Any other response means server IS running — keep polling until it stabilizes
        } catch {
          // ECONNREFUSED or other network error - server not running yet or died.
          // Delete stale state so r2 creates a fresh server.
          try { rmSync(statePath, { force: true }); } catch { /* best effort */ }
          return null;
        }
      } catch { /* file corrupt — wait */ }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function postHandoff(url: string, action: string, feedback: string, retries = 15): Promise<number> {
  for (let i = 0; i < retries; i++) {
    try {
      const resp = await fetch(url, {
        method: "POST",
        redirect: "manual",
        body: new URLSearchParams({ action, feedback }),
      });
      return resp.status;
    } catch {
      if (i === retries - 1) throw new Error(`POST failed after ${retries} attempts`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("unreachable");
}

describe("human review gate workflow", { sequential: true }, () => {
  let ws: string;
  beforeEach(() => {
    ws = mkdtempSync(join(tmpdir(), `hng-test-${++testIdx}-`));
    mkdirSync(join(ws, ".converge"), { recursive: true });
    writeFileSync(join(ws, ".converge", "project.yaml"), "name: test\n", "utf8");
  });

  afterEach(async () => {
    for (const pid of spawned) {
      try { process.kill(pid, "SIGKILL"); } catch { /* dead */ }
      await new Promise((r) => setTimeout(r, 200));
    }
    spawned.length = 0;
    rmSync(ws, { recursive: true, force: true });
  });

  function spawnCli(args: string[]): ChildProcess {
    const child = spawn("node", [CLI, ...args], {
      cwd: ws,
      stdio: ["ignore", "pipe", "pipe"],
    });
    spawned.push(child.pid);
    return child;
  }

  it("accept completes the task", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    const cli = spawnCli(["run", "--playbook=handoff-review", "--select=manager-report"]);
    const out = collect(cli);
    const url = await waitForUrl(() => out(), 20_000);
    await new Promise((r) => setTimeout(r, 200));
    expect(out()).toContain("Human review required");

    const resp = await fetch(url, {
      method: "POST",
      redirect: "manual",
      body: new URLSearchParams({ action: "accept", feedback: "LGTM" }),
    });
    expect(resp.status).toBe(303);

    const code = await exitCode(cli);
    expect(code).toBe(0);
    expect(out()).toContain("Task complete");
    expect(readFileSync(join(ws, ".converge", "inventory", "handoff-review", "reports", "manager-report.jsonl"), "utf8")).toContain('"decision":"approve"');
  }, 60_000);

  it("cancel exits 130", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });
    const cli = spawnCli(["run", "--playbook=handoff-review", "--select=manager-report"]);
    const out = collect(cli);
    await waitForUrl(() => out(), 20_000);
    cli.kill("SIGINT");
    const { code, signal } = await waitExit(cli);
    expect(signal).toBeNull();
    expect(code).toBe(130);
  }, 30_000);

  it("feedback (revise) exits 1 and records decision", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    // First run: block on review
    const cli = spawnCli(["run", "--playbook=handoff-review", "--select=manager-report"]);
    const out = collect(cli);
    const url = await waitForUrl(() => out(), 20_000);
    await new Promise((r) => setTimeout(r, 200));
    expect(out()).toContain("Human review required");

    // Submit feedback
    const status1 = await postHandoff(url, "feedback", "Add concrete risk metrics and examples.");
    expect(status1).toBe(303);

    // CLI should exit 1
    const code = await exitCode(cli);
    expect(code).toBe(1);
    expect(out()).toContain("needs revision");

    // Verify jsonl has revise entry
    const jsonl = join(ws, ".converge", "inventory", "handoff-review", "reports", "manager-report.jsonl");
    expect(existsSync(jsonl)).toBe(true);
    expect(readFileSync(jsonl, "utf8")).toContain('"decision":"revise"');
    expect(readFileSync(jsonl, "utf8")).toContain("risk metrics");
  }, 60_000);

  it("resume picks up revise decision and re-blocks on review", async () => {
    await cp(FIXTURE, join(ws, ".converge", "playbooks", "handoff-review"), { recursive: true });

    // Run 1: feedback + exit 1
    const r1 = spawnCli(["run", "--playbook=handoff-review", "--select=manager-report"]);
    const o1 = collect(r1);
    const u1 = await waitForUrl(() => o1(), 20_000);
    expect(await postHandoff(u1, "feedback", "Revise.")).toBe(303);
    expect(await exitCode(r1)).toBe(1);
    expect(o1()).toContain("needs revision");

    // Resume: should detect revise and re-block with a fresh URL
    const r2 = spawnCli(["run", "--playbook=handoff-review", "--select=manager-report", "--resume"]);
    const o2 = collect(r2);
    // r2 may output a URL pointing to r1's dead server. Track dead ports
    // and keep polling until r2's fresh server starts and prints a new URL.
    const deadPorts = new Set<number>();
    let u2 = "";
    for (let i = 0; i < 60; i++) {
      const out = o2();
      const m = out.match(/https?:\/\/\S+\?token=\S+/);
      if (m) {
        const url = m[0];
        const parsed = new URL(url);
        const port = Number(parsed.port);
        if (!deadPorts.has(port)) {
          try {
            const r = await fetch(`http://127.0.0.1:${port}/?token=${parsed.searchParams.get("token")}`);
            if (r.ok || r.status === 401) {
              u2 = url;
              break;
            }
          } catch {
            deadPorts.add(port);
          }
        }
      }
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!u2) throw new Error(`No live URL. Dead ports: ${[...deadPorts]}. Output: ${o2().slice(-300)}`);
    expect(o2()).toContain("Human review required");
    expect(await postHandoff(u2, "accept", "Good enough.")).toBe(303);
    expect(await exitCode(r2)).toBe(0);
    expect(o2()).toContain("Task complete");
  }, 60_000);
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function collect(cp: ChildProcess): () => string {
  let buf = "";
  cp.stdout?.on("data", (c: Buffer) => { buf += String(c); });
  cp.stderr?.on("data", (c: Buffer) => { buf += String(c); });
  return () => buf;
}

async function exitCode(cp: ChildProcess): Promise<number> {
  return new Promise((res) => {
    cp.once("exit", (c) => res(c ?? 1));
    cp.once("error", () => res(1));
  });
}

async function waitExit(cp: ChildProcess): Promise<{ code: number; signal: string | null }> {
  return new Promise((res) => {
    cp.once("exit", (code, sig) => res({ code: code ?? 1, signal: sig }));
    cp.once("error", () => res({ code: 1, signal: null }));
  });
}
