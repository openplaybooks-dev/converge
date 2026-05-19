/**
 * RFC 0002 — Structured JSON spawn protocol.
 *
 * The legacy string form is shell-quoting-as-API: agents emit
 * `converge spawn template --path X --var k="v with spaces"` strings,
 * the CLI re-tokenises them, and a missing quote (observed in baby-app:
 * `--var title=Cycle Tracking`) torches the whole run. The structured
 * form lets agents pass a JS object directly — no quoting round-trip.
 *
 * Tests cover the seven RFC scenarios plus regression for the baby-app
 * "Cycle Tracking" failure.
 */
import { describe, it, expect } from "vitest";
import {
  parseSpawnCliLine,
  coerceStructuredSpawn,
  type SpawnCliCommand,
} from "../../src/seed/cli-spawn.ts";

describe("coerceStructuredSpawn", () => {
  it("(1) template kind: coerces to SpawnCliTemplateCommand", () => {
    const cmd = coerceStructuredSpawn({
      kind: "template",
      path: "templates/widget/TASK.md",
      id: "w1",
      vars: { name: "Card", id: "001" },
    });
    expect(cmd).toEqual<SpawnCliCommand>({
      kind: "template",
      path: "templates/widget/TASK.md",
      id: "w1",
      vars: { name: "Card", id: "001" },
    });
  });

  it("(2) task kind: coerces to SpawnCliTaskCommand with arrays defaulted", () => {
    const cmd = coerceStructuredSpawn({
      kind: "task",
      id: "task-1",
      title: "Do thing",
      vars: { x: "y" },
    });
    expect(cmd).toEqual<SpawnCliCommand>({
      kind: "task",
      id: "task-1",
      title: "Do thing",
      dependsOn: [],
      inputs: [],
      outputs: [],
      tags: [],
      vars: { x: "y" },
      checks: [],
    });
  });

  it("(2b) task kind: forwards all optional fields", () => {
    const cmd = coerceStructuredSpawn({
      kind: "task",
      id: "task-2",
      title: "Full task",
      taskFile: "/tmp/t.md",
      dependsOn: ["a", "b"],
      inputs: ["in1"],
      outputs: ["out1"],
      tags: ["tag1"],
      vars: { k: "v" },
      checks: [{ id: "c1", cmd: "test -f out1" }],
      body: "Body text",
    });
    expect(cmd).toEqual<SpawnCliCommand>({
      kind: "task",
      id: "task-2",
      title: "Full task",
      taskFile: "/tmp/t.md",
      dependsOn: ["a", "b"],
      inputs: ["in1"],
      outputs: ["out1"],
      tags: ["tag1"],
      vars: { k: "v" },
      checks: [{ id: "c1", cmd: "test -f out1" }],
      body: "Body text",
    });
  });

  it("(3) var with spaces round-trips verbatim (no re-tokenisation)", () => {
    const cmd = coerceStructuredSpawn({
      kind: "template",
      path: "t.md",
      vars: { title: "Cycle Tracking" },
    });
    expect(cmd.kind).toBe("template");
    if (cmd.kind === "template") {
      expect(cmd.vars.title).toBe("Cycle Tracking");
    }
  });

  it('(4) var with embedded quotes round-trips verbatim', () => {
    const tricky = `it's a "test" value`;
    const cmd = coerceStructuredSpawn({
      kind: "template",
      path: "t.md",
      vars: { title: tricky },
    });
    if (cmd.kind === "template") {
      expect(cmd.vars.title).toBe(tricky);
    }
  });

  it("(5) var with unicode round-trips verbatim", () => {
    const cmd = coerceStructuredSpawn({
      kind: "template",
      path: "t.md",
      vars: { title: "週次" },
    });
    if (cmd.kind === "template") {
      expect(cmd.vars.title).toBe("週次");
    }
  });

  it("rejects an object without a recognised `kind`", () => {
    expect(() => coerceStructuredSpawn({ path: "t.md" } as any)).toThrow(
      /kind/i,
    );
  });

  it("rejects a template object missing `path`", () => {
    expect(() =>
      coerceStructuredSpawn({ kind: "template" } as any),
    ).toThrow(/path/i);
  });

  it("rejects a task object missing `id`", () => {
    expect(() =>
      coerceStructuredSpawn({ kind: "task" } as any),
    ).toThrow(/id/i);
  });

  it("defaults missing `vars` to an empty object", () => {
    const cmd = coerceStructuredSpawn({ kind: "template", path: "t.md" });
    if (cmd.kind === "template") {
      expect(cmd.vars).toEqual({});
    }
  });
});

describe("regression: baby-app `Cycle Tracking` mismatch", () => {
  it("string form: unquoted spaces still misparse (documenting the trap)", () => {
    // This is the behaviour that prompted RFC 0002. The legacy parser
    // tokenises on whitespace, so the second word looks like an unknown
    // positional flag.
    expect(() =>
      parseSpawnCliLine(
        "converge spawn template --path t.md --var title=Cycle Tracking",
      ),
    ).toThrow(/Tracking/);
  });

  it("structured form: same value passes through cleanly", () => {
    const cmd = coerceStructuredSpawn({
      kind: "template",
      path: "t.md",
      vars: { title: "Cycle Tracking" },
    });
    if (cmd.kind === "template") {
      expect(cmd.vars.title).toBe("Cycle Tracking");
    }
  });
});
