/**
 * AIContextPacket builder — RFC 0048 (focused + complete form).
 *
 * The packet builder formats the right prompt shape for each fixed
 * situation. The packet is the agent's primary input — it must be
 * self-contained, situation-scoped, and never direct the AI to read
 * generated journal files.
 *
 * Design principles (priority: task quality > AI focus > token cost):
 *   - Quality first: the packet contains all the info the AI needs.
 *   - Focus via sectioning: six clearly-named sections.
 *   - No boilerplate: empty sections are not rendered.
 *   - Self-contained: never references journal files.
 *   - Retry deduplication: failure in context, goal in verification.
 */

import { describe, it, expect } from "vitest";

import {
  buildPacket,
  renderPacket,
} from "../../src/navigator/repair/packet-builder.ts";
import type {
  AIContextPacket,
  PacketInputs,
} from "../../src/navigator/repair/packet-builder.ts";
import type {
  TaskAttemptContext,
} from "../../src/task/lifecycle/attempt-context.ts";
import type { Situation } from "../../src/navigator/repair/situation-classifier.ts";

function baseAttempt(
  overrides: Partial<TaskAttemptContext> = {},
): TaskAttemptContext {
  return {
    taskId: "01-build",
    playbook: "demo",
    attempt: 1,
    status: "ready",
    taskSourcePath: "playbooks/demo/tasks/01-build/TASK.md",
    inputs: [
      { pattern: "in/*.png", count: 2, samples: ["in/a.png", "in/b.png"] },
    ],
    outputs: [{ path: "out/foo.png", exists: false }],
    checks: [
      {
        id: "lint",
        description: "eslint",
        cmd: "pnpm lint",
        passed: true,
        exitCode: 0,
      },
    ],
    skills: ["image-generate"],
    retryHints: [],
    logs: {},
    ...overrides,
  };
}

function baseInputs(
  overrides: Partial<PacketInputs> = {},
): PacketInputs {
  return {
    attempt: baseAttempt(),
    situation: "first-run" as Situation,
    sourceSummary:
      "Generate a hero illustration for the demo project from input images.",
    ...overrides,
  };
}

function packetText(p: AIContextPacket): string {
  return renderPacket(p);
}

describe("buildPacket — first-run", () => {
  it("includes objective, source summary, declared skill, and outputs/checks", () => {
    const p = buildPacket(baseInputs());
    expect(p.objective).toContain("Generate a hero illustration");
    expect(p.procedure).toContain("image-generate");
    expect(p.verification).toContain("out/foo.png");
    expect(p.verification).toContain("lint");
    expect(p.skillRefs).toEqual(["image-generate"]);
  });

  it("lists all input samples so the agent knows what's available", () => {
    const p = buildPacket(
      baseInputs({
        attempt: baseAttempt({
          inputs: [
            {
              pattern: "in/*.png",
              count: 4,
              samples: ["in/a.png", "in/b.png", "in/c.png", "in/d.png"],
            },
          ],
        }),
      }),
    );
    expect(p.context).toContain("in/a.png");
    expect(p.context).toContain("in/b.png");
    expect(p.context).toContain("in/c.png");
    expect(p.context).toContain("in/d.png");
  });

  it("truncates very long sample lists (keeps the first 5, notes the rest)", () => {
    const samples = ["in/a.png", "in/b.png", "in/c.png", "in/d.png", "in/e.png", "in/f.png", "in/g.png"];
    const p = buildPacket(
      baseInputs({
        attempt: baseAttempt({
          inputs: [{ pattern: "in/*.png", count: 7, samples }],
        }),
      }),
    );
    expect(p.context).toContain("in/a.png");
    expect(p.context).toContain("in/e.png");
    // The 6th and 7th are truncated with a count note.
    expect(p.context).toContain("+2 more");
    expect(p.context).not.toContain("in/f.png");
    expect(p.context).not.toContain("in/g.png");
  });

  it("lists declared outputs in verification (not duplicated in context)", () => {
    const p = buildPacket(
      baseInputs({
        attempt: baseAttempt({
          outputs: [
            { path: "out/foo.png", exists: false },
            { path: "out/bar.png", exists: true, sizeBytes: 1024 },
          ],
        }),
      }),
    );
    // Outputs go in verification, framed as "Produce:".
    expect(p.verification).toContain("out/foo.png");
    expect(p.verification).toContain("out/bar.png");
    expect(p.verification).toContain("missing");
    expect(p.verification).toContain("exists");
    // Context only carries the task id and inputs — not outputs.
    expect(p.context).not.toContain("out/foo.png");
    expect(p.context).not.toContain("Declared outputs");
  });

  it("lists all declared checks with their pass/fail state", () => {
    const p = buildPacket(
      baseInputs({
        attempt: baseAttempt({
          checks: [
            { id: "lint", description: "eslint", cmd: "pnpm lint", passed: true, exitCode: 0 },
            { id: "test", description: "vitest", cmd: "pnpm test", passed: false, exitCode: 1 },
          ],
        }),
      }),
    );
    expect(p.verification).toContain("lint");
    expect(p.verification).toContain("test");
    expect(p.verification).toContain("pnpm lint");
    expect(p.verification).toContain("pnpm test");
  });

  it("includes a constraints section that points to source", () => {
    const p = buildPacket(baseInputs());
    expect(p.constraints).toContain("playbooks/demo/tasks/01-build/TASK.md");
    expect(p.constraints).toMatch(/source/i);
    expect(p.constraints).toMatch(/journal/i);
  });
});

describe("buildPacket — retry-missing-output", () => {
  it("lists only the missing outputs in verification", () => {
    const p = buildPacket(
      baseInputs({
        situation: "retry-missing-output",
        attempt: baseAttempt({
          status: "failed",
          attempt: 2,
          retryHints: [
            {
              kind: "missing-output",
              target: "out/foo.png",
              message: "out/foo.png does not exist",
              sourceAttempt: 1,
            },
          ],
          outputs: [
            { path: "out/foo.png", exists: false },
            { path: "out/bar.png", exists: true, sizeBytes: 1024 },
          ],
        }),
      }),
    );
    expect(p.verification).toContain("out/foo.png");
    // Existing outputs should not be in the verification focus.
    expect(p.verification).not.toContain("out/bar.png");
  });

  it("shows the source path in constraints", () => {
    const p = buildPacket(
      baseInputs({
        situation: "retry-missing-output",
        attempt: baseAttempt({
          status: "failed",
          attempt: 2,
        }),
      }),
    );
    expect(p.constraints).toContain("playbooks/demo/tasks/01-build/TASK.md");
  });
});

describe("buildPacket — retry-check-failed", () => {
  it("lists only the failed checks in verification (passing checks not in focus)", () => {
    const p = buildPacket(
      baseInputs({
        situation: "retry-check-failed",
        attempt: baseAttempt({
          status: "failed",
          attempt: 2,
          checks: [
            {
              id: "lint",
              description: "eslint",
              cmd: "pnpm lint",
              passed: true,
              exitCode: 0,
            },
            {
              id: "test",
              description: "vitest",
              cmd: "pnpm test",
              passed: false,
              exitCode: 1,
              output: "1 test failed",
            },
          ],
          retryHints: [
            {
              kind: "check-failed",
              target: "test",
              message: "1 test failed",
              sourceAttempt: 1,
            },
          ],
        }),
      }),
    );
    expect(p.verification).toContain("test");
    expect(p.verification).toContain("pnpm test");
    // The verification is the cmd to re-run; passing checks don't appear.
    expect(p.verification).not.toContain("pnpm lint");
  });

  it("shows the failure in context and the goal in verification (no duplication)", () => {
    const p = buildPacket(
      baseInputs({
        situation: "retry-check-failed",
        attempt: baseAttempt({
          status: "failed",
          attempt: 2,
          checks: [
            {
              id: "test",
              description: "vitest",
              cmd: "pnpm test",
              passed: false,
              exitCode: 1,
              output: "1 test failed",
            },
          ],
        }),
      }),
    );
    // Failure appears in context.
    expect(p.context).toContain("test");
    expect(p.context).toContain("1 test failed");
    // Goal (re-run command) appears in verification.
    expect(p.verification).toContain("pnpm test");
    // Retry hints are a redundant restatement of the failure — drop them.
    expect(p.context).not.toMatch(/retry hint/i);
  });
});

describe("buildPacket — blocked-input", () => {
  it("lists missing patterns in context and known producers in procedure", () => {
    const p = buildPacket(
      baseInputs({
        situation: "blocked-input",
        attempt: baseAttempt({
          status: "blocked",
          inputs: [
            { pattern: "in/manifest.json", count: 0, samples: [] },
            { pattern: "in/*.png", count: 2, samples: ["in/a.png", "in/b.png"] },
          ],
        }),
        producers: ["02-fetch-manifest"],
      }),
    );
    expect(p.context).toContain("in/manifest.json");
    expect(p.procedure).toContain("02-fetch-manifest");
    // No full task body / skill instruction in a blocked-input packet.
    expect(p.procedure).not.toContain("image-generate");
    expect(p.objective).not.toContain("image-generate");
  });

  it("verification is a directive (do not run, wait), not a restatement of state", () => {
    const p = buildPacket(
      baseInputs({
        situation: "blocked-input",
        attempt: baseAttempt({
          status: "blocked",
          inputs: [
            { pattern: "in/manifest.json", count: 0, samples: [] },
          ],
        }),
        producers: ["02-fetch-manifest"],
      }),
    );
    expect(p.verification).toMatch(/do not run/i);
    expect(p.verification).toMatch(/wait/i);
    // Should NOT say "task becomes ready" — that restates the state.
    expect(p.verification).not.toMatch(/becomes ready/);
  });
});

describe("buildPacket — producer-rerun", () => {
  it("includes the producer delta in context", () => {
    const p = buildPacket(
      baseInputs({
        situation: "producer-rerun",
        attempt: baseAttempt({
          status: "ready",
          attempt: 2,
          outputs: [{ path: "out/foo.png", exists: true, sizeBytes: 1024 }],
        }),
        producerDelta:
          "Producer 02-fetch-manifest changed manifest schema to v2.",
      }),
    );
    expect(p.context).toContain("Producer 02-fetch-manifest changed");
    expect(p.context).toContain("v2");
  });
});

describe("buildPacket — interrupted-resume", () => {
  it("lists existing outputs and the work still missing", () => {
    const p = buildPacket(
      baseInputs({
        situation: "interrupted-resume",
        attempt: baseAttempt({
          status: "ready",
          attempt: 2,
          outputs: [{ path: "out/foo.png", exists: true, sizeBytes: 1024 }],
          checks: [
            {
              id: "lint",
              description: "eslint",
              cmd: "pnpm lint",
              passed: false,
              exitCode: 1,
            },
          ],
        }),
      }),
    );
    expect(p.context).toContain("out/foo.png");
    expect(p.verification).toContain("lint");
    // No restart instruction in resume.
    expect(p.objective.toLowerCase()).not.toContain("restart");
    expect(p.procedure.toLowerCase()).not.toContain("restart");
  });
});

describe("buildPacket — human-review-revision", () => {
  it("includes the human feedback in context", () => {
    const p = buildPacket(
      baseInputs({
        situation: "human-review-revision",
        attempt: baseAttempt({
          status: "ready",
          attempt: 2,
        }),
        humanReviewNote:
          "Please make the hero illustration brighter and add a tagline.",
      }),
    );
    expect(p.context).toContain("brighter");
    expect(p.context).toContain("tagline");
  });
});

describe("buildPacket — definition-repair", () => {
  it("includes the source path in objective/constraints and the specific fix in procedure", () => {
    const p = buildPacket(
      baseInputs({
        situation: "definition-repair",
        attempt: baseAttempt({
          status: "failed",
          attempt: 2,
        }),
        definitionIssue:
          "The TASK.md `outputs:` field is missing the `out/foo.png` entry.",
      }),
    );
    expect(p.objective).toContain("playbooks/demo/tasks/01-build/TASK.md");
    expect(p.procedure).toContain("out/foo.png");
    expect(p.constraints).toContain("playbooks/demo/tasks/01-build/TASK.md");
    // No execution prompt in a definition-repair packet.
    expect(p.procedure).not.toContain("image-generate");
    expect(p.objective).toMatch(/repair/i);
  });
});

describe("buildPacket — invariants across all situations", () => {
  const allSituations: Situation[] = [
    "first-run",
    "retry-missing-output",
    "retry-check-failed",
    "blocked-input",
    "producer-rerun",
    "interrupted-resume",
    "human-review-revision",
    "definition-repair",
  ];

  for (const situation of allSituations) {
    it(`${situation} packet has all required fields`, () => {
      const p = buildPacket(
        baseInputs({
          situation,
          attempt: baseAttempt({ status: "ready", attempt: 2 }),
        }),
      );
      expect(p.objective).toBeTruthy();
      expect(p.procedure).toBeTruthy();
      expect(p.context).toBeTruthy();
      expect(p.constraints).toBeTruthy();
      expect(p.verification).toBeTruthy();
      expect(Array.isArray(p.skillRefs)).toBe(true);
    });

    it(`${situation} packet never directs the AI to read a generated journal file`, () => {
      const p = buildPacket(
        baseInputs({
          situation,
          attempt: baseAttempt({ status: "ready", attempt: 2 }),
        }),
      );
      const text = packetText(p);
      expect(text).not.toMatch(/read .*TASK\.md/i);
      expect(text).not.toMatch(/read .*CHECK\.md/i);
      expect(text).not.toMatch(/read .*LEARN\.md/i);
      expect(text).not.toMatch(/read .*FEEDBACK\.md/i);
    });

    it(`${situation} packet never references the stale executions/<runId>/tasks/<taskId>/ path`, () => {
      const p = buildPacket(
        baseInputs({
          situation,
          attempt: baseAttempt({ status: "ready", attempt: 2 }),
        }),
      );
      const text = packetText(p);
      expect(text).not.toMatch(/executions\/[^/]+\/tasks\//);
    });

    it(`${situation} packet always carries the source-vs-journal edit rule`, () => {
      const p = buildPacket(
        baseInputs({
          situation,
          attempt: baseAttempt({ status: "ready", attempt: 2 }),
        }),
      );
      expect(p.constraints).toMatch(/source/i);
      expect(p.constraints).toMatch(/journal/i);
    });
  }
});
