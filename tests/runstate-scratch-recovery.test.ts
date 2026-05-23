import { describe, expect, it, afterEach } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  captureReporter,
  loadPlaybookFromFolder,
  run,
} from "../packages/core/src/index";

describe("runstate scratch recovery", () => {
  const cleanupDirs: string[] = [];

  afterEach(() => {
    while (cleanupDirs.length > 0) {
      const dir = cleanupDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  it("recreates runstate.json after the journal is deleted", async () => {
    const projectDir = mkdtempSync(join(tmpdir(), "converge-scratch-recovery-"));
    cleanupDirs.push(projectDir);
    const playbookDir = join(projectDir, ".converge", "playbooks", "scratch-recovery");

    mkdirSync(join(playbookDir, "tasks", "write-output"), { recursive: true });
    writeFileSync(join(projectDir, ".converge", "project.yaml"), "name: scratch-recovery\n", "utf8");
    writeFileSync(
      join(playbookDir, "playbook.yml"),
      `name: scratch-recovery\nrun:\n  workers: 1\n  maxTaskAttempts: 1\n`,
      "utf8",
    );
    writeFileSync(
      join(playbookDir, "tasks", "write-output", "TASK.md"),
      `---\nid: write-output\noutputs:\n  - out.txt\n---\n\n# Write output\n`,
      "utf8",
    );

    const loaded = await loadPlaybookFromFolder(playbookDir);

    const first = await run(loaded, {
      projectDir,
      workers: 1,
      dry: true,
      reporter: captureReporter(),
    });
    expect(first.failed).toBe(0);

    const runstatePath = join(projectDir, ".converge", "journal", "scratch-recovery", "runstate.json");
    expect(existsSync(runstatePath)).toBe(true);

    rmSync(join(projectDir, ".converge", "journal"), { recursive: true, force: true });

    const second = await run(loaded, {
      projectDir,
      workers: 1,
      dry: true,
      reporter: captureReporter(),
    });
    expect(second.failed).toBe(0);
    expect(existsSync(runstatePath)).toBe(true);

    const runstate = JSON.parse(readFileSync(runstatePath, "utf-8"));
    expect(runstate.dag.nodes["write-output"]).toBeDefined();
  });
});
