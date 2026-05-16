/**
 * isAllowedExecutableInTasks — relaxed rule for what can live under a
 * playbook's `tasks/` tree (iter-27).
 *
 * Before iter-27, `validatePlaybook` required every file recursively
 * under `tasks/` to be markdown. Every shipping playbook violated this
 * with `seed.js`, `*.seed.js`, and similar — the rule was wrong relative
 * to the actual conventions. The relaxed rule:
 *
 *   1. `seed.<ext>` or `*.seed.<ext>` alongside a TASK.md is allowed
 *   2. Any executable inside a `seeds/`, `scripts/`, or `checks/`
 *      subdirectory (at any nesting depth) is allowed
 *   3. Anything else non-markdown remains a violation (the framework
 *      still rejects stray `.json`, `.txt`, etc. directly under
 *      `tasks/<id>/`)
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

import {
  isAllowedDataInTasks,
  isAllowedExecutableInTasks,
} from "../../src/task/playbook/layout.ts";

describe("isAllowedExecutableInTasks (iter-27)", () => {
  const tasksDir = "/pb/tasks";

  describe("seed-marker files (pattern 1)", () => {
    it("allows seed.js alongside a TASK.md", () => {
      expect(
        isAllowedExecutableInTasks(join(tasksDir, "scaffold", "seed.js"), tasksDir),
      ).toBe(true);
    });

    it("allows seed.mjs / seed.ts / seed.sh / seed.py", () => {
      for (const ext of [".mjs", ".cjs", ".sh", ".py"]) {
        expect(
          isAllowedExecutableInTasks(
            join(tasksDir, "01-step", `seed${ext}`),
            tasksDir,
          ),
        ).toBe(true);
      }
    });

    it("allows *.seed.js named seed files", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "03-build-screens", "build-screens.seed.js"),
          tasksDir,
        ),
      ).toBe(true);
    });

    it("allows *.seed.mjs and similar suffixes", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "07-build-overlays", "build-overlays.seed.mjs"),
          tasksDir,
        ),
      ).toBe(true);
    });
  });

  describe("executable namespaces (pattern 2)", () => {
    it("allows files inside tasks/<id>/seeds/", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "06-storyboard", "seeds", "storyboard.seed.js"),
          tasksDir,
        ),
      ).toBe(true);
    });

    it("allows files inside tasks/<id>/scripts/", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "build", "scripts", "deploy.sh"),
          tasksDir,
        ),
      ).toBe(true);
    });

    it("allows files inside tasks/<id>/checks/", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "verify", "checks", "smoke.mjs"),
          tasksDir,
        ),
      ).toBe(true);
    });

    it("allows nested tasks/<id>/<subid>/seeds/<file>", () => {
      expect(
        isAllowedExecutableInTasks(
          join(
            tasksDir,
            "03-build-screens",
            "tasks",
            "001-home",
            "seeds",
            "home.seed.js",
          ),
          tasksDir,
        ),
      ).toBe(true);
    });

    it("allows .py inside a seeds/ namespace", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "research", "seeds", "fetch.py"),
          tasksDir,
        ),
      ).toBe(true);
    });
  });

  describe("rejects unrelated non-markdown files", () => {
    it("rejects a stray .json file directly under tasks/<id>/", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "08-gen-assets", "001-week-01", "requirements.json"),
          tasksDir,
        ),
      ).toBe(false);
    });

    it("rejects an executable file directly under tasks/<id>/ that isn't a seed marker", () => {
      // check-all-handlers.mjs alongside TASK.md (not in a checks/ subdir)
      // is the baby-app case the iter-27 rule still rejects.
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "verify", "check-all-handlers.mjs"),
          tasksDir,
        ),
      ).toBe(false);
    });

    it("rejects .txt files everywhere under tasks/", () => {
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "01", "notes.txt"),
          tasksDir,
        ),
      ).toBe(false);
      // Even inside seeds/ — .txt isn't an executable extension.
      expect(
        isAllowedExecutableInTasks(
          join(tasksDir, "01", "seeds", "notes.txt"),
          tasksDir,
        ),
      ).toBe(false);
    });

    it("rejects paths outside the tasks/ tree", () => {
      expect(
        isAllowedExecutableInTasks("/other/dir/seed.js", tasksDir),
      ).toBe(false);
    });
  });

  describe("regression: 29 baby-app false-positives", () => {
    // Spot-check the patterns iter-26 surfaced as false-positives.
    const cases = [
      "03-build-screens/seeds/build-screens.seed.js",
      "03-build-screens/tasks/001-home/tasks/001-05-split/seed.js",
      "05-add-behavior/004-implement-providers/seed.js",
      "08-generate-assets/seeds/generate-assets.seed.js",
    ];
    for (const rel of cases) {
      it(`allows ${rel}`, () => {
        expect(
          isAllowedExecutableInTasks(join(tasksDir, rel), tasksDir),
        ).toBe(true);
      });
    }
  });
});

/* ------------------------------------------------------------------ */
/*  Iter-28: extended rules — data files + sibling TASK.md             */
/* ------------------------------------------------------------------ */

describe("isAllowedExecutableInTasks — pattern 3 (sibling TASK.md, iter-28)", () => {
  let workspace: string;
  let tasksDir: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-layout-iter28-"));
    tasksDir = join(workspace, "tasks");
    mkdirSync(tasksDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("allows .mjs check script alongside a sibling TASK.md", () => {
    // baby-app's tasks/06-wire-screens/004-verify/check-all-handlers.mjs
    // pattern: a check script declared in the sibling TASK.md's checks:.
    const taskDir = join(tasksDir, "verify");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "TASK.md"), "---\nid: verify\n---\nbody", "utf-8");
    writeFileSync(join(taskDir, "check-all-handlers.mjs"), "// check", "utf-8");
    expect(
      isAllowedExecutableInTasks(
        join(taskDir, "check-all-handlers.mjs"),
        tasksDir,
      ),
    ).toBe(true);
  });

  it("rejects executable when no sibling TASK.md exists", () => {
    const taskDir = join(tasksDir, "stray");
    mkdirSync(taskDir, { recursive: true });
    // No TASK.md
    writeFileSync(join(taskDir, "orphan.mjs"), "// orphan", "utf-8");
    expect(
      isAllowedExecutableInTasks(join(taskDir, "orphan.mjs"), tasksDir),
    ).toBe(false);
  });
});

describe("isAllowedDataInTasks (iter-28)", () => {
  let workspace: string;
  let tasksDir: string;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-layout-iter28-data-"));
    tasksDir = join(workspace, "tasks");
    mkdirSync(tasksDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(workspace, { recursive: true, force: true });
  });

  it("allows .json data file alongside a sibling TASK.md", () => {
    // baby-app's requirements.json pattern.
    const taskDir = join(tasksDir, "08-gen", "001-week-01");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "TASK.md"), "---\nid: w01\n---\nx", "utf-8");
    writeFileSync(
      join(taskDir, "requirements.json"),
      '{"x":1}',
      "utf-8",
    );
    expect(
      isAllowedDataInTasks(join(taskDir, "requirements.json"), tasksDir),
    ).toBe(true);
  });

  it("allows .yaml, .yml, .csv, .txt — full data extension set", () => {
    const taskDir = join(tasksDir, "task1");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "TASK.md"), "x", "utf-8");
    for (const ext of [".yaml", ".yml", ".csv", ".txt"]) {
      writeFileSync(join(taskDir, `fixture${ext}`), "x", "utf-8");
      expect(
        isAllowedDataInTasks(join(taskDir, `fixture${ext}`), tasksDir),
      ).toBe(true);
    }
  });

  it("rejects data files without a sibling TASK.md", () => {
    const taskDir = join(tasksDir, "loose");
    mkdirSync(taskDir, { recursive: true });
    // No TASK.md
    writeFileSync(
      join(taskDir, "orphan.json"),
      '{"x":1}',
      "utf-8",
    );
    expect(
      isAllowedDataInTasks(join(taskDir, "orphan.json"), tasksDir),
    ).toBe(false);
  });

  it("rejects non-data extensions (e.g. .png, .pdf)", () => {
    const taskDir = join(tasksDir, "task");
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(taskDir, "TASK.md"), "x", "utf-8");
    expect(
      isAllowedDataInTasks(join(taskDir, "image.png"), tasksDir),
    ).toBe(false);
    expect(
      isAllowedDataInTasks(join(taskDir, "doc.pdf"), tasksDir),
    ).toBe(false);
  });

  it("rejects paths outside the tasks/ tree", () => {
    expect(
      isAllowedDataInTasks("/other/dir/data.json", tasksDir),
    ).toBe(false);
  });
});
