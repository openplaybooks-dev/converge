import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  mapTaskMdToTaskDefinition,
  parseTaskMdString,
} from "../../src/config/task-md-definition.ts";
import {
  parsePlaybookYml,
  validatePlaybook,
} from "../../src/task/playbook/loader.ts";
import { DiscoveryScanner } from "../../src/task/discovery/scanner.ts";
import {
  seeds as seedApi,
  taskDef,
  tests as testApi,
} from "../../src/config/task-definition.ts";
import { taskDefToMdShape } from "../../src/executor/seed-executor.ts";

describe("declarative seeds/tests api", () => {
  it.skip("parses canonical object seeds and tests (legacy seeds: removed — use seed: { mode: cli })", () => {
    const parsed = parseTaskMdString([
      "---",
      "id: build",
      "seeds:",
      "  - name: epoch",
      "  - type: nodejs",
      "    path: seeds/fanout.seed.js",
      "tests:",
      "  - id: package-json",
      "    cmd: test -f package.json",
      "  - name: freshness",
      "    args:",
      "      path: output.txt",
      "---",
      "Build the project.",
    ].join("\n"));

    expect(parsed.seeds).toEqual([
      { name: "epoch", after: undefined },
      { type: "nodejs", path: "seeds/fanout.seed.js", after: undefined },
    ]);
    expect(parsed.checks).toEqual([
      {
        id: "package-json",
        description: "package-json",
        type: "cmd",
        cmd: "test -f package.json",
      },
      {
        id: "test:freshness",
        description: "test:freshness",
        type: "test",
        name: "freshness",
        args: { path: "output.txt" },
      },
    ]);
  });

  it("rejects ambiguous tests/checks and non-object tests", () => {
    expect(() =>
      parseTaskMdString([
        "---",
        "id: build",
        "tests:",
        "  - id: a",
        "    cmd: test -f a",
        "checks:",
        "  - id: b",
        "    cmd: test -f b",
        "---",
      ].join("\n")),
    ).toThrow(/not both/);

    expect(() =>
      parseTaskMdString([
        "---",
        "id: build",
        "tests:",
        "  - test:freshness(path=output.txt)",
        "---",
      ].join("\n")),
    ).toThrow(/entries must be objects/);
  });

  it.skip("resolves named seeds from task-local seeds directories (legacy seeds: removed)", async () => {
    const root = mkdtempSync(join(tmpdir(), "converge-seeds-api-"));
    try {
      const taskDir = join(root, ".converge/playbooks/default/tasks/build");
      mkdirSync(join(taskDir, "seeds"), { recursive: true });
      writeFileSync(join(taskDir, "seeds/epoch.seed.js"), "export function run() {}\n");

      const parsed = parseTaskMdString([
        "---",
        "id: build",
        "seeds:",
        "  - name: epoch",
        "---",
      ].join("\n"));
      const def = await mapTaskMdToTaskDefinition(parsed, "", "build", taskDir);

      expect(def.seedFn).toBeTypeOf("function");
      expect(def.seed).toEqual([{ name: "epoch", after: undefined }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it.skip("resolves named python seeds from playbook-level seeds directories (legacy seeds: removed)", async () => {
    const root = mkdtempSync(join(tmpdir(), "converge-seeds-api-"));
    try {
      const playbookDir = join(root, ".converge/playbooks/default");
      const taskDir = join(playbookDir, "tasks/build");
      mkdirSync(join(playbookDir, "seeds"), { recursive: true });
      mkdirSync(taskDir, { recursive: true });
      writeFileSync(join(playbookDir, "seeds/epoch.seed.py"), "print('[]')\n");

      const parsed = parseTaskMdString([
        "---",
        "id: build",
        "seeds:",
        "  - name: epoch",
        "---",
      ].join("\n"));
      const def = await mapTaskMdToTaskDefinition(parsed, "", "build", taskDir);

      expect(def.seedFn).toBeTypeOf("function");
      expect(def.seed).toEqual([{ name: "epoch", after: undefined }]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("loads markdown goals from playbook goals directory", async () => {
    const root = mkdtempSync(join(tmpdir(), "converge-goals-md-"));
    try {
      const playbookDir = join(root, ".converge/playbooks/default");
      mkdirSync(join(playbookDir, "tasks/build"), { recursive: true });
      mkdirSync(join(playbookDir, "goals"), { recursive: true });
      writeFileSync(
        join(playbookDir, "playbook.yml"),
        "name: default\ntasks:\n  - path: build\n",
      );
      writeFileSync(join(playbookDir, "tasks/build/TASK.md"), "---\nid: build\n---\n");
      writeFileSync(
        join(playbookDir, "goals/dashboard.goal.md"),
        [
          "---",
          "depends_on: [bootstrap]",
          "tests:",
          "  - id: page",
          "    cmd: test -f src/app/page.tsx",
          "---",
          "Dashboard renders.",
        ].join("\n"),
      );

      const def = await parsePlaybookYml(playbookDir);
      expect(def.goals![0]).toMatchObject({
        id: "dashboard",
        description: "Dashboard renders.",
        depends_on: ["bootstrap"],
        checks: [{ id: "page", cmd: "test -f src/app/page.tsx" }],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("discovers executable checks from playbook checks directory", async () => {
    const root = mkdtempSync(join(tmpdir(), "converge-checks-api-"));
    try {
      const checksDir = join(root, ".converge/playbooks/default/checks");
      mkdirSync(checksDir, { recursive: true });
      writeFileSync(join(checksDir, "freshness.sh"), "test -s \"$path\"\n");

      const result = await new DiscoveryScanner({}, root).scan();
      expect(result.testRegistry!.get("freshness")).toMatchObject({
        name: "freshness",
        type: "cmd",
        script: "test -s \"$path\"\n",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("validates the playbook root folder contract", async () => {
    const root = mkdtempSync(join(tmpdir(), "converge-layout-api-"));
    try {
      const playbookDir = join(root, ".converge/playbooks/default");
      mkdirSync(join(playbookDir, "tasks/build"), { recursive: true });
      mkdirSync(join(playbookDir, "checks"), { recursive: true });
      mkdirSync(join(playbookDir, "goals"), { recursive: true });
      writeFileSync(
        join(playbookDir, "playbook.yml"),
        "name: default\ntasks:\n  - path: build\n",
      );
      writeFileSync(join(playbookDir, "tasks/build/TASK.md"), "---\nid: build\n---\n");
      writeFileSync(join(playbookDir, "checks/freshness.sh"), "test -s output.txt\n");
      writeFileSync(join(playbookDir, "goals/done.goal.md"), "Done goal.\n");

      const def = await parsePlaybookYml(playbookDir);
      expect(validatePlaybook(def, playbookDir)).toEqual([]);

      // Iter-28: markdown files (README.md, SEED.md, nested TASK.md
      // templates) are valid inside executable namespaces like
      // checks/, seeds/, scripts/ — many playbooks ship companion
      // docs there. So readme.md is no longer an error.
      writeFileSync(join(playbookDir, "checks/readme.md"), "companion doc\n");
      expect(validatePlaybook(def, playbookDir)).toEqual([]);

      // But a non-markdown, non-executable file (e.g. .txt, .pdf, .png)
      // inside an executable namespace remains an error.
      writeFileSync(join(playbookDir, "checks/notes.txt"), "wrong type\n");
      expect(validatePlaybook(def, playbookDir).join("\n")).toContain(
        "Executable playbook folder",
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("builder helpers produce primitive tests and seeds for serialization", () => {
    const shape = taskDefToMdShape(
      taskDef()
        .id("build")
        .title("Build")
        .skills(["developer"])
        .tests([
          testApi.cmd({ id: "package-json", cmd: "test -f package.json" }),
          testApi.ref({ name: "freshness", args: { path: "output.txt" } }),
        ])
        .seeds([seedApi.ref({ name: "epoch" })])
        .build(),
    );

    expect(shape.tests).toEqual([
      {
        id: "package-json",
        name: undefined,
        cmd: "test -f package.json",
        description: "package-json",
        args: undefined,
        type: "cmd",
      },
      {
        id: "test:freshness",
        name: "freshness",
        cmd: undefined,
        description: "test:freshness",
        args: { path: "output.txt" },
        type: "test",
      },
    ]);
    expect(shape.seeds).toEqual([{ name: "epoch", after: undefined }]);
  });
});
