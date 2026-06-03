/**
 * RFC 0046: Inventory Partitioning via `partitionBy`
 *
 * TDD: Red tests first, then implement to make them green.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";

/* ------------------------------------------------------------------ */
/*  Module imports (will fail until implementation exists)              */
/* ------------------------------------------------------------------ */

import {
  getInventoryDir,
  setPlaybookScope,
  clearPlaybookScope,
  setPartitionScope,
  clearPartitionScope,
} from "../packages/core/src/journal/structure";

import { resolvePartitionKey } from "../packages/core/src/run/partition";

import { buildTaskEnv } from "../packages/core/src/run/task-env";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeTmpDir(): string {
  const dir = join(tmpdir(), `converge-test-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/* ------------------------------------------------------------------ */
/*  Unit: resolvePartitionKey                                          */
/* ------------------------------------------------------------------ */

describe("RFC 0046: resolvePartitionKey", () => {
  it("resolves partition key from cmd (trimmed stdout)", () => {
    const key = resolvePartitionKey({ cmd: 'echo "2026-05-26"' }, {});
    expect(key).toBe("2026-05-26");
  });

  it("resolves partition key from param lookup", () => {
    const key = resolvePartitionKey(
      { param: "design_system" },
      { design_system: "stripe" },
    );
    expect(key).toBe("stripe");
  });

  it("CLI override takes precedence over cmd", () => {
    const key = resolvePartitionKey({ cmd: "echo auto-key" }, {}, "manual-key");
    expect(key).toBe("manual-key");
  });

  it("CLI override takes precedence over param", () => {
    const key = resolvePartitionKey(
      { param: "design_system" },
      { design_system: "stripe" },
      "override-key",
    );
    expect(key).toBe("override-key");
  });

  it("rejects key with unsafe characters (slash)", () => {
    expect(() => resolvePartitionKey({ cmd: "echo ../escape" }, {})).toThrow();
  });

  it("rejects key with unsafe characters (space)", () => {
    expect(() =>
      resolvePartitionKey({ cmd: "echo 'hello world'" }, {}),
    ).toThrow();
  });

  it("rejects empty key from cmd", () => {
    expect(() => resolvePartitionKey({ cmd: "echo ''" }, {})).toThrow();
  });

  it("rejects missing param variable", () => {
    expect(() => resolvePartitionKey({ param: "missing_var" }, {})).toThrow();
  });

  it("accepts key with dots, dashes, underscores", () => {
    const key = resolvePartitionKey({ cmd: "echo v1.2.3_beta-rc1" }, {});
    expect(key).toBe("v1.2.3_beta-rc1");
  });

  it("returns null when partitionBy is undefined", () => {
    const key = resolvePartitionKey(undefined, {});
    expect(key).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/*  Unit: setPartitionScope / clearPartitionScope                      */
/* ------------------------------------------------------------------ */

describe("RFC 0046: setPartitionScope + getInventoryDir", () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    savedEnv.CONVERGE_PLAYBOOK = process.env.CONVERGE_PLAYBOOK;
    savedEnv.CONVERGE_INVENTORY_DIR = process.env.CONVERGE_INVENTORY_DIR;
    savedEnv.CONVERGE_PARTITION_KEY = process.env.CONVERGE_PARTITION_KEY;
    savedEnv.CONVERGE_PLAYBOOK_DIR = process.env.CONVERGE_PLAYBOOK_DIR;
    savedEnv.CONVERGE_WORKSPACE = process.env.CONVERGE_WORKSPACE;
  });

  afterEach(() => {
    clearPartitionScope();
    clearPlaybookScope();
    // restore
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("routes getInventoryDir to partitioned path", () => {
    const projectDir = "/tmp/proj";
    setPlaybookScope("default", projectDir);
    setPartitionScope("2026-05-26", projectDir, "default");

    const dir = getInventoryDir(projectDir);
    expect(dir).toBe(
      join(
        projectDir,
        ".converge",
        "inventory",
        "default",
        "partitions",
        "2026-05-26",
      ),
    );
  });

  it("sets CONVERGE_PARTITION_KEY in process.env", () => {
    setPartitionScope("my-key", "/tmp/proj", "default");
    expect(process.env.CONVERGE_PARTITION_KEY).toBe("my-key");
  });

  it("clearPartitionScope removes CONVERGE_PARTITION_KEY and CONVERGE_INVENTORY_DIR", () => {
    setPartitionScope("my-key", "/tmp/proj", "default");
    expect(process.env.CONVERGE_PARTITION_KEY).toBe("my-key");
    expect(process.env.CONVERGE_INVENTORY_DIR).toBeDefined();

    clearPartitionScope();
    expect(process.env.CONVERGE_PARTITION_KEY).toBeUndefined();
    expect(process.env.CONVERGE_INVENTORY_DIR).toBeUndefined();
  });

  it("no partition = current behavior (unpartitioned path)", () => {
    const projectDir = "/tmp/proj";
    setPlaybookScope("default", projectDir);
    // No setPartitionScope call

    const dir = getInventoryDir(projectDir);
    expect(dir).toBe(join(projectDir, ".converge", "inventory", "default"));
  });
});

/* ------------------------------------------------------------------ */
/*  Unit: CONVERGE_PARTITION_KEY visible in task env                    */
/* ------------------------------------------------------------------ */

describe("RFC 0046: CONVERGE_PARTITION_KEY in task env", () => {
  afterEach(() => {
    delete process.env.CONVERGE_PARTITION_KEY;
  });

  it("propagates CONVERGE_PARTITION_KEY from base env to task env", () => {
    const baseEnv = { ...process.env, CONVERGE_PARTITION_KEY: "2026-05-26" };
    const taskEnv = buildTaskEnv(baseEnv, {});
    expect(taskEnv.CONVERGE_PARTITION_KEY).toBe("2026-05-26");
  });

  it("does not inject CONVERGE_PARTITION_KEY when not in base env", () => {
    const baseEnv = { ...process.env };
    delete baseEnv.CONVERGE_PARTITION_KEY;
    const taskEnv = buildTaskEnv(baseEnv, {});
    expect(taskEnv.CONVERGE_PARTITION_KEY).toBeUndefined();
  });
});

/* ------------------------------------------------------------------ */
/*  Unit: PlaybookDef.partitionBy type + parsing                       */
/* ------------------------------------------------------------------ */

describe("RFC 0046: partitionBy in PlaybookDef", () => {
  it("parsePlaybookYml reads partitionBy.cmd from YAML", async () => {
    const { parsePlaybookYml } =
      await import("../packages/core/src/task/playbook/loader");
    const dir = makeTmpDir();
    const tasksDir = join(dir, "tasks", "hello");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "TASK.md"),
      "---\nid: hello\ntitle: Hello\n---\nHello\n",
    );
    writeFileSync(
      join(dir, "playbook.yml"),
      [
        "name: test-partition",
        "partitionBy:",
        '  cmd: "date +%Y-%m-%d"',
        "tasks:",
        "  - path: hello",
      ].join("\n"),
    );

    const def = await parsePlaybookYml(dir);
    expect(def.partitionBy).toEqual({ cmd: "date +%Y-%m-%d" });

    rmSync(dir, { recursive: true, force: true });
  });

  it("parsePlaybookYml reads partitionBy.param from YAML", async () => {
    const { parsePlaybookYml } =
      await import("../packages/core/src/task/playbook/loader");
    const dir = makeTmpDir();
    const tasksDir = join(dir, "tasks", "hello");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "TASK.md"),
      "---\nid: hello\ntitle: Hello\n---\nHello\n",
    );
    writeFileSync(
      join(dir, "playbook.yml"),
      [
        "name: test-partition",
        "partitionBy:",
        "  param: design_system",
        "inputs:",
        "  design_system:",
        "    default: random",
        "tasks:",
        "  - path: hello",
      ].join("\n"),
    );

    const def = await parsePlaybookYml(dir);
    expect(def.partitionBy).toEqual({ param: "design_system" });

    rmSync(dir, { recursive: true, force: true });
  });

  it("parsePlaybookYml returns no partitionBy when not configured", async () => {
    const { parsePlaybookYml } =
      await import("../packages/core/src/task/playbook/loader");
    const dir = makeTmpDir();
    const tasksDir = join(dir, "tasks", "hello");
    mkdirSync(tasksDir, { recursive: true });
    writeFileSync(
      join(tasksDir, "TASK.md"),
      "---\nid: hello\ntitle: Hello\n---\nHello\n",
    );
    writeFileSync(
      join(dir, "playbook.yml"),
      ["name: test-no-partition", "tasks:", "  - path: hello"].join("\n"),
    );

    const def = await parsePlaybookYml(dir);
    expect(def.partitionBy).toBeUndefined();

    rmSync(dir, { recursive: true, force: true });
  });
});

/* ------------------------------------------------------------------ */
/*  Unit: buildPlaybookYaml serialization roundtrip                    */
/* ------------------------------------------------------------------ */

describe("RFC 0046: partitionBy serialization roundtrip", () => {
  it("writePlaybookToFolder preserves partitionBy.cmd", async () => {
    const { definePlaybook, writePlaybookToFolder, loadPlaybookFromFolder } =
      await import("../packages/core/src/playbook");
    const { taskDef } = await import("../packages/core/src/playbook");

    const pb = definePlaybook({
      name: "roundtrip-test",
      tasks: [
        taskDef()
          .id("task-a")
          .title("Task A")
          .executor(async () => {})
          .build(),
      ],
    });
    // Manually set partitionBy since definePlaybook doesn't support it yet
    pb.def.partitionBy = { cmd: "date +%Y-%m-%d" };

    const dir = makeTmpDir();
    await writePlaybookToFolder(pb, dir);

    const loaded = await loadPlaybookFromFolder(dir);
    expect(loaded.def.partitionBy).toEqual({ cmd: "date +%Y-%m-%d" });

    rmSync(dir, { recursive: true, force: true });
  });

  it("writePlaybookToFolder preserves partitionBy.param", async () => {
    const { definePlaybook, writePlaybookToFolder, loadPlaybookFromFolder } =
      await import("../packages/core/src/playbook");
    const { taskDef } = await import("../packages/core/src/playbook");

    const pb = definePlaybook({
      name: "roundtrip-param",
      inputs: { env: { default: "staging" } },
      tasks: [
        taskDef()
          .id("task-b")
          .title("Task B")
          .executor(async () => {})
          .build(),
      ],
    });
    pb.def.partitionBy = { param: "env" };

    const dir = makeTmpDir();
    await writePlaybookToFolder(pb, dir);

    const loaded = await loadPlaybookFromFolder(dir);
    expect(loaded.def.partitionBy).toEqual({ param: "env" });

    rmSync(dir, { recursive: true, force: true });
  });
});

/* ------------------------------------------------------------------ */
/*  Integration: full partition flow with real directories              */
/* ------------------------------------------------------------------ */

describe("RFC 0046: Integration — partitioned inventory directories", () => {
  let projectDir: string;
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    projectDir = makeTmpDir();
    savedEnv.CONVERGE_PLAYBOOK = process.env.CONVERGE_PLAYBOOK;
    savedEnv.CONVERGE_INVENTORY_DIR = process.env.CONVERGE_INVENTORY_DIR;
    savedEnv.CONVERGE_PARTITION_KEY = process.env.CONVERGE_PARTITION_KEY;
    savedEnv.CONVERGE_PLAYBOOK_DIR = process.env.CONVERGE_PLAYBOOK_DIR;
    savedEnv.CONVERGE_WORKSPACE = process.env.CONVERGE_WORKSPACE;
  });

  afterEach(() => {
    clearPartitionScope();
    clearPlaybookScope();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    rmSync(projectDir, { recursive: true, force: true });
  });

  it("creates partition directory and writes tasks.jsonl independently per partition", () => {
    setPlaybookScope("default", projectDir);

    // Partition A
    setPartitionScope("2026-05-25", projectDir, "default");
    const dirA = getInventoryDir(projectDir);
    mkdirSync(dirA, { recursive: true });
    writeFileSync(
      join(dirA, "tasks.jsonl"),
      '{"id":"task-a","status":"done"}\n',
    );
    clearPartitionScope();

    // Partition B
    setPartitionScope("2026-05-26", projectDir, "default");
    const dirB = getInventoryDir(projectDir);
    mkdirSync(dirB, { recursive: true });
    writeFileSync(
      join(dirB, "tasks.jsonl"),
      '{"id":"task-a","status":"todo"}\n',
    );
    clearPartitionScope();

    // Verify independence
    expect(dirA).not.toBe(dirB);
    expect(existsSync(join(dirA, "tasks.jsonl"))).toBe(true);
    expect(existsSync(join(dirB, "tasks.jsonl"))).toBe(true);

    const contentA = readFileSync(join(dirA, "tasks.jsonl"), "utf-8");
    const contentB = readFileSync(join(dirB, "tasks.jsonl"), "utf-8");
    expect(JSON.parse(contentA.trim()).status).toBe("done");
    expect(JSON.parse(contentB.trim()).status).toBe("todo");
  });

  it("unpartitioned playbook still uses the flat inventory path", () => {
    setPlaybookScope("default", projectDir);
    // No setPartitionScope — should use flat path
    const dir = getInventoryDir(projectDir);
    expect(dir).toBe(join(projectDir, ".converge", "inventory", "default"));
    expect(dir).not.toContain("partitions");
  });

  it("end-to-end: resolve partition key, set scope, verify inventory path", () => {
    const playbookName = "daily-pipeline";
    setPlaybookScope(playbookName, projectDir);

    const key = resolvePartitionKey({ cmd: "echo test-day" }, {});
    expect(key).toBe("test-day");

    setPartitionScope(key!, projectDir, playbookName);

    expect(process.env.CONVERGE_PARTITION_KEY).toBe("test-day");

    const inventoryDir = getInventoryDir(projectDir);
    expect(inventoryDir).toBe(
      join(
        projectDir,
        ".converge",
        "inventory",
        playbookName,
        "partitions",
        "test-day",
      ),
    );

    // Verify CONVERGE_PARTITION_KEY is available in task env
    const taskEnv = buildTaskEnv(process.env, {});
    expect(taskEnv.CONVERGE_PARTITION_KEY).toBe("test-day");
  });

  it("compilePlaybook uses getInventoryDir (not hardcoded path)", async () => {
    // Set up a minimal project structure with a partition
    const playbookName = "compile-test";
    const playbookDir = join(
      projectDir,
      ".converge",
      "playbooks",
      playbookName,
    );
    mkdirSync(join(playbookDir, "tasks", "hello"), { recursive: true });
    writeFileSync(join(playbookDir, "playbook.yml"), "name: compile-test\n");
    writeFileSync(
      join(playbookDir, "tasks", "hello", "TASK.md"),
      "---\nid: hello\ntitle: Hello\n---\nHello task body\n",
    );

    setPlaybookScope(playbookName, projectDir);
    setPartitionScope("p1", projectDir, playbookName);

    // Create inventory in the partitioned path
    const invDir = getInventoryDir(projectDir);
    mkdirSync(invDir, { recursive: true });
    writeFileSync(
      join(invDir, "tasks.jsonl"),
      '{"kind":"task","id":"hello","taskPath":"tasks/hello/TASK.md","title":"Hello","status":"done","source":"static","playbook":"compile-test","outputs":[],"checks":[],"fingerprint":"sha256:abc"}\n',
    );

    // The target dir for journal
    const targetDir = join(projectDir, ".converge", "journal", playbookName);
    mkdirSync(targetDir, { recursive: true });

    // Import compilePlaybook
    const { compilePlaybook } =
      await import("../packages/core/src/run/playbook-compile");
    const { definePlaybook, taskDef } =
      await import("../packages/core/src/playbook");

    const pb = definePlaybook({
      name: playbookName,
      tasks: [],
    });

    // This should NOT throw and should use the partitioned inventory path
    const { dag } = await compilePlaybook(
      pb,
      playbookDir,
      playbookName,
      targetDir,
      projectDir,
    );
    // The dag should have loaded from the partitioned inventory
    expect(dag).toBeDefined();
  });
});
