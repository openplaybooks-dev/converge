import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO = resolve(__dirname, "../../../..");

const PAGES = [
  "build",
  "test",
  "compile",
  "list",
  "clean",
  "debug",
  "deps",
  "retry",
  "source",
  "select",
];

describe("v2 CLI reference pages", () => {
  it.each(PAGES)("%s.md exists and is non-trivial", (name) => {
    const p = join(REPO, "docs/reference/cli", `${name}.md`);
    expect(existsSync(p), `${name}.md should exist at ${p}`).toBe(true);
    if (existsSync(p)) {
      expect(
        statSync(p).size,
        `${name}.md should be >200 bytes`,
      ).toBeGreaterThan(200);
    }
  });
});

describe("design doc status banner", () => {
  it("has moved to shipped or shipping", () => {
    const designDocPath = join(REPO, "docs/design/cli-redesign.md");
    const content = readFileSync(designDocPath, "utf-8");
    const hasShipped = /\bshipped\b/i.test(content);
    const hasShipping = /\bshipping\b/i.test(content);
    expect(
      hasShipped || hasShipping,
      "Design doc status banner should say 'shipped' or 'shipping'",
    ).toBe(true);
  });
});
