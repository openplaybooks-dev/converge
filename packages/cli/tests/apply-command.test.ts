/**
 * RFC 0021 — `converge apply <manifest.jsonl>` integration test.
 *
 * Drives the built CLI binary against a temp workspace; covers exit codes,
 * the result-file location, and the end-to-end success+failure shape.
 */
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(__dirname, "../../..");
const CLI = resolve(REPO_ROOT, "packages/cli/dist/index.js");

interface RunResult {
  stdout: string;
  stderr: string;
  status: number;
}

function runApply(
  cwd: string,
  args: string[],
  env: Record<string, string>,
): RunResult {
  try {
    const stdout = execFileSync("node", [CLI, "apply", ...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 20_000,
      env: { ...process.env, ...env },
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err: any) {
    return {
      stdout: err.stdout?.toString() ?? "",
      stderr: err.stderr?.toString() ?? "",
      status: err.status ?? 1,
    };
  }
}

function readJsonl<T = unknown>(path: string): T[] {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l) as T);
}

function writeTemplate(
  workspace: string,
  playbook: string,
  templateName: string,
  body: string,
): void {
  const dir = join(
    workspace,
    ".converge",
    "playbooks",
    playbook,
    "templates",
    templateName,
  );
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "TASK.md"), body, "utf-8");
}

describe("converge apply", () => {
  let workspace: string;

  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @openplaybooks/converge build' first.`,
      );
    }
  });

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-apply-cli-"));
    mkdirSync(join(workspace, ".converge", "tmp"), { recursive: true });
    return () => rmSync(workspace, { recursive: true, force: true });
  });

  it("exits 0 and writes a result file when every row succeeds", () => {
    writeTemplate(workspace, "pb1", "alpha", "---\nid: alpha\n---\n# alpha\n");
    writeTemplate(workspace, "pb1", "beta", "---\nid: beta\n---\n# beta\n");

    const manifestPath = join(workspace, "manifest.jsonl");
    writeFileSync(
      manifestPath,
      [
        `{"id":"a","template":"alpha"}`,
        `{"id":"b","template":"beta","after":["a"]}`,
      ].join("\n") + "\n",
      "utf-8",
    );

    const result = runApply(workspace, [manifestPath], {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "pb1",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("spawned: a");
    expect(result.stdout).toContain("spawned: b");
    expect(result.stdout).toContain("apply complete: 2 ok, 0 failed");

    const resultPath = manifestPath.replace(/\.jsonl$/, ".result.jsonl");
    expect(existsSync(resultPath)).toBe(true);
    const rows = readJsonl<{ id: string; ok: boolean }>(resultPath);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.ok)).toBe(true);
  });

  it("exits 3 when any row fails, but still writes result file", () => {
    writeTemplate(workspace, "pb1", "alpha", "---\nid: alpha\n---\n# alpha\n");
    // beta is missing — second row will fail with template-not-found

    const manifestPath = join(workspace, "manifest.jsonl");
    writeFileSync(
      manifestPath,
      [
        `{"id":"good","template":"alpha"}`,
        `{"id":"bad","template":"missing-tpl"}`,
      ].join("\n") + "\n",
      "utf-8",
    );

    const result = runApply(workspace, [manifestPath], {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "pb1",
    });

    expect(result.status).toBe(3);
    expect(result.stderr).toMatch(/bad failed \[template-not-found\]/);

    const resultPath = manifestPath.replace(/\.jsonl$/, ".result.jsonl");
    const rows = readJsonl<{ id: string; ok: boolean; errorCode?: string }>(
      resultPath,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].ok).toBe(true);
    expect(rows[1].ok).toBe(false);
    expect(rows[1].errorCode).toBe("template-not-found");
  });

  it("exits 2 when CONVERGE_PLAYBOOK is unset", () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = join(workspace, "manifest.jsonl");
    writeFileSync(manifestPath, `{"id":"x","template":"tpl"}\n`, "utf-8");

    const cleanEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (k === "CONVERGE_PLAYBOOK") continue;
      if (typeof v === "string") cleanEnv[k] = v;
    }
    cleanEnv.CONVERGE_WORKSPACE = workspace;

    try {
      execFileSync("node", [CLI, "apply", manifestPath], {
        cwd: workspace,
        encoding: "utf-8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: 20_000,
        env: cleanEnv,
      });
      throw new Error("expected non-zero exit");
    } catch (err: any) {
      expect(err.status).toBe(2);
      expect(err.stderr?.toString()).toMatch(/CONVERGE_PLAYBOOK/);
    }
  });

  it("idempotent re-apply: second run reports idempotent rows, no duplicates", () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = join(workspace, "manifest.jsonl");
    writeFileSync(manifestPath, `{"id":"once","template":"tpl"}\n`, "utf-8");

    const env = {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "pb1",
    };
    const first = runApply(workspace, [manifestPath], env);
    expect(first.status).toBe(0);

    const second = runApply(workspace, [manifestPath], env);
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("idempotent: once");

    // tasks.jsonl has exactly one row
    const tasks = readJsonl<{ id: string }>(
      join(workspace, ".converge", "inventory", "pb1", "tasks.jsonl"),
    );
    expect(tasks.filter((t) => t.id === "once")).toHaveLength(1);
  });

  it("--dry: validates without mutating", () => {
    writeTemplate(workspace, "pb1", "tpl", "---\nid: tpl\n---\n# t\n");
    const manifestPath = join(workspace, "manifest.jsonl");
    writeFileSync(manifestPath, `{"id":"dry","template":"tpl"}\n`, "utf-8");

    const result = runApply(workspace, [manifestPath, "--dry"], {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "pb1",
    });
    expect(result.status).toBe(0);

    expect(
      existsSync(
        join(
          workspace,
          ".converge",
          "inventory",
          "pb1",
          "spawned",
          "dry",
          "TASK.md",
        ),
      ),
    ).toBe(false);
    expect(
      existsSync(
        join(workspace, ".converge", "inventory", "pb1", "tasks.jsonl"),
      ),
    ).toBe(false);
  });
});
