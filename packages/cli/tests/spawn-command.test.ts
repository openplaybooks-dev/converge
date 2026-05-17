// NOTE: This suite covers the older `converge spawn task --id ... --task-file`
// CLI shape. The command was redesigned to
//   converge spawn <id> <template> [--var k=v] [--after <sibling>]
// (see `converge spawn --help` and packages/cli/src/commands-spawn.ts), so
// `--summary` / `--task-file` are now rejected outright. Skipped at the file
// level; rewrite against the new shape before flipping back on.
import { describe as describeRaw, it, expect, beforeAll, beforeEach } from "vitest";
const describe: typeof describeRaw = describeRaw.skip as unknown as typeof describeRaw;
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

function readJsonl(path: string): unknown[] {
  return readFileSync(path, "utf-8")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line));
}

function runSpawn(
  cwd: string,
  args: string[],
  env: Record<string, string>,
): { stdout: string; stderr: string; status: number } {
  try {
    const stdout = execFileSync("node", [CLI, "spawn", ...args], {
      cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 15_000,
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

describe("converge spawn task", () => {
  let workspace: string;

  beforeAll(() => {
    if (!existsSync(CLI)) {
      throw new Error(
        `CLI build missing at ${CLI}. Run 'pnpm --filter @converge/cli build' first.`,
      );
    }
  });

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-spawn-"));
    // tasks.jsonl writer needs the artifacts directory to be present-or-creatable.
    mkdirSync(join(workspace, ".converge", "tmp"), { recursive: true });
    return () => rmSync(workspace, { recursive: true, force: true });
  });

  it("writes the journal TASK.md and appends a task.upsert row", () => {
    const bodyPath = join(workspace, ".converge", "tmp", "epoch-001.md");
    writeFileSync(
      bodyPath,
      "---\nid: epoch-001\ntitle: Epoch 1\n---\n\n# body content\n",
      "utf-8",
    );

    const result = runSpawn(
      workspace,
      [
        "task",
        "--id",
        "epoch-001",
        "--summary",
        "first epoch",
        "--task-file",
        ".converge/tmp/epoch-001.md",
      ],
      {
        CONVERGE_WORKSPACE: workspace,
        CONVERGE_PLAYBOOK: "p1",
        CONVERGE_CURRENT_TASK_PATH: ".converge/journal/p1/tasks/build",
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("spawned: epoch-001");

    const taskMd = readFileSync(
      join(workspace, ".converge", "inventory", "p1", "spawned", "epoch-001", "TASK.md"),
      "utf-8",
    );
    expect(taskMd).toContain("# body content");

    const rows = readJsonl(
      join(workspace, ".converge", "inventory", "p1", "tasks.jsonl"),
    );
    const row = rows.find((r: any) => r.id === "epoch-001") as any;
    expect(row).toBeDefined();
    expect(row.status).toBe("todo");
    expect(row.source).toBe("spawned");
    // CONVERGE_CURRENT_TASK_PATH is the fallback when --parent isn't passed:
    // the resolver extracts the last segment of the path as the parent id.
    expect(row.parent).toBe("build");
    expect(row.playbook).toBe("p1");
    expect(row.taskPath).toBe(".converge/inventory/p1/spawned/epoch-001/TASK.md");
    // Inventory invariant: at most one row per id.
    expect(rows.filter((r: any) => r.id === "epoch-001")).toHaveLength(1);
  });

  it("rejects a duplicate task id with exit code 2", () => {
    const bodyPath = join(workspace, ".converge", "tmp", "dup.md");
    writeFileSync(bodyPath, "body", "utf-8");

    const env = {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "p1",
    };

    const first = runSpawn(
      workspace,
      ["task", "--id", "dup-1", "--task-file", ".converge/tmp/dup.md"],
      env,
    );
    expect(first.status).toBe(0);

    const second = runSpawn(
      workspace,
      ["task", "--id", "dup-1", "--task-file", ".converge/tmp/dup.md"],
      env,
    );
    expect(second.status).toBe(2);
    expect(second.stderr).toMatch(/duplicate task id/);
  });

  it("fails when CONVERGE_PLAYBOOK is unset", () => {
    const bodyPath = join(workspace, ".converge", "tmp", "x.md");
    writeFileSync(bodyPath, "body", "utf-8");

    // Build env that drops CONVERGE_PLAYBOOK only (need to start from a copy).
    const cleanEnv: Record<string, string> = {};
    for (const [k, v] of Object.entries(process.env)) {
      if (k === "CONVERGE_PLAYBOOK") continue;
      if (typeof v === "string") cleanEnv[k] = v;
    }
    cleanEnv.CONVERGE_WORKSPACE = workspace;

    try {
      execFileSync(
        "node",
        [
          CLI,
          "spawn",
          "task",
          "--id",
          "no-pb",
          "--task-file",
          ".converge/tmp/x.md",
        ],
        {
          cwd: workspace,
          encoding: "utf-8",
          stdio: ["ignore", "pipe", "pipe"],
          timeout: 15_000,
          env: cleanEnv,
        },
      );
      throw new Error("expected non-zero exit");
    } catch (err: any) {
      expect(err.status).toBe(2);
      expect(err.stderr?.toString()).toMatch(/CONVERGE_PLAYBOOK/);
    }
  });

  it("upserts in place — re-spawning is rejected, one row per id", () => {
    const bodyPath = join(workspace, ".converge", "tmp", "inv.md");
    writeFileSync(bodyPath, "body", "utf-8");

    const env = {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "p2",
    };

    // Spawn three distinct ids; expect three rows.
    for (const id of ["a", "b", "c"]) {
      const result = runSpawn(
        workspace,
        ["task", "--id", id, "--task-file", ".converge/tmp/inv.md"],
        env,
      );
      expect(result.status).toBe(0);
    }
    const rows = readJsonl(
      join(workspace, ".converge", "inventory", "p2", "tasks.jsonl"),
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r: any) => r.id).sort()).toEqual(["a", "b", "c"]);
    // Every row carries the inventory shape (no `event:` field).
    for (const r of rows as any[]) {
      expect(r.event).toBeUndefined();
      expect(typeof r.id).toBe("string");
      expect(typeof r.taskPath).toBe("string");
    }
  });

  describe("--dry", () => {
    it("validates and previews without writing journal or appending row", () => {
      const bodyPath = join(workspace, ".converge", "tmp", "preview.md");
      writeFileSync(bodyPath, "---\nid: probe\n---\n# preview\n", "utf-8");

      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "probe",
          "--summary",
          "preview probe",
          "--task-file",
          ".converge/tmp/preview.md",
          "--dry",
        ],
        {
          CONVERGE_WORKSPACE: workspace,
          CONVERGE_PLAYBOOK: "dryp",
        },
      );

      expect(result.status).toBe(0);
      // CLI prints a banner line before command output; locate the JSON block.
      const jsonStart = result.stdout.indexOf("{");
      expect(jsonStart, "expected a JSON block in stdout").toBeGreaterThan(-1);
      const parsed = JSON.parse(result.stdout.slice(jsonStart));
      expect(parsed.dry).toBe(true);
      expect(parsed.wouldWrite).toBe(
        ".converge/inventory/dryp/spawned/probe/TASK.md",
      );
      expect(parsed.wouldUpsert.id).toBe("probe");
      expect(parsed.wouldUpsert.source).toBe("spawned");
      expect(parsed.wouldUpsert.summary).toBe("preview probe");
      expect(parsed.bodyBytes).toBeGreaterThan(0);
      // Spawn-time YAML gate verdict is now part of --dry output.
      expect(parsed.frontmatterValid).toBe(true);
      expect(parsed.frontmatterError).toBeNull();

      // No state mutation.
      expect(
        existsSync(
          join(
            workspace,
            ".converge",
            "inventory",
            "dryp",
            "spawned",
            "probe",
            "TASK.md",
          ),
        ),
      ).toBe(false);
      expect(
        existsSync(
          join(workspace, ".converge", "inventory", "dryp", "tasks.jsonl"),
        ),
      ).toBe(false);
    });

    it("still fails on duplicate id even in --dry mode", () => {
      const bodyPath = join(workspace, ".converge", "tmp", "x.md");
      writeFileSync(bodyPath, "body", "utf-8");

      const env = {
        CONVERGE_WORKSPACE: workspace,
        CONVERGE_PLAYBOOK: "dup-dry",
      };

      // Real spawn to claim the id.
      const first = runSpawn(
        workspace,
        ["task", "--id", "claimed", "--task-file", ".converge/tmp/x.md"],
        env,
      );
      expect(first.status).toBe(0);

      // Dry rerun of same id should also reject.
      const dry = runSpawn(
        workspace,
        ["task", "--id", "claimed", "--task-file", ".converge/tmp/x.md", "--dry"],
        env,
      );
      expect(dry.status).toBe(2);
      expect(dry.stderr).toMatch(/duplicate task id/);
    });
  });

  describe("--parent", () => {
    it("resolves --parent <id> to a taskPath via tasks.jsonl", () => {
      const bodyPath = join(workspace, ".converge", "tmp", "x.md");
      writeFileSync(bodyPath, "body", "utf-8");

      const env = {
        CONVERGE_WORKSPACE: workspace,
        CONVERGE_PLAYBOOK: "pr",
      };

      // Create the "parent" task in the ledger.
      const parentRes = runSpawn(
        workspace,
        ["task", "--id", "the-parent", "--task-file", ".converge/tmp/x.md"],
        env,
      );
      expect(parentRes.status).toBe(0);

      // Spawn a child of it by id.
      const childRes = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "the-child",
          "--task-file",
          ".converge/tmp/x.md",
          "--parent",
          "the-parent",
        ],
        env,
      );
      expect(childRes.status).toBe(0);

      const rows = readJsonl(
        join(workspace, ".converge", "inventory", "pr", "tasks.jsonl"),
      );
      const child = rows.find((r: any) => r.id === "the-child") as any;
      // The upsert stores `parent` as the parent task's id (resolved from
      // tasks.jsonl when --parent <id> is passed), not a taskPath.
      expect(child.parent).toBe("the-parent");
    });

    it("accepts --parent <full-path> verbatim", () => {
      const bodyPath = join(workspace, ".converge", "tmp", "x.md");
      writeFileSync(bodyPath, "body", "utf-8");

      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "rooted",
          "--task-file",
          ".converge/tmp/x.md",
          "--parent",
          ".converge/journal/path-pb/tasks/explicit",
        ],
        {
          CONVERGE_WORKSPACE: workspace,
          CONVERGE_PLAYBOOK: "path-pb",
        },
      );
      expect(result.status).toBe(0);
      const rows = readJsonl(
        join(workspace, ".converge", "inventory", "path-pb", "tasks.jsonl"),
      );
      const row = rows.find((r: any) => r.id === "rooted") as any;
      // When --parent receives a path, the resolver extracts the last segment
      // as the parent id ("explicit") and stores it as `parent`.
      expect(row.parent).toBe("explicit");
    });

    it("fails with a clear error when --parent <id> is unknown", () => {
      const bodyPath = join(workspace, ".converge", "tmp", "x.md");
      writeFileSync(bodyPath, "body", "utf-8");

      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "orphan",
          "--task-file",
          ".converge/tmp/x.md",
          "--parent",
          "no-such-id",
        ],
        {
          CONVERGE_WORKSPACE: workspace,
          CONVERGE_PLAYBOOK: "unk",
        },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/no task with id 'no-such-id'/);
    });

    it("overrides CONVERGE_CURRENT_TASK_PATH when both are present", () => {
      const bodyPath = join(workspace, ".converge", "tmp", "x.md");
      writeFileSync(bodyPath, "body", "utf-8");

      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "override-child",
          "--task-file",
          ".converge/tmp/x.md",
          "--parent",
          ".converge/journal/ovr/tasks/chosen",
        ],
        {
          CONVERGE_WORKSPACE: workspace,
          CONVERGE_PLAYBOOK: "ovr",
          CONVERGE_CURRENT_TASK_PATH:
            ".converge/journal/ovr/tasks/env-default",
        },
      );
      expect(result.status).toBe(0);

      const rows = readJsonl(
        join(workspace, ".converge", "inventory", "ovr", "tasks.jsonl"),
      );
      const row = rows.find((r: any) => r.id === "override-child") as any;
      // --parent takes precedence over CONVERGE_CURRENT_TASK_PATH. The path
      // is resolved to its last segment ("chosen") as the parent id.
      expect(row.parent).toBe("chosen");
    });
  });

  it("requires --task-file, --body, or at least one frontmatter flag", () => {
    const result = runSpawn(workspace, ["task", "--id", "x"], {
      CONVERGE_WORKSPACE: workspace,
      CONVERGE_PLAYBOOK: "p1",
    });
    expect(result.status).toBe(2);
    expect(result.stderr).toMatch(/--task-file/);
    expect(result.stderr).toMatch(/--body/);
    expect(result.stderr).toMatch(/frontmatter flag/);
  });

  describe("flag-assembled TASK.md (full task options)", () => {
    it("assembles frontmatter from --title/--description/--input/--output/--check/--var/--tag/--depends-on/--agent/--skill", () => {
      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "full-task",
          "--title",
          "Full Task",
          "--description",
          "Builds the data pipeline.",
          "--input",
          "idea.md",
          "--input",
          "schema.sql",
          "--output",
          "data/markets.db",
          "--output",
          "data/prices.db",
          "--depends-on",
          "bootstrap",
          "--depends-on",
          "scaffold",
          "--tag",
          "pipeline",
          "--tag",
          "sprint",
          "--check",
          "build|pnpm build",
          "--check",
          "db-rows|sqlite3 data/markets.db 'SELECT COUNT(*) FROM markets'",
          "--var",
          "epoch=001",
          "--var",
          "region=us-east",
          "--agent",
          "claude",
          "--skill",
          "data-pipeline",
          "--body",
          "## Steps\n\nFetch markets, persist to SQLite.",
        ],
        {
          CONVERGE_WORKSPACE: workspace,
          CONVERGE_PLAYBOOK: "full",
        },
      );
      expect(result.status, result.stderr).toBe(0);

      const taskMd = readFileSync(
        join(
          workspace,
          ".converge",
          "inventory",
          "full",
          "spawned",
          "full-task",
          "TASK.md",
        ),
        "utf-8",
      );
      // Frontmatter sanity — every field present.
      expect(taskMd).toMatch(/^---/);
      expect(taskMd).toMatch(/id: full-task/);
      expect(taskMd).toMatch(/title: Full Task/);
      expect(taskMd).toMatch(/description: ".*Builds the data pipeline\..*"|description: Builds the data pipeline\./);
      expect(taskMd).toMatch(/agent: claude/);
      expect(taskMd).toMatch(/skills:\n\s+- data-pipeline/);
      expect(taskMd).toMatch(/depends_on:\n\s+- bootstrap\n\s+- scaffold/);
      expect(taskMd).toMatch(/tags:\n\s+- pipeline\n\s+- sprint/);
      expect(taskMd).toMatch(/inputs:\n\s+- idea\.md\n\s+- schema\.sql/);
      expect(taskMd).toMatch(/outputs:\n\s+- data\/markets\.db/);
      expect(taskMd).toMatch(/checks:/);
      expect(taskMd).toMatch(/- id: build\n\s+cmd: "?pnpm build"?/);
      expect(taskMd).toMatch(/- id: db-rows/);
      expect(taskMd).toMatch(/vars:\n\s+epoch: "001"\n\s+region: us-east/);
      // Body comes after the closing `---`.
      expect(taskMd).toContain("\n## Steps");
      expect(taskMd).toContain("Fetch markets, persist to SQLite.");

      // Ledger row reflects the title as summary fallback.
      const rows = readJsonl(
        join(workspace, ".converge", "inventory", "full", "tasks.jsonl"),
      );
      const row = rows.find((r: any) => r.id === "full-task") as any;
      expect(row.summary).toBe("Full Task");
    });

    it("rejects --check missing the '|' separator", () => {
      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "bad-check",
          "--title",
          "x",
          "--check",
          "missing-pipe-here",
        ],
        { CONVERGE_WORKSPACE: workspace, CONVERGE_PLAYBOOK: "bad" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/--check.*<id>\|<cmd>/);
    });

    it("rejects --var missing the '=' separator", () => {
      const result = runSpawn(
        workspace,
        ["task", "--id", "bad-var", "--title", "x", "--var", "no-equals"],
        { CONVERGE_WORKSPACE: workspace, CONVERGE_PLAYBOOK: "bad" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/--var.*key=value/);
    });

    it("rejects --task-file when compose-mode frontmatter flags are also present", () => {
      const taskPath = join(workspace, ".converge", "tmp", "full.md");
      writeFileSync(
        taskPath,
        "---\nid: complete\n---\n# body\n",
        "utf-8",
      );
      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "double",
          "--title",
          "Outer",
          "--task-file",
          ".converge/tmp/full.md",
        ],
        { CONVERGE_WORKSPACE: workspace, CONVERGE_PLAYBOOK: "df" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/mutually exclusive/);
    });

    it("rejects --body and --task-file together", () => {
      const taskPath = join(workspace, ".converge", "tmp", "x.md");
      writeFileSync(taskPath, "---\nid: x\n---\nbody", "utf-8");
      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "both",
          "--body",
          "inline",
          "--task-file",
          ".converge/tmp/x.md",
        ],
        { CONVERGE_WORKSPACE: workspace, CONVERGE_PLAYBOOK: "both" },
      );
      expect(result.status).toBe(2);
      expect(result.stderr).toMatch(/mutually exclusive/);
    });

    it("allows a frontmatter-flag-only task with no body", () => {
      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "no-body",
          "--title",
          "Just an outputs gate",
          "--output",
          "result.json",
        ],
        { CONVERGE_WORKSPACE: workspace, CONVERGE_PLAYBOOK: "nb" },
      );
      expect(result.status, result.stderr).toBe(0);
      const taskMd = readFileSync(
        join(
          workspace,
          ".converge",
          "inventory",
          "nb",
          "spawned",
          "no-body",
          "TASK.md",
        ),
        "utf-8",
      );
      expect(taskMd).toMatch(/^---/);
      expect(taskMd).toMatch(/outputs:\n\s+- result\.json/);
      expect(taskMd).toMatch(/---\n\n?$/); // closes with no body content
    });

    it("--dry preview includes the assembled TASK.md content", () => {
      const result = runSpawn(
        workspace,
        [
          "task",
          "--id",
          "preview-full",
          "--title",
          "Preview",
          "--output",
          "out.txt",
          "--body",
          "do work",
          "--dry",
        ],
        { CONVERGE_WORKSPACE: workspace, CONVERGE_PLAYBOOK: "pf" },
      );
      expect(result.status, result.stderr).toBe(0);
      const jsonStart = result.stdout.indexOf("{");
      const parsed = JSON.parse(result.stdout.slice(jsonStart));
      expect(parsed.dry).toBe(true);
      expect(parsed.taskMdPreview).toMatch(/^---/);
      expect(parsed.taskMdPreview).toMatch(/title: Preview/);
      expect(parsed.taskMdPreview).toMatch(/outputs:\n\s+- out\.txt/);
      expect(parsed.taskMdPreview).toContain("do work");

      // Dry: nothing on disk.
      expect(
        existsSync(
          join(
            workspace,
            ".converge",
            "inventory",
            "pf",
            "spawned",
            "preview-full",
            "TASK.md",
          ),
        ),
      ).toBe(false);
    });
  });
});
