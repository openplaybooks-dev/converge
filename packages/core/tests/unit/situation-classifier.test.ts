/**
 * Situation classifier — RFC 0048.
 *
 * The runner classifies the current attempt into one of 8 fixed situations,
 * then the packet builder formats the right prompt shape for it.
 *
 * Precedence (highest to lowest):
 *   definition-repair > human-review-revision > blocked-input >
 *   interrupted-resume > producer-rerun > retry-check-failed >
 *   retry-missing-output > first-run
 */

import { describe, it, expect } from "vitest";

import {
  classifySituation,
  isBlocked,
  hasFailedChecks,
  hasMissingOutputs,
  wasInterrupted,
} from "../../src/navigator/repair/situation-classifier.ts";
import type {
  Situation,
  SituationFacts,
} from "../../src/navigator/repair/situation-classifier.ts";
import type {
  TaskAttemptContext,
  AttemptStatus,
} from "../../src/task/lifecycle/attempt-context.ts";

function baseAttempt(
  overrides: Partial<TaskAttemptContext> = {},
): TaskAttemptContext {
  return {
    taskId: "01-build",
    playbook: "demo",
    attempt: 1,
    status: "ready",
    taskSourcePath: "playbooks/demo/tasks/01-build/TASK.md",
    inputs: [{ pattern: "in/*.png", count: 2, samples: ["in/a.png", "in/b.png"] }],
    outputs: [{ path: "out/foo.png", exists: false }],
    checks: [
      { id: "lint", description: "lint", cmd: "pnpm lint", passed: true, exitCode: 0 },
    ],
    skills: [],
    retryHints: [],
    logs: {},
    ...overrides,
  };
}

function facts(overrides: Partial<SituationFacts> = {}): SituationFacts {
  return {
    attempt: baseAttempt(),
    hasPriorAttempt: false,
    hasHumanReview: false,
    producerChanged: false,
    isDefinitionIssue: false,
    ...overrides,
  };
}

describe("helpers", () => {
  it("isBlocked is true when status is blocked", () => {
    expect(isBlocked(baseAttempt({ status: "blocked" as AttemptStatus }))).toBe(
      true,
    );
  });

  it("isBlocked is true when any input has zero matches", () => {
    expect(
      isBlocked(
        baseAttempt({
          status: "ready",
          inputs: [
            { pattern: "in/*.png", count: 2, samples: ["in/a.png", "in/b.png"] },
            { pattern: "in/manifest.json", count: 0, samples: [] },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("isBlocked is false when status is ready and all inputs match", () => {
    expect(isBlocked(baseAttempt())).toBe(false);
  });

  it("hasFailedChecks is true when any declared check did not pass", () => {
    expect(
      hasFailedChecks(
        baseAttempt({
          checks: [
            { id: "lint", description: "lint", cmd: "pnpm lint", passed: true, exitCode: 0 },
            { id: "test", description: "test", cmd: "pnpm test", passed: false, exitCode: 1 },
          ],
        }),
      ),
    ).toBe(true);
  });

  it("hasFailedChecks is false when no check has a false result", () => {
    expect(hasFailedChecks(baseAttempt())).toBe(false);
  });

  it("hasMissingOutputs is true when any declared output does not exist", () => {
    expect(hasMissingOutputs(baseAttempt())).toBe(true);
  });

  it("hasMissingOutputs is false when all outputs exist", () => {
    expect(
      hasMissingOutputs(
        baseAttempt({
          outputs: [{ path: "out/foo.png", exists: true, sizeBytes: 1024 }],
        }),
      ),
    ).toBe(false);
  });

  it("wasInterrupted is true when status is interrupted", () => {
    expect(
      wasInterrupted(undefined, baseAttempt({ status: "interrupted" as AttemptStatus })),
    ).toBe(true);
  });

  it("wasInterrupted is true when prior status was interrupted", () => {
    expect(
      wasInterrupted("interrupted" as AttemptStatus, baseAttempt({ status: "running" })),
    ).toBe(true);
  });
});

describe("classifySituation", () => {
  it("returns first-run for a fresh attempt with no prior history", () => {
    expect(classifySituation(facts())).toBe<Situation>("first-run");
  });

  it("returns retry-missing-output when prior failed and outputs missing", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "failed",
        attempt: baseAttempt({
          status: "failed",
          outputs: [{ path: "out/foo.png", exists: false }],
        }),
      }),
    );
    expect(result).toBe<Situation>("retry-missing-output");
  });

  it("returns retry-check-failed when prior failed and checks failed", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "failed",
        attempt: baseAttempt({
          status: "failed",
          outputs: [{ path: "out/foo.png", exists: true, sizeBytes: 100 }],
          checks: [
            { id: "lint", description: "lint", cmd: "pnpm lint", passed: false, exitCode: 1 },
          ],
        }),
      }),
    );
    expect(result).toBe<Situation>("retry-check-failed");
  });

  it("retry-check-failed takes priority over retry-missing-output", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "failed",
        attempt: baseAttempt({
          status: "failed",
          outputs: [{ path: "out/foo.png", exists: false }],
          checks: [
            { id: "lint", description: "lint", cmd: "pnpm lint", passed: false, exitCode: 1 },
          ],
        }),
      }),
    );
    expect(result).toBe<Situation>("retry-check-failed");
  });

  it("returns blocked-input when status is blocked", () => {
    const result = classifySituation(
      facts({
        attempt: baseAttempt({
          status: "blocked" as AttemptStatus,
          inputs: [
            { pattern: "in/*.png", count: 0, samples: [] },
          ],
        }),
      }),
    );
    expect(result).toBe<Situation>("blocked-input");
  });

  it("returns blocked-input when an input has zero matches even on first run", () => {
    const result = classifySituation(
      facts({
        attempt: baseAttempt({
          status: "ready",
          inputs: [
            { pattern: "in/manifest.json", count: 0, samples: [] },
          ],
        }),
      }),
    );
    expect(result).toBe<Situation>("blocked-input");
  });

  it("blocked-input takes priority over retry (cannot proceed without inputs)", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "failed",
        attempt: baseAttempt({
          status: "blocked",
          inputs: [
            { pattern: "in/*.png", count: 0, samples: [] },
          ],
          outputs: [{ path: "out/foo.png", exists: false }],
        }),
      }),
    );
    expect(result).toBe<Situation>("blocked-input");
  });

  it("returns interrupted-resume when prior status was interrupted", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "interrupted" as AttemptStatus,
        attempt: baseAttempt({ status: "ready" }),
      }),
    );
    expect(result).toBe<Situation>("interrupted-resume");
  });

  it("returns interrupted-resume when current status is interrupted", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "running",
        attempt: baseAttempt({ status: "interrupted" as AttemptStatus }),
      }),
    );
    expect(result).toBe<Situation>("interrupted-resume");
  });

  it("returns producer-rerun when producerChanged is true and no other priority signal", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "success",
        producerChanged: true,
        attempt: baseAttempt({
          status: "ready",
          outputs: [{ path: "out/foo.png", exists: true, sizeBytes: 100 }],
        }),
      }),
    );
    expect(result).toBe<Situation>("producer-rerun");
  });

  it("returns human-review-revision when human review feedback is present", () => {
    const result = classifySituation(
      facts({
        hasPriorAttempt: true,
        priorStatus: "success",
        hasHumanReview: true,
        attempt: baseAttempt({ status: "ready" }),
      }),
    );
    expect(result).toBe<Situation>("human-review-revision");
  });

  it("returns definition-repair when the task definition is broken", () => {
    const result = classifySituation(
      facts({
        isDefinitionIssue: true,
        attempt: baseAttempt({ status: "failed" }),
      }),
    );
    expect(result).toBe<Situation>("definition-repair");
  });

  it("definition-repair takes priority over human-review-revision", () => {
    const result = classifySituation(
      facts({
        isDefinitionIssue: true,
        hasHumanReview: true,
        attempt: baseAttempt({ status: "failed" }),
      }),
    );
    expect(result).toBe<Situation>("definition-repair");
  });

  it("definition-repair takes priority over retry", () => {
    const result = classifySituation(
      facts({
        isDefinitionIssue: true,
        hasPriorAttempt: true,
        priorStatus: "failed",
        attempt: baseAttempt({ status: "failed" }),
      }),
    );
    expect(result).toBe<Situation>("definition-repair");
  });
});
