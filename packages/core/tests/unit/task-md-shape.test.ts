/**
 * TaskMdShape API Tests
 *
 * Tests the new TaskMdShape-first spawn API:
 * - parseTaskMdString() — parse in-memory TASK.md strings
 * - rawMd() / template() — tagged type factories
 * - TaskMdShape interface — type contract
 */

import { describe, it, expect } from "vitest";
import { parseTaskMdString } from "../../src/config/task-md-definition.ts";
import type { TaskMdShape } from "../../src/config/task-md-definition.ts";
import { rawMd, template } from "../../src/config/task-definition.ts";

/* ------------------------------------------------------------------ */
/*  parseTaskMdString()                                                */
/* ------------------------------------------------------------------ */

describe("parseTaskMdString", () => {
  it("parses basic frontmatter + body", () => {
    const shape = parseTaskMdString(`---
id: my-task
title: My Task
---
This is the body.
`);
    expect(shape.id).toBe("my-task");
    expect(shape.title).toBe("My Task");
    expect(shape.body).toBe("This is the body.");
  });

  it("parses skills array", () => {
    const shape = parseTaskMdString(`---
id: task-1
skills:
  - stitch-prompt
  - stitch-generate
---
`);
    expect(shape.skills).toEqual(["stitch-prompt", "stitch-generate"]);
  });

  it("parses depends_on and blocking", () => {
    const shape = parseTaskMdString(`---
id: task-2
depends_on:
  - 001-design-system
  - 002-layout
blocking: true
---
`);
    expect(shape.depends_on).toEqual(["001-design-system", "002-layout"]);
    expect(shape.blocking).toBe(true);
  });

  it("parses inputs, outputs, tags", () => {
    const shape = parseTaskMdString(`---
id: task-3
inputs:
  - .stitch/DESIGN.md
outputs:
  - src/pages/Home.tsx
tags:
  - screen
  - "priority:high"
---
`);
    expect(shape.inputs).toEqual([".stitch/DESIGN.md"]);
    expect(shape.outputs).toEqual(["src/pages/Home.tsx"]);
    expect(shape.tags).toEqual(["screen", "priority:high"]);
  });

  it("parses checks with all fields", () => {
    const shape = parseTaskMdString(`---
id: task-4
checks:
  - id: lint
    cmd: npm run lint
    description: Run linter
---
`);
    expect(shape.checks).toEqual([
      { id: "lint", type: "cmd", cmd: "npm run lint", description: "Run linter" },
    ]);
  });

  it("parses needs with auto-generated description", () => {
    const shape = parseTaskMdString(`---
id: task-4b
needs:
  - id: build-check
    cmd: test -f dist/bundle.js
---
`);
    // parseChecks auto-generates description from id when not provided
    expect(shape.needs?.[0].id).toBe("build-check");
    expect(shape.needs?.[0].cmd).toBe("test -f dist/bundle.js");
  });

  it("parses executor config", () => {
    const shape = parseTaskMdString(`---
id: task-5
executor:
  type: script
  path: ./run.sh
  args:
    - --verbose
  env:
    NODE_ENV: production
---
`);
    expect(shape.executor).toEqual({
      type: "script",
      path: "./run.sh",
      args: ["--verbose"],
      env: { NODE_ENV: "production" },
    });
  });

  // Legacy `seeds:` is removed — see parseSeeds() in task-md-definition.ts.
  // The new contract is `seed: { mode: cli }`. These tests describe the old
  // shape and are kept skipped as documentation.
  it.skip("parses seeds config with inline entry (legacy seeds: removed)", () => {});
  it.skip("parses seeds config with named seed reference (legacy seeds: removed)", () => {});
  it.skip("parses seeds config with mixed entries (legacy seeds: removed)", () => {});

  it("accepts seed: { mode: cli } as the new contract", () => {
    const shape = parseTaskMdString(`---
id: task-6d
seed:
  mode: cli
---
`);
    expect(shape.seed).toEqual({ mode: "cli" });
  });

  it("parses plan config", () => {
    const shape = parseTaskMdString(`---
id: task-7
plan:
  prompt: Analyze the screens
  output: .converge/plan.md
---
`);
    expect(shape.plan).toEqual({
      prompt: "Analyze the screens",
      output: ".converge/plan.md",
    });
  });

  it("parses materials", () => {
    const shape = parseTaskMdString(`---
id: task-8
materials:
  - docs/spec.md
  - docs/design.md
---
`);
    expect(shape.materials).toEqual(["docs/spec.md", "docs/design.md"]);
  });

  it("collects non-reserved keys into vars", () => {
    const shape = parseTaskMdString(`---
id: task-9
title: Test
customField: hello
timeout: 3000
---
`);
    expect(shape.vars?.customField).toBe("hello");
    expect(shape.vars?.timeout).toBe(3000);
  });

  it("merges explicit vars with extra keys", () => {
    const shape = parseTaskMdString(`---
id: task-10
customKey: extra
vars:
  retries: 3
  verbose: true
---
`);
    expect(shape.vars?.customKey).toBe("extra");
    expect(shape.vars?.retries).toBe(3);
    expect(shape.vars?.verbose).toBe(true);
  });

  it("throws when there's no frontmatter delimiter (strict-by-default)", () => {
    // PR4 made frontmatter required. The previous "treat the whole file as
    // body" path was dead code — every legitimate TASK.md goes through
    // `serializeTaskMd` or `converge render`, both of which always emit
    // the `---` block. Anything else is a corruption worth surfacing.
    expect(() =>
      parseTaskMdString("Just a plain body with no frontmatter."),
    ).toThrow(/must start with `---`/);
  });

  it("returns empty id and body when frontmatter is empty object", () => {
    const shape = parseTaskMdString(`---
{}
---
Body here.
`);
    expect(shape.id).toBe("");
    expect(shape.body).toBe("Body here.");
  });

  it("handles description field", () => {
    const shape = parseTaskMdString(`---
id: desc-task
description: A detailed description of the task
---
`);
    expect(shape.description).toBe("A detailed description of the task");
  });

  it("handles agent field", () => {
    const shape = parseTaskMdString(`---
id: agent-task
agent: developer
---
`);
    expect(shape.agent).toBe("developer");
  });

  it("parses all fields in a single complex TASK.md", () => {
    const shape = parseTaskMdString(`---
id: complex-task
title: Complex Task
description: A fully loaded task definition
skills:
  - stitch-prompt
  - stitch-generate
agent: ui-designer
depends_on:
  - 000-setup
blocking: true
inputs:
  - .stitch/DESIGN.md
outputs:
  - src/pages/Home.tsx
checks:
  - id: lint
    cmd: npm run lint
    description: Run linter
tags:
  - screen
  - ui
materials:
  - docs/spec.md
plan:
  prompt: Plan the work
vars:
  screenId: home
---
Build the home page using the design system.
`);
    expect(shape.id).toBe("complex-task");
    expect(shape.title).toBe("Complex Task");
    expect(shape.description).toBe("A fully loaded task definition");
    expect(shape.skills).toEqual(["stitch-prompt", "stitch-generate"]);
    expect(shape.agent).toBe("ui-designer");
    expect(shape.depends_on).toEqual(["000-setup"]);
    expect(shape.blocking).toBe(true);
    expect(shape.inputs).toEqual([".stitch/DESIGN.md"]);
    expect(shape.outputs).toEqual(["src/pages/Home.tsx"]);
    expect(shape.checks?.[0].id).toBe("lint");
    expect(shape.tags).toEqual(["screen", "ui"]);
    expect(shape.materials).toEqual(["docs/spec.md"]);
    expect(shape.plan?.prompt).toBe("Plan the work");
    expect(shape.vars?.screenId).toBe("home");
    expect(shape.body).toBe("Build the home page using the design system.");
  });
});

/* ------------------------------------------------------------------ */
/*  rawMd() and template()                                             */
/* ------------------------------------------------------------------ */

describe("rawMd()", () => {
  it("creates a RawMarkdown tagged type", () => {
    const md = rawMd("---\ntitle: Test\n---\nBody");
    expect(md._type).toBe("raw-markdown");
    expect(md.content).toBe("---\ntitle: Test\n---\nBody");
  });

  it("integrates with parseTaskMdString", () => {
    const md = rawMd(`---
id: from-raw
title: From Raw
skills:
  - stitch-prompt
---
Generate a prompt for the home screen.
`);
    const shape = parseTaskMdString(md.content);
    expect(shape.id).toBe("from-raw");
    expect(shape.title).toBe("From Raw");
    expect(shape.skills).toEqual(["stitch-prompt"]);
    expect(shape.body).toBe("Generate a prompt for the home screen.");
  });
});

describe("template()", () => {
  it("creates a TemplateRef tagged type", () => {
    const ref = template("./templates/screen.md");
    expect(ref._type).toBe("template-ref");
    expect(ref.path).toBe("./templates/screen.md");
    expect(ref.vars).toBeUndefined();
  });

  it("accepts optional vars", () => {
    const ref = template("./templates/screen.md", {
      screenId: "home",
      screenTitle: "Home Screen",
    });
    expect(ref.vars).toEqual({
      screenId: "home",
      screenTitle: "Home Screen",
    });
  });
});

/* ------------------------------------------------------------------ */
/*  TaskMdShape as spawn currency                                      */
/* ------------------------------------------------------------------ */

describe("TaskMdShape", () => {
  it("plain object with id is a valid TaskMdShape", () => {
    const shape: TaskMdShape = {
      id: "001-task",
      title: "Task One",
      depends_on: ["000-setup"],
      skills: ["stitch-prompt"],
      tags: ["screen"],
    };
    expect(shape.id).toBe("001-task");
    expect(typeof shape.id).toBe("string");
  });

  it("supports body and prompt as aliases", () => {
    const withBody: TaskMdShape = { id: "a", body: "body text" };
    const withPrompt: TaskMdShape = { id: "b", prompt: "prompt text" };

    expect(withBody.body).toBe("body text");
    expect(withPrompt.prompt).toBe("prompt text");
  });

  it("supports all optional fields", () => {
    const shape: TaskMdShape = {
      id: "full-task",
      title: "Full Task",
      description: "A complete task definition",
      skills: ["stitch-prompt", "stitch-generate"],
      agent: "developer",
      executor: { type: "ai" },
      depends_on: ["dep-1"],
      blocking: true,
      inputs: ["input.txt"],
      outputs: ["output.txt"],
      checks: [{ id: "check-1", cmd: "test -f output.txt" }],
      needs: [{ id: "need-1", cmd: "which node" }],
      plan: { prompt: "Plan it" },
      seeds: [{ type: "nodejs", path: "./seeds/per-verb.seed.js" }],
      tags: ["tag-1"],
      materials: ["doc.md"],
      vars: { key: "value" },
      body: "The task body text",
      prompt: "Alternative to body",
    };
    expect(shape.id).toBe("full-task");
    expect(shape.skills).toHaveLength(2);
    expect(shape.executor?.type).toBe("ai");
    expect(shape.blocking).toBe(true);
    expect(shape.body).toBe("The task body text");
  });

  it("round-trips through parseTaskMdString → shape", () => {
    const original: TaskMdShape = {
      id: "round-trip",
      title: "Round Trip",
      skills: ["stitch-prompt"],
      depends_on: ["001-setup"],
      blocking: true,
      inputs: [".stitch/DESIGN.md"],
      outputs: ["src/Home.tsx"],
      tags: ["screen"],
      body: "Generate the home page.",
    };

    // Build a TASK.md string manually
    const md = `---
id: ${original.id}
title: ${original.title}
skills:
  - ${original.skills![0]}
depends_on:
  - ${original.depends_on![0]}
blocking: ${original.blocking}
inputs:
  - ${original.inputs![0]}
outputs:
  - ${original.outputs![0]}
tags:
  - ${original.tags![0]}
---
${original.body}
`;

    const parsed = parseTaskMdString(md);
    expect(parsed.id).toBe(original.id);
    expect(parsed.title).toBe(original.title);
    expect(parsed.skills).toEqual(original.skills);
    expect(parsed.depends_on).toEqual(original.depends_on);
    expect(parsed.blocking).toBe(original.blocking);
    expect(parsed.inputs).toEqual(original.inputs);
    expect(parsed.outputs).toEqual(original.outputs);
    expect(parsed.tags).toEqual(original.tags);
    expect(parsed.body).toBe(original.body);
  });
});
