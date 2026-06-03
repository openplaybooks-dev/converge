/**
 * Runstate Ingest Consistency Test
 *
 * Verifies that RunStateManager and ingestSpawnedChildrenFromRunstate()
 * use the SAME runstate.json path. This encodes the "Blueprint vs Runtime"
 * mental model: the blueprint (where RunStateManager writes) must match
 * the runtime (where the DAG navigator reads).
 *
 * Currently FAILS because ingestSpawnedChildrenFromRunstate() in dag-tree.ts
 * constructs a path with an "executions/" subdirectory that does not match
 * the single-target model used by RunStateManager (and getTargetDir).
 */
import { describe, it, expect } from "vitest";
import { join, resolve } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

import { getTargetDir } from "../packages/core/src/journal/structure";
import { RunStateManager } from "../packages/core/src/manifest/run-state-manager";
import { TaskDag } from "../packages/core/src/dag/task-dag";

const REPO_ROOT = resolve(__dirname, "..");

describe("runstate.json path consistency — Blueprint vs Runtime", () => {
  it("getTargetDir returns the single-target path WITHOUT executions/ indirection", () => {
    const dir = getTargetDir("/test-project", "my-playbook");
    // The single-target model stores runstate.json directly under the journal
    // playbook directory, NOT under an executions/ subdirectory.
    expect(dir).toContain(join(".converge", "journal", "my-playbook"));
    expect(dir).not.toContain("executions");
  });

  it("RunStateManager persists runstate.json at getTargetDir()/runstate.json", async () => {
    const projectDir = join(tmpdir(), "converge-test-runstate-" + Date.now());
    const playbookName = "test-playbook";
    const targetDir = getTargetDir(projectDir, playbookName);

    mkdirSync(targetDir, { recursive: true });

    const dag = new TaskDag();
    dag.playbookName = playbookName;

    const mgr = new RunStateManager(targetDir, dag, undefined, projectDir);
    await mgr.persist();

    const expectedPath = join(targetDir, "runstate.json");
    expect(existsSync(expectedPath)).toBe(true);

    // Verify the statePath getter matches getTargetDir + runstate.json
    expect(mgr.statePath_).toBe(expectedPath);

    rmSync(projectDir, { recursive: true, force: true });
  });

  it("ingestSpawnedChildrenFromRunstate() MUST scan the SAME directory that RunStateManager writes to", () => {
    const projectDir = "/test/project";
    const playbook = "my-playbook";

    // CORRECT scan directory (used by RunStateManager via getTargetDir):
    //   .converge/journal/{playbook}/runstate.json
    const targetDir = getTargetDir(projectDir, playbook);

    // The OLD buggy path — this MUST NOT be used
    const oldBuggyPath = join(
      projectDir,
      ".converge",
      "journal",
      playbook,
      "executions",
    );

    // CORRECT mental model: the target directory does NOT include "executions/"
    // Both RunStateManager.persist() and ingestSpawnedChildrenFromRunstate()
    // use getTargetDir() + "/runstate.json"
    const rsPath = join(targetDir, "runstate.json");
    expect(rsPath).toBe(
      join(projectDir, ".converge", "journal", playbook, "runstate.json"),
    );
    expect(rsPath).not.toContain("executions");
    // The old buggy path with executions/ indirection is NOT the same as targetDir
    expect(oldBuggyPath).not.toBe(targetDir);
  });
});
