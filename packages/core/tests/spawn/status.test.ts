/**
 * RFC 0024 — STATUS.md tests.
 *
 * `writeStatusMarkdown(spawnRoot, summary)` renders one markdown file
 * with one `- [x]` / `- [ ]` row per invocation. Failures carry a `fix:`
 * block keyed off the structured evidence so the AI's repair loop can
 * apply the patch verbatim.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeStatusMarkdown } from "../../src/task/spawn/status.ts";

describe("writeStatusMarkdown", () => {
  let spawnRoot: string;
  beforeEach(() => {
    spawnRoot = mkdtempSync(join(tmpdir(), "converge-status-"));
  });
  afterEach(() => {
    rmSync(spawnRoot, { recursive: true, force: true });
  });

  function read(): string {
    return readFileSync(join(spawnRoot, "STATUS.md"), "utf-8");
  }

  it("writes a STATUS.md at the spawn root", () => {
    writeStatusMarkdown(spawnRoot, {
      phase: "preview",
      ok: true,
      okRows: [],
      evidence: [],
    });
    expect(read()).toContain("# spawn —");
  });

  it("renders ok rows as `- [x]` lines with template name", () => {
    writeStatusMarkdown(spawnRoot, {
      phase: "preview",
      ok: true,
      okRows: [
        { id: "hero-spec", template: "asset-spec" },
        { id: "hero-generate", template: "asset-generate" },
      ],
      evidence: [],
    });
    const md = read();
    expect(md).toContain("- [x] hero-spec");
    expect(md).toContain("- [x] hero-generate");
    expect(md).toContain("asset-spec");
    expect(md).toContain("asset-generate");
    expect(md).not.toContain("- [ ]");
  });

  it("renders error rows as `- [ ]` with code, file path, and fix block", () => {
    writeStatusMarkdown(spawnRoot, {
      phase: "preview",
      ok: false,
      okRows: [],
      evidence: [
        {
          id: "hero-wire",
          file: "hero-wire/spawn.yml",
          errorCode: "missing-required-param",
          message: "template 'asset-wire' requires param `outputPath`",
          expectedParams: ["outputPath"],
          fix: "add under `params:`\n  outputPath: <value>",
        },
      ],
    });
    const md = read();
    expect(md).toContain("- [ ] hero-wire");
    expect(md).toContain("missing-required-param");
    expect(md).toContain("hero-wire/spawn.yml");
    expect(md).toContain("fix:");
    expect(md).toContain("outputPath:");
  });

  it("renders a did-you-mean hint for template-not-found", () => {
    writeStatusMarkdown(spawnRoot, {
      phase: "preview",
      ok: false,
      okRows: [],
      evidence: [
        {
          id: "villain-generate",
          file: "villain-generate/spawn.yml",
          errorCode: "template-not-found",
          message: "template 'asset-genrate' is not defined",
          hint: "did you mean: `asset-generate`?",
          fix: "change `template: asset-genrate` → `template: asset-generate`",
        },
      ],
    });
    const md = read();
    expect(md).toContain("did you mean: `asset-generate`?");
    expect(md).toContain("change `template:");
  });

  it("header reports phase and counts", () => {
    writeStatusMarkdown(spawnRoot, {
      phase: "preview",
      ok: false,
      okRows: [{ id: "a", template: "t" }, { id: "b", template: "t" }],
      evidence: [
        {
          id: "c",
          file: "c/spawn.yml",
          errorCode: "template-not-found",
          message: "x",
        },
      ],
    });
    const md = read();
    expect(md).toMatch(/preview FAILED \(1 of 3\)/);
  });

  it("header reports apply succeeded when ok", () => {
    writeStatusMarkdown(spawnRoot, {
      phase: "apply",
      ok: true,
      okRows: [{ id: "a", template: "t" }],
      evidence: [],
    });
    const md = read();
    expect(md).toContain("apply ok");
  });
});
