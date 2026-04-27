import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { findConvergeRoot } from "../src/index.js";

describe("findConvergeRoot", () => {
  let tmp: string;

  beforeEach(() => {
    // realpathSync resolves /var → /private/var on macOS so comparisons against
    // findConvergeRoot's output (which uses path.resolve, also canonicalizing) match.
    tmp = realpathSync(mkdtempSync(join(tmpdir(), "converge-root-")));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("returns the directory itself when it contains .converge/", () => {
    mkdirSync(join(tmp, ".converge"));
    expect(findConvergeRoot(tmp)).toBe(tmp);
  });

  it("walks up one level to find .converge/", () => {
    mkdirSync(join(tmp, ".converge"));
    const child = join(tmp, "child");
    mkdirSync(child);
    expect(findConvergeRoot(child)).toBe(tmp);
  });

  it("walks up multiple levels", () => {
    mkdirSync(join(tmp, ".converge"));
    const deep = join(tmp, "a", "b", "c");
    mkdirSync(deep, { recursive: true });
    expect(findConvergeRoot(deep)).toBe(tmp);
  });

  it("returns null when no ancestor has .converge/", () => {
    const child = join(tmp, "no-converge-anywhere");
    mkdirSync(child);
    expect(findConvergeRoot(child)).toBe(null);
  });

  it("returns the innermost .converge/ when nested", () => {
    mkdirSync(join(tmp, ".converge"));
    const inner = join(tmp, "examples", "demo");
    mkdirSync(inner, { recursive: true });
    mkdirSync(join(inner, ".converge"));
    const startedFrom = join(inner, "tasks", "01-recon");
    mkdirSync(startedFrom, { recursive: true });
    expect(findConvergeRoot(startedFrom)).toBe(inner);
  });

  it("does NOT consider .claude/ as a project marker", () => {
    mkdirSync(join(tmp, ".claude"));
    const child = join(tmp, "child");
    mkdirSync(child);
    expect(findConvergeRoot(child)).toBe(null);
  });

  it("does NOT consider pnpm-workspace.yaml or package.json as a project marker", () => {
    // simulate a monorepo root with no .converge/
    const { writeFileSync } = require("node:fs");
    writeFileSync(join(tmp, "pnpm-workspace.yaml"), "packages:\n  - 'p/*'\n");
    writeFileSync(join(tmp, "package.json"), "{}");
    const child = join(tmp, "p", "leaf");
    mkdirSync(child, { recursive: true });
    expect(findConvergeRoot(child)).toBe(null);
  });

  it("resolves relative paths", () => {
    mkdirSync(join(tmp, ".converge"));
    const child = join(tmp, "child");
    mkdirSync(child);
    process.chdir(child);
    expect(findConvergeRoot(".")).toBe(tmp);
  });

  it("follows the resolved path when startDir is a symlink", () => {
    mkdirSync(join(tmp, ".converge"));
    const child = join(tmp, "child");
    mkdirSync(child);
    const link = join(tmp, "link-to-child");
    symlinkSync(child, link);
    expect(findConvergeRoot(link)).toBe(tmp);
  });
});
