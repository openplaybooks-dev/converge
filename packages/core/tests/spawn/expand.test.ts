/**
 * RFC 0024 — Expansion tests.
 *
 * `expandInvocation(inv, templates)` resolves the named template,
 * validates params against the template's contract, fills defaults,
 * interpolates `{{paramName}}` placeholders in the template TASK.md, and
 * produces a `SpawnRow` ready for `applyManifest`. Per-invocation errors
 * land as `SpawnFileEvidence`.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TemplateDef } from "../../src/task/spawn/templates.ts";
import type { DiscoveredInvocation } from "../../src/task/spawn/discover.ts";
import { expandInvocation } from "../../src/task/spawn/expand.ts";

let tmp: string;

function template(
  name: string,
  taskMd: string,
  params: TemplateDef["params"] = {},
): TemplateDef {
  const dir = join(tmp, "templates", name);
  mkdirSync(dir, { recursive: true });
  const taskMdPath = join(dir, "TASK.md");
  writeFileSync(taskMdPath, taskMd, "utf-8");
  return { name, taskMdPath, params };
}

function invocation(
  id: string,
  templateName: string,
  params?: Record<string, unknown>,
  depends_on?: string[],
): DiscoveredInvocation {
  return {
    id,
    spawnYmlPath: `${tmp}/spawn/${id}/spawn.yml`,
    invocation: {
      template: templateName,
      ...(params ? { params } : {}),
      ...(depends_on ? { depends_on } : {}),
    },
  };
}

describe("expandInvocation", () => {
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "converge-expand-"));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  it("expands a happy-path invocation into a SpawnRow", () => {
    const t = template(
      "asset-spec",
      "---\nid: x\n---\n# {{assetName}}\n",
      {
        assetId: { type: "string", required: true },
        assetName: { type: "string", required: true },
      },
    );

    const result = expandInvocation(
      invocation("hero-spec", "asset-spec", { assetId: "hero", assetName: "Hero" }),
      [t],
    );

    expect("row" in result).toBe(true);
    if ("row" in result) {
      expect(result.row.id).toBe("hero-spec");
      expect(result.row.template).toBe("asset-spec");
      expect(result.row.vars).toEqual({ assetId: "hero", assetName: "Hero" });
      expect(result.expandedTaskMd).toContain("# Hero");
    }
  });

  it("template-not-found produces evidence with a near-miss hint", () => {
    const t = template("asset-generate", "---\nid: x\n---\n");
    const result = expandInvocation(
      invocation("villain", "asset-genrate", {}),
      [t],
    );
    expect("evidence" in result).toBe(true);
    if ("evidence" in result) {
      expect(result.evidence.errorCode).toBe("template-not-found");
      expect(result.evidence.hint).toContain("asset-generate");
    }
  });

  it("missing-required-param produces evidence listing expected params", () => {
    const t = template(
      "asset-wire",
      "---\nid: x\n---\n",
      {
        assetId: { type: "string", required: true },
        outputPath: { type: "string", required: true },
      },
    );
    const result = expandInvocation(
      invocation("hero-wire", "asset-wire", { assetId: "hero" }),
      [t],
    );
    expect("evidence" in result).toBe(true);
    if ("evidence" in result) {
      expect(result.evidence.errorCode).toBe("missing-required-param");
      expect(result.evidence.expectedParams).toContain("outputPath");
      expect(result.evidence.fix).toContain("outputPath:");
    }
  });

  it("fills declared defaults when the invocation omits the param", () => {
    const t = template(
      "asset-spec",
      "---\nid: x\n---\nwidth={{width}}\n",
      {
        assetId: { type: "string", required: true },
        width: { type: "number", default: 1600 },
      },
    );
    const result = expandInvocation(
      invocation("hero", "asset-spec", { assetId: "hero" }),
      [t],
    );
    expect("row" in result).toBe(true);
    if ("row" in result) {
      expect(result.row.vars?.width).toBe(1600);
      expect(result.expandedTaskMd).toContain("width=1600");
    }
  });

  it("unknown-param flags an extra key with a did-you-mean hint", () => {
    const t = template(
      "asset-spec",
      "---\nid: x\n---\n",
      {
        assetId: { type: "string", required: true },
        assetName: { type: "string", required: true },
      },
    );
    const result = expandInvocation(
      invocation("hero", "asset-spec", { assetId: "h", assetNme: "Hero" }),
      [t],
    );
    expect("evidence" in result).toBe(true);
    if ("evidence" in result) {
      expect(result.evidence.errorCode).toBe("unknown-param");
      expect(result.evidence.hint).toContain("assetName");
    }
  });

  it("param-type-mismatch flags wrong type", () => {
    const t = template(
      "asset-spec",
      "---\nid: x\n---\n",
      {
        assetId: { type: "string", required: true },
        width: { type: "number", required: true },
      },
    );
    const result = expandInvocation(
      invocation("hero", "asset-spec", { assetId: "h", width: "wide" }),
      [t],
    );
    expect("evidence" in result).toBe(true);
    if ("evidence" in result) {
      expect(result.evidence.errorCode).toBe("param-type-mismatch");
      expect(result.evidence.message).toContain("width");
    }
  });

  it("threads depends_on into the SpawnRow's `after` field", () => {
    const t = template("asset-wire", "---\nid: x\n---\n", {});
    const result = expandInvocation(
      invocation("hero-wire", "asset-wire", undefined, ["hero-spec", "hero-generate"]),
      [t],
    );
    expect("row" in result).toBe(true);
    if ("row" in result) {
      expect(result.row.after).toEqual(["hero-spec", "hero-generate"]);
    }
  });

  it("substitutes {{taskId}} with the child's id", () => {
    const t = template(
      "prose",
      "---\nid: x\n---\n# task {{taskId}}\n",
      {},
    );
    const result = expandInvocation(invocation("hello-world", "prose"), [t]);
    expect("row" in result).toBe(true);
    if ("row" in result) {
      expect(result.expandedTaskMd).toContain("# task hello-world");
    }
  });

  it("round-trips unicode and quoted string params", () => {
    const t = template(
      "prose",
      "---\nid: x\n---\n# {{title}}\nnote: {{note}}\n",
      {
        title: { type: "string", required: true },
        note: { type: "string", required: true },
      },
    );
    const result = expandInvocation(
      invocation("weekly", "prose", { title: "週次", note: "it's a test" }),
      [t],
    );
    expect("row" in result).toBe(true);
    if ("row" in result) {
      expect(result.expandedTaskMd).toContain("# 週次");
      expect(result.expandedTaskMd).toContain("note: it's a test");
    }
  });
});
