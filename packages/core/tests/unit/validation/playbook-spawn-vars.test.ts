/**
 * RFC 0001 — Tests for the cross-template var validator.
 *
 * Covers the seven scenarios spelled out in the RFC test plan:
 *   1. Happy path: parent emits all vars target needs → no warnings.
 *   2. Missing var: parent omits a required var → warning at correct line.
 *   3. Extra var: parent passes a var target doesn't declare → info note.
 *   4. Dynamic loop: bash `for` loop with `--var "k=${ITEM}"` → key recognised.
 *   5. Dynamic opt-out: `dynamic: true` in frontmatter → no warnings.
 *   6. Unresolvable spawn: `--path "$DYNAMIC"` → info note, no error.
 *   7. Missing target: `--path` points to a non-existent template → warning.
 *
 * Helpers (`extractStaticSpawns`, `readDeclaredVars`,
 * `extractFencedBashBlocks`) are covered separately as the lowest-level
 * primitives.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  extractStaticSpawns,
  readDeclaredVars,
  extractFencedBashBlocks,
  playbookSpawnVarsRules,
} from "../../../src/validation/rules/playbook-spawn-vars.ts";

function plant(path: string, body: string) {
  mkdirSync(path.substring(0, path.lastIndexOf("/")), { recursive: true });
  writeFileSync(path, body);
}

let ROOT: string;
beforeEach(() => {
  ROOT = join(
    tmpdir(),
    `converge-spawnvars-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  ).replace(/\\/g, "/");
  mkdirSync(ROOT, { recursive: true });
});
afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

function plantTarget(varNames: string[], optionalNames: string[] = []): string {
  const targetPath = `${ROOT}/templates/widget/TASK.md`;
  const varsBlock = varNames
    .map((v) =>
      optionalNames.includes(v) ? `  ${v}:\n    optional: true` : `  ${v}:`,
    )
    .join("\n");
  plant(targetPath, `---\nid: widget\nvars:\n${varsBlock}\n---\n# Widget\n`);
  return targetPath;
}

function plantParent(opts: {
  seedMode?: "cli" | null;
  dynamic?: boolean;
  body: string;
}): string {
  const parentPath = `${ROOT}/tasks/parent/TASK.md`;
  const fmLines = ["id: parent"];
  if (opts.seedMode === "cli") fmLines.push("seed:\n  mode: cli");
  if (opts.dynamic) fmLines.push("dynamic: true");
  plant(parentPath, `---\n${fmLines.join("\n")}\n---\n${opts.body}\n`);
  return parentPath;
}

function makeCtx(taskFiles: string[]) {
  return {
    playbookDir: ROOT,
    projectDir: ROOT,
    def: {},
    taskFiles,
    goalFiles: [],
    scriptFiles: [],
    templateFiles: [],
  };
}

const rule = playbookSpawnVarsRules.find(
  (r) => r.id === "spawn-vars-match-target-template",
)!;

describe("extractStaticSpawns", () => {
  it("parses a literal spawn line", () => {
    const spawns = extractStaticSpawns(
      `converge spawn template --path "templates/widget/TASK.md" --id w1 --var "name=Card" --var "id=001"`,
    );
    expect(spawns).toHaveLength(1);
    expect(spawns[0]).toMatchObject({
      path: "templates/widget/TASK.md",
      parseable: true,
      line: 1,
    });
    expect([...spawns[0].varKeys].sort()).toEqual(["id", "name"]);
  });

  it("recognises --var keys whose values are bash variables", () => {
    const spawns = extractStaticSpawns(
      `converge spawn template --path "t/T.md" --var "k=\${ITEM}" --var "j=$NAME"`,
    );
    expect(spawns[0].varKeys.has("k")).toBe(true);
    expect(spawns[0].varKeys.has("j")).toBe(true);
    expect(spawns[0].parseable).toBe(true);
  });

  it("handles --path=... and --var=... (single-token forms)", () => {
    const spawns = extractStaticSpawns(
      `converge spawn template --path=t.md --var=k=v`,
    );
    expect(spawns[0].path).toBe("t.md");
    expect(spawns[0].varKeys.has("k")).toBe(true);
  });

  it("joins backslash-continued lines into one spawn", () => {
    const spawns = extractStaticSpawns(
      `converge spawn template --path "t.md" \\\n  --var "a=1" --var "b=2"`,
    );
    expect(spawns).toHaveLength(1);
    expect([...spawns[0].varKeys].sort()).toEqual(["a", "b"]);
  });

  it("ignores non-spawn lines", () => {
    const spawns = extractStaticSpawns(
      `echo hello\nconverge run task\nconverge spawn template --path t.md\n# comment`,
    );
    expect(spawns).toHaveLength(1);
    expect(spawns[0].path).toBe("t.md");
  });

  it("marks unbalanced-quote lines as unparseable", () => {
    const spawns = extractStaticSpawns(
      `converge spawn template --path "broken`,
    );
    expect(spawns).toHaveLength(1);
    expect(spawns[0].parseable).toBe(false);
  });
});

describe("readDeclaredVars", () => {
  it("returns the set of declared var keys", () => {
    const p = plantTarget(["a", "b", "c"]);
    expect([...(readDeclaredVars(p) ?? [])].sort()).toEqual(["a", "b", "c"]);
  });

  it("omits vars marked optional: true", () => {
    const p = plantTarget(["a", "b"], ["b"]);
    expect([...(readDeclaredVars(p) ?? [])]).toEqual(["a"]);
  });

  it("returns null when no `vars:` block is present", () => {
    const p = `${ROOT}/templates/empty/TASK.md`;
    plant(p, `---\nid: empty\n---\n# body`);
    expect(readDeclaredVars(p)).toBeNull();
  });

  it("returns null when file does not exist", () => {
    expect(readDeclaredVars(`${ROOT}/nope.md`)).toBeNull();
  });
});

describe("extractFencedBashBlocks", () => {
  it("extracts bash blocks with correct start line", () => {
    const md = [
      "# title",
      "",
      "```bash",
      "echo a",
      "echo b",
      "```",
      "",
      "text",
    ].join("\n");
    const blocks = extractFencedBashBlocks(md);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].body).toBe("echo a\necho b");
    // start line is the first content line (1-based); 1 "# title" 2 blank 3 ``` 4 echo a
    expect(blocks[0].startLine).toBe(4);
  });

  it("treats ```sh and ```shell as bash too", () => {
    const md = "```sh\necho a\n```\n```shell\necho b\n```";
    expect(extractFencedBashBlocks(md)).toHaveLength(2);
  });
});

describe("spawn-vars-match-target-template rule", () => {
  it("(1) happy path: parent emits every required var → no warnings", () => {
    const target = plantTarget(["name", "id"]);
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "```bash",
        `converge spawn template --path "${target}" --var "name=A" --var "id=1"`,
        "```",
      ].join("\n"),
    });
    const issues = rule
      .check(makeCtx([parent]))
      .filter((i) => i.severity === "warning");
    expect(issues).toEqual([]);
  });

  it("(2) missing var → warning at correct line", () => {
    const target = plantTarget(["widgetPath", "widgetId"]);
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "Some prose.",
        "",
        "```bash",
        `converge spawn template --path "${target}" --var "widgetId=001"`,
        "```",
      ].join("\n"),
    });
    const warnings = rule
      .check(makeCtx([parent]))
      .filter((i) => i.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toContain("widgetPath");
    // body line 4 is the spawn line; frontmatter prelude shifts the absolute line.
    expect(warnings[0].message).toMatch(/:\d+ omits/);
  });

  it("(3) extra var → info note, not a warning", () => {
    const target = plantTarget(["a"]);
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "```bash",
        `converge spawn template --path "${target}" --var "a=1" --var "b=2"`,
        "```",
      ].join("\n"),
    });
    const issues = rule.check(makeCtx([parent]));
    expect(issues.filter((i) => i.severity === "warning")).toEqual([]);
    const info = issues.filter((i) => i.severity === "info");
    expect(info.some((i) => i.message.includes('passes "b"'))).toBe(true);
  });

  it("(4) dynamic loop: `for` loop with --var k=${ITEM} → key recognised", () => {
    const target = plantTarget(["item"]);
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "```bash",
        "for ITEM in a b c; do",
        `  converge spawn template --path "${target}" --var "item=\${ITEM}"`,
        "done",
        "```",
      ].join("\n"),
    });
    const warnings = rule
      .check(makeCtx([parent]))
      .filter((i) => i.severity === "warning");
    expect(warnings).toEqual([]);
  });

  it("(5) dynamic opt-out: `dynamic: true` → no warnings even if vars missing", () => {
    const target = plantTarget(["a", "b", "c"]);
    const parent = plantParent({
      seedMode: "cli",
      dynamic: true,
      body: [
        "```bash",
        `converge spawn template --path "${target}"`,
        "```",
      ].join("\n"),
    });
    const issues = rule.check(makeCtx([parent]));
    expect(issues).toEqual([]);
  });

  it('(6) unresolvable --path: `--path "$DYNAMIC"` → info note, no warning', () => {
    plantTarget(["a"]);
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "```bash",
        `converge spawn template --path "$DYNAMIC" --var "a=1"`,
        "```",
      ].join("\n"),
    });
    const issues = rule.check(makeCtx([parent]));
    expect(issues.filter((i) => i.severity === "warning")).toEqual([]);
    expect(
      issues.some(
        (i) => i.severity === "info" && i.message.includes("dynamic --path"),
      ),
    ).toBe(true);
  });

  it("(7) missing target template → warning", () => {
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "```bash",
        `converge spawn template --path "${ROOT}/templates/ghost/TASK.md" --var "a=1"`,
        "```",
      ].join("\n"),
    });
    const warnings = rule
      .check(makeCtx([parent]))
      .filter((i) => i.severity === "warning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0].message).toMatch(/missing template/);
  });

  it("ignores tasks without `seed: { mode: cli }`", () => {
    const target = plantTarget(["a"]);
    const parent = plantParent({
      // no seed: cli
      seedMode: null,
      body: [
        "```bash",
        `converge spawn template --path "${target}"`,
        "```",
      ].join("\n"),
    });
    expect(rule.check(makeCtx([parent]))).toEqual([]);
  });

  it("regression: baby-app widgetFile vs widgetPath mismatch is caught", () => {
    const target = plantTarget(["widgetPath", "widgetId", "widgetName"]);
    const parent = plantParent({
      seedMode: "cli",
      body: [
        "```bash",
        `converge spawn template --path "${target}" \\`,
        `  --var "widgetId=001" \\`,
        `  --var "widgetName=Card" \\`,
        `  --var "widgetFile=lib/card.dart"`,
        "```",
      ].join("\n"),
    });
    const issues = rule.check(makeCtx([parent]));
    const warning = issues.find(
      (i) => i.severity === "warning" && i.message.includes("widgetPath"),
    );
    expect(warning).toBeDefined();
    // The extra widgetFile var should also be flagged as info.
    const info = issues.find(
      (i) => i.severity === "info" && i.message.includes('"widgetFile"'),
    );
    expect(info).toBeDefined();
  });
});
