import { describe, it, expect } from "vitest";
import { buildFilesystemRepairPrompt } from "../packages/core/src/navigator/repair/context-writer.ts";
import type { ContextWriterResult } from "../packages/core/src/navigator/repair/context-writer.ts";

function makeResult(): ContextWriterResult {
  return {
    contextDir: "/fake/project/.converge/journal/epic/task/attempts/wip/context",
    relContextDir: ".converge/journal/epic/task/attempts/wip/context",
    writtenFiles: ["gaps-summary.md", "checks-results.md"],
  };
}

const taskMdPath = ".converge/journal/epic/task/attempts/wip/TASK.md";
const checkMdPath = ".converge/journal/epic/task/attempts/wip/CHECK.md";

describe("context-writer boundary accuracy", () => {
  const prompt = buildFilesystemRepairPrompt(makeResult(), taskMdPath, checkMdPath);

  it("does not claim journal files are never read at compile time", () => {
    // The old text claimed "Journal files are READ-ONLY" which implies
    // the framework itself never reads them — but it does.
    // The text must not make false absolute claims about read-only status.
    const hasFalseAbsolute = /\bREAD-ONLY\b/.test(prompt);
    expect(hasFalseAbsolute).toBe(false);
  });

  it("still instructs users not to edit journal files", () => {
    // Users must still be told not to hand-edit journal files.
    // The boundary instruction — "don't edit these" — must survive.
    const tellsUsersNotToEdit =
      /do not edit/i.test(prompt) || /not edit/i.test(prompt);
    expect(tellsUsersNotToEdit).toBe(true);
  });

  it("acknowledges journal files are runtime artifacts managed by the framework", () => {
    // Instead of "READ-ONLY", the text should characterize journal files
    // as runtime artifacts the framework manages (and may read itself).
    const acknowledgesFrameworkManages =
      /framework/i.test(prompt) && /journal/i.test(prompt);
    expect(acknowledgesFrameworkManages).toBe(true);
  });
});
