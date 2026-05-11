import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import {
  clearPlaybookScope,
  getJournalRoot,
  getTargetDir,
  setPlaybookScope,
} from "../../src/journal/structure.ts";

describe("playbook scope environment", () => {
  const saved = {
    playbook: process.env.CONVERGE_PLAYBOOK,
    playbookDir: process.env.CONVERGE_PLAYBOOK_DIR,
    journalRoot: process.env.CONVERGE_JOURNAL_ROOT,
    targetDir: process.env.CONVERGE_TARGET_DIR,
  };

  beforeEach(() => {
    delete process.env.CONVERGE_PLAYBOOK;
    delete process.env.CONVERGE_PLAYBOOK_DIR;
    delete process.env.CONVERGE_JOURNAL_ROOT;
    delete process.env.CONVERGE_TARGET_DIR;
  });

  afterEach(() => {
    clearPlaybookScope();
    if (saved.playbook !== undefined) {
      process.env.CONVERGE_PLAYBOOK = saved.playbook;
    }
    if (saved.playbookDir !== undefined) {
      process.env.CONVERGE_PLAYBOOK_DIR = saved.playbookDir;
    }
    if (saved.journalRoot !== undefined) {
      process.env.CONVERGE_JOURNAL_ROOT = saved.journalRoot;
    }
    if (saved.targetDir !== undefined) {
      process.env.CONVERGE_TARGET_DIR = saved.targetDir;
    }
  });

  it("does not export absolute target overrides that leak into nested runs", () => {
    const parentProject = "/tmp/converge-parent";
    const childProject = "/tmp/converge-child";

    setPlaybookScope("self-improvement-loop", parentProject);

    expect(process.env.CONVERGE_PLAYBOOK).toBe("self-improvement-loop");
    expect(process.env.CONVERGE_PLAYBOOK_DIR).toBe(
      join(parentProject, ".converge", "playbooks", "self-improvement-loop"),
    );
    expect(process.env.CONVERGE_TARGET_DIR).toBeUndefined();
    expect(process.env.CONVERGE_JOURNAL_ROOT).toBeUndefined();
    expect(getTargetDir(childProject, "default")).toBe(
      join(childProject, ".converge", "journal", "default"),
    );
    expect(getJournalRoot(parentProject)).toBe(
      join(parentProject, ".converge", "journal", "self-improvement-loop"),
    );
  });
});
