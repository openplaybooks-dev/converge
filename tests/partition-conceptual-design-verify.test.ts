/**
 * Verify RFC 0046 partition integration with the conceptual-design example.
 */
import { describe, it, expect, afterEach } from "vitest";
import { join } from "node:path";
import { mkdirSync, existsSync, rmSync } from "node:fs";

import {
  getInventoryDir,
  setPlaybookScope,
  setPartitionScope,
  clearPartitionScope,
  clearPlaybookScope,
} from "../packages/core/src/journal/structure";
import { resolvePartitionKey } from "../packages/core/src/run/partition";
import { parsePlaybookYml } from "../packages/core/src/task/playbook/loader";

const PROJECT_DIR = join(__dirname, "..", "examples", "conceptual-design");
const PLAYBOOK_DIR = join(PROJECT_DIR, ".converge", "playbooks", "concept-living-playbook");

describe("Partition integration: conceptual-design example", () => {
  const savedEnv: Record<string, string | undefined> = {};

  afterEach(() => {
    clearPartitionScope();
    clearPlaybookScope();
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("playbook.yml has partitionBy: param: design_system", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);
    expect(def.partitionBy).toEqual({ param: "design_system" });
  });

  it("resolves partition key from design_system=notion", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);
    const key = resolvePartitionKey(def.partitionBy, { design_system: "notion" });
    expect(key).toBe("notion");
  });

  it("resolves partition key from design_system=stripe", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);
    const key = resolvePartitionKey(def.partitionBy, { design_system: "stripe" });
    expect(key).toBe("stripe");
  });

  it("inventory routes to concepts partition directory for notion", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);
    const key = resolvePartitionKey(def.partitionBy, { design_system: "notion" });

    setPlaybookScope(def.name, PROJECT_DIR);
    setPartitionScope(key!, PROJECT_DIR, def.name);

    const invDir = getInventoryDir(PROJECT_DIR);
    expect(invDir).toBe(
      join(PROJECT_DIR, ".converge", "inventory", "concept-living-playbook", "partitions", "notion"),
    );
    expect(process.env.CONVERGE_PARTITION_KEY).toBe("notion");
  });

  it("different design systems get different inventory directories", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);

    // Notion
    setPlaybookScope(def.name, PROJECT_DIR);
    setPartitionScope("notion", PROJECT_DIR, def.name);
    const notionDir = getInventoryDir(PROJECT_DIR);
    clearPartitionScope();

    // Stripe
    setPartitionScope("stripe", PROJECT_DIR, def.name);
    const stripeDir = getInventoryDir(PROJECT_DIR);
    clearPartitionScope();

    expect(notionDir).not.toBe(stripeDir);
    expect(notionDir).toContain(join("partitions", "notion"));
    expect(stripeDir).toContain(join("partitions", "stripe"));
  });

  it("CONVERGE_PARTITION_KEY is available for task check commands", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);
    setPlaybookScope(def.name, PROJECT_DIR);
    setPartitionScope("notion", PROJECT_DIR, def.name);

    expect(process.env.CONVERGE_PARTITION_KEY).toBe("notion");

    // Simulate what a check command would resolve to
    const checkPath = `concepts/${process.env.CONVERGE_PARTITION_KEY}/concept.html`;
    expect(checkPath).toBe("concepts/notion/concept.html");
  });

  it("no .workspace references remain in task definitions", async () => {
    const { readFileSync } = await import("node:fs");
    const taskFiles = [
      "tasks/01-setup/TASK.md",
      "tasks/02-design-spec/TASK.md",
      "tasks/03-build-html/TASK.md",
      "tasks/04-enhance/TASK.md",
      "tasks/05-finalize/TASK.md",
    ];

    for (const taskFile of taskFiles) {
      const content = readFileSync(join(PLAYBOOK_DIR, taskFile), "utf-8");
      expect(content).not.toContain(".workspace/");
      expect(content).not.toContain("chosen-design-system.txt");
      expect(content).toContain("CONVERGE_PARTITION_KEY");
    }
  });

  it("partition inventory directory can be created on disk", async () => {
    const def = await parsePlaybookYml(PLAYBOOK_DIR);
    setPlaybookScope(def.name, PROJECT_DIR);
    setPartitionScope("test-verify", PROJECT_DIR, def.name);

    const invDir = getInventoryDir(PROJECT_DIR);
    mkdirSync(invDir, { recursive: true });
    expect(existsSync(invDir)).toBe(true);

    // Cleanup
    rmSync(join(PROJECT_DIR, ".converge", "inventory"), { recursive: true, force: true });
  });
});
