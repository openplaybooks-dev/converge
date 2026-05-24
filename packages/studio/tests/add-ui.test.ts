import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createAddStudioServer } from "../src/add-ui.ts";

const STUB_PLAN_MD = `---
kind: container
children:
  - id: 01-data-model
    kind: executable
    title: Define the data model
  - id: 02-ui-shell
    kind: container
    title: Build the UI shell
  - id: 03-feedback
    kind: seed
    title: Capture human feedback
---

# Goal

Build a planning studio.

# Decision

Use a browser-driven planning loop.
`;

function stubPlannerAgentFactory() {
  return () => async () => {
    const outputDir = process.env.CONVERGE_PLAN_OUTPUT_DIR;
    if (!outputDir) {
      throw new Error("CONVERGE_PLAN_OUTPUT_DIR missing");
    }
    writeFileSync(join(outputDir, "PLAN.md"), STUB_PLAN_MD, "utf8");
    return { raw: "wrote PLAN.md" };
  };
}

async function waitFor<T>(
  fn: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 15_000,
): Promise<T> {
  const started = Date.now();
  let last!: T;
  while (Date.now() - started < timeoutMs) {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 150));
  }
  throw new Error("timed out waiting for condition");
}

function parseSessionIdFromLocation(location: string | null, baseUrl: string): string {
  if (!location) throw new Error("missing location header");
  const url = new URL(location, baseUrl);
  const parts = url.pathname.split("/").filter(Boolean);
  const sessionId = parts[1];
  if (!sessionId) throw new Error(`could not parse session id from ${location}`);
  return sessionId;
}

describe("browser studio add flow", () => {
  let workspace: string;
  let server: Awaited<ReturnType<typeof createAddStudioServer>> | null = null;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-add-ui-"));
    mkdirSync(join(workspace, ".converge"), { recursive: true });
    writeFileSync(
      join(workspace, ".converge", "project.yaml"),
      "name: test-project\n",
      "utf8",
    );
  });

  afterEach(async () => {
    await server?.close().catch(() => {});
    server = null;
    rmSync(workspace, { recursive: true, force: true });
  });

  it(
    "shows a single prompt-first landing page",
    async () => {
    server = await createAddStudioServer({
        projectDir: workspace,
        port: 0,
        plannerAgentfn: stubPlannerAgentFactory(),
      });

      expect(await fetch(server.url).then((r) => r.status)).toBe(401);

      const page = await fetch(server.withAuth("/")).then((r) => r.text());
      expect(page).toContain("Playbook planner");
      expect(page).toContain("Template");
      expect(page).toContain("Playbook instruction");
      expect(page).toContain("Goal / app description");
      expect(page).toContain("How this planner works");
      expect(page).toContain("data-autoresize");
      expect(page).toContain("data-template-instruction");
      expect(page).toContain("data-instruction=");
      expect(page).toContain("Use these sections:");
      expect(page).toContain("Workflow guidance:");
      expect(page).toContain("Blank");
      expect(page).toContain("Deep research");
      expect(page).toContain("Build Flutter app");
      expect(page).toContain("Start plan");
      expect(page).not.toContain("Published playbooks");
      expect(page).not.toContain("Planning sessions");
    },
  );

  it(
    "shows a help page explaining how to use the planner",
    async () => {
    server = await createAddStudioServer({
        projectDir: workspace,
        port: 0,
        plannerAgentfn: stubPlannerAgentFactory(),
      });

      const page = await fetch(server.withAuth("/help")).then((r) => r.text());
      expect(page).toContain("How the planner works");
      expect(page).toContain("A quick mental model");
      expect(page).toContain("What is a playbook?");
      expect(page).toContain("How the fields map");
      expect(page).toContain("Examples");
      expect(page).toContain("Deep research");
      expect(page).toContain("Build Flutter app");
      expect(page).toContain("Back to planner");
    },
  );

  it(
    "lets the user start, revise, publish, and review the HTML artifact in the browser",
    async () => {
    server = await createAddStudioServer({
      projectDir: workspace,
      port: 0,
      plannerAgentfn: stubPlannerAgentFactory(),
    });

    const startResp = await fetch(server.withAuth("/sessions"), {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        name: "handoff-review",
        goal: "Build a baby tracker app for parents.",
      }),
    });

    expect(startResp.status).toBe(303);
    const sessionId = parseSessionIdFromLocation(
      startResp.headers.get("location"),
      server.url,
    );

    const status1 = await waitFor(
      async () => {
        const resp = await fetch(server.withAuth(`/api/sessions/${sessionId}/status`));
        return (await resp.json()) as any;
      },
      (status) => status.status === "awaiting-feedback" && status.revision === 1,
    );

    expect(status1.planMarkdown).toContain("Build a planning studio");

    const page = await fetch(server.withAuth(`/sessions/${sessionId}`)).then((r) =>
      r.text(),
    );
    expect(page).toContain("Planner feed");
    expect(page).toContain("Planner prompt");
    expect(page).toContain("Task topology and output");
    expect(page).toContain("Human replies and loops");
    expect(page).toContain("Planner topology");
    expect(page).toContain("Outputs");
    expect(page).toContain("Feedback loop");
    expect(page).toContain("Publish");
    expect(page).toContain("Awaiting feedback");
    expect(page).toContain("Human in the loop");
    expect(page).toContain("Post reply");
    expect(page).toContain("Plan artifact");

    const feedbackResp = await fetch(
      server.withAuth(`/sessions/${sessionId}/feedback`),
      {
        method: "POST",
        redirect: "manual",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          feedback: "Break the UI shell into smaller tasks and keep it local-only.",
        }),
      },
    );
    expect(feedbackResp.status).toBe(303);

    const status2 = await waitFor(
      async () => {
        const resp = await fetch(server.withAuth(`/api/sessions/${sessionId}/status`));
        return (await resp.json()) as any;
      },
      (status) => status.status === "awaiting-feedback" && status.revision === 2,
    );

    expect(status2.feedback).toHaveLength(1);

    const acceptResp = await fetch(
      server.withAuth(`/sessions/${sessionId}/accept`),
      {
        method: "POST",
        redirect: "manual",
      },
    );
    expect(acceptResp.status).toBe(303);
    expect(acceptResp.headers.get("location")).toContain("/playbooks/handoff-review");

    const playbookPage = await fetch(server.withAuth("/playbooks/handoff-review")).then((r) =>
      r.text(),
    );
    expect(playbookPage).toContain("Published playbook");
    expect(playbookPage).toContain("Published plan");
    expect(playbookPage).toContain("Human-in-the-loop artifact");
    expect(playbookPage).toContain("Playbook topology");
    expect(playbookPage).toContain("Task threads");
    expect(playbookPage).toContain("Open run dashboard");
    expect(playbookPage).toContain("Open review artifact");

    const finalDir = join(workspace, ".converge", "playbooks", "handoff-review");
    expect(existsSync(join(finalDir, "playbook.yml"))).toBe(true);
    expect(existsSync(join(finalDir, "tasks", "01-data-model", "TASK.md"))).toBe(true);

    const reportPath = join(
      workspace,
      ".converge",
      "inventory",
      "handoff-review",
      "reports",
      "manager-report.html",
    );
    const reportJsonlPath = join(
      workspace,
      ".converge",
      "inventory",
      "handoff-review",
      "reports",
      "manager-report.jsonl",
    );
    const attemptFeedbackPath = join(
      workspace,
      ".converge",
      "journal",
      "handoff-review",
      "tasks",
      "manager-report",
      "attempts",
      "wip",
      "FEEDBACK.md",
    );
    mkdirSync(join(attemptFeedbackPath, ".."), { recursive: true });
    writeFileSync(
      attemptFeedbackPath,
      "# FEEDBACK.md\n\nExisting attempt context.\n",
      "utf8",
    );
    const initialReport = await fetch(server.withAuth("/playbooks/handoff-review/tasks/manager-report/report")).then((r) => r.text());
    expect(initialReport).toContain("Human review report");
    expect(initialReport).toContain("Feedback");
    expect(initialReport).toContain("Accept");
    expect(initialReport).toContain('name="feedback"');
    expect(initialReport).not.toContain('name="reportTitle"');
    expect(initialReport).not.toContain('name="summary"');
    expect(initialReport).not.toContain('<select name="decision">');
    expect(initialReport).not.toContain("Latest decision");
    expect(initialReport).not.toContain("Feedback history");
    expect(existsSync(reportPath)).toBe(true);
    const reportAuthUrl = server.withAuth(`/studio/handoff/${readHumanReviewHandoffId(workspace)}`);

    const reportResp = await fetch(reportAuthUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "accept",
        feedback: "Looks good. Keep the infographic format and make the decisions clearer.",
      }),
    });
    expect(reportResp.status).toBe(303);
    expect(reportResp.headers.get("location")).toContain("/studio/handoff/");

    const storedHtml = readFileSync(reportPath, "utf8");
    expect(storedHtml).not.toContain("<!doctype html>");
    expect(storedHtml).not.toContain('<main class="shell">');
    expect(storedHtml).not.toContain('class="layout"');
    expect(storedHtml).not.toContain('<form');
    expect(storedHtml).toContain("manager-report");
    expect(storedHtml).toContain("Proposal narrative");
    expect(storedHtml).toContain("Approved");
    expect(storedHtml).not.toContain("Looks good. Keep the infographic format and make the decisions clearer.");
    expect(existsSync(reportJsonlPath)).toBe(true);
    const reviewLines = readFileSync(reportJsonlPath, "utf8").trim().split("\n");
    expect(reviewLines).toHaveLength(1);
    const reviewEntry = JSON.parse(reviewLines[0]) as any;
    expect(reviewEntry.playbook).toBe("handoff-review");
    expect(reviewEntry.taskId).toBe("manager-report");
    expect(reviewEntry.template).toBe("");
    expect(reviewEntry.reportTitle).toBe("manager-report");
    expect(reviewEntry.decision).toBe("approve");
    const attemptFeedback = readFileSync(attemptFeedbackPath, "utf8");
    expect(attemptFeedback).toContain("FEEDBACK.md — Human Review");
    expect(attemptFeedback).toContain("Approved");
    expect(attemptFeedback).toContain("Looks good. Keep the infographic format and make the decisions clearer.");
    expect(attemptFeedback).toContain("Existing attempt context.");

    await server.close();
    server = await createAddStudioServer({
      projectDir: workspace,
      port: 0,
      plannerAgentfn: stubPlannerAgentFactory(),
    });
    const reportAfterRestart = await fetch(server.withAuth(`/studio/handoff/${readHumanReviewHandoffId(workspace)}`)).then((r) => r.text());
    expect(reportAfterRestart).toContain("Human review report");
    expect(reportAfterRestart).toContain("manager-report");
    expect(reportAfterRestart).toContain("Proposal narrative");
    expect(reportAfterRestart).not.toContain("Latest decision");
    expect(reportAfterRestart).not.toContain("Feedback history");
    },
    20_000,
  );
});

function readHumanReviewHandoffId(workspace: string): string {
  const handoffDir = join(workspace, ".converge", "ui", "handoffs");
  const entries = readdirSync(handoffDir).filter((name) => name.endsWith(".json"));
  expect(entries.length).toBeGreaterThan(0);
  const handoff = JSON.parse(readFileSync(join(handoffDir, entries[0]), "utf8")) as { id?: string };
  expect(handoff.id).toBeDefined();
  return handoff.id!;
}
