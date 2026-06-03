/**
 * Packet-driven task-run prompt — RFC 0048.
 *
 * `PromptBuilder.buildPacketBasedTaskRunPrompt(packet, attemptNumber)`
 * renders a `AIContextPacket` into the agent's input. It is the
 * replacement for the legacy `buildFileBasedTaskRunPrompt` which
 * instructed the agent to read generated TASK.md / CHECK.md / LEARN.md.
 */

import { describe, it, expect } from "vitest";

import {
  buildPacket,
  renderPacket,
} from "../../src/navigator/repair/packet-builder.ts";
import { PromptBuilder } from "../../src/navigator/repair/system-prompts.ts";
import type { AIContextPacket } from "../../src/navigator/repair/packet-builder.ts";
import type { TaskAttemptContext } from "../../src/task/lifecycle/attempt-context.ts";

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
        description: "lint",
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

function packetFor(
  situation: Parameters<typeof buildPacket>[0]["situation"],
  overrides: Partial<Parameters<typeof buildPacket>[0]> = {},
): AIContextPacket {
  return buildPacket({
    attempt: baseAttempt(),
    situation,
    sourceSummary: "Generate a hero illustration from input images.",
    ...overrides,
  });
}

describe("PromptBuilder.buildPacketBasedTaskRunPrompt", () => {
  it("renders the packet as the agent input", () => {
    const packet = packetFor("first-run");
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 1);
    expect(prompt).toContain("Generate a hero illustration");
    expect(prompt).toContain("image-generate");
    expect(prompt).toContain("playbooks/demo/tasks/01-build/TASK.md");
  });

  it("never references generated journal files as a read path", () => {
    const packet = packetFor("first-run");
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 1);
    expect(prompt).not.toMatch(/read .*TASK\.md/i);
    expect(prompt).not.toMatch(/read .*CHECK\.md/i);
    expect(prompt).not.toMatch(/read .*LEARN\.md/i);
    expect(prompt).not.toMatch(/read .*FEEDBACK\.md/i);
  });

  it("never references the stale executions/<runId>/tasks/<taskId>/ path", () => {
    const packet = packetFor("first-run");
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 1);
    expect(prompt).not.toMatch(/executions\/[^/]+\/tasks\//);
  });

  it("does not include any reference to the legacy attempt folder layout", () => {
    const packet = packetFor("first-run");
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 1);
    expect(prompt).not.toMatch(/attempts\/wip\//);
    expect(prompt).not.toMatch(/NEEDS\.result\.md/);
    expect(prompt).not.toMatch(/INTERRUPTED\.md/);
  });

  it("includes the attempt number prefix and the rendered packet body", () => {
    const packet = packetFor("first-run");
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 1);
    expect(prompt.startsWith("## Attempt 1\n\n")).toBe(true);
    expect(prompt.endsWith(renderPacket(packet))).toBe(true);
  });

  it("retry packets contain only failing outputs/checks and retry hints", () => {
    const packet = packetFor("retry-check-failed", {
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
    });
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 2);
    expect(prompt).toContain("test");
    expect(prompt).toContain("pnpm test");
    // Lint (which passed) should not be the verification focus.
    expect(prompt).not.toMatch(/^\s*lint\b/m);
  });

  it("attemptNumber is shown in the prompt for retry packets", () => {
    const packet = packetFor("retry-missing-output", {
      attempt: baseAttempt({ status: "failed", attempt: 3 }),
    });
    const prompt = PromptBuilder.buildPacketBasedTaskRunPrompt(packet, 3);
    expect(prompt).toContain("Attempt 3");
  });
});
