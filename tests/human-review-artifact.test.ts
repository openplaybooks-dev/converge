import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { createAddStudioServer } from "../packages/studio/src/add-ui.ts";

const FIXTURE_PLAYBOOK_DIR = resolve(
  process.cwd(),
  "tests",
  "test-human-review-playbook",
  ".converge",
  "playbooks",
  "handoff-review",
);

describe("framework human review artifact", () => {
  let workspace: string;
  let server: Awaited<ReturnType<typeof createAddStudioServer>> | null = null;

  beforeEach(() => {
    workspace = mkdtempSync(join(tmpdir(), "converge-human-review-"));
    mkdirSync(join(workspace, ".converge"), { recursive: true });
    writeProjectMetadata(workspace);
  });

  afterEach(async () => {
    await server?.close().catch(() => {});
    server = null;
    rmSync(workspace, { recursive: true, force: true });
  });

  it("renders and persists the framework review report as a standalone html page", async () => {
    await cp(
      FIXTURE_PLAYBOOK_DIR,
      join(workspace, ".converge", "playbooks", "handoff-review"),
      { recursive: true },
    );

    server = await createAddStudioServer({
      projectDir: workspace,
      port: 0,
    });

    const runtimeStatePath = join(workspace, ".converge", "ui", "studio-server.json");

    expect(await fetch(server.url).then((r) => r.status)).toBe(401);
    expect(existsSync(runtimeStatePath)).toBe(true);
    const runtimeState = JSON.parse(readFileSync(runtimeStatePath, "utf8")) as any;
    expect(runtimeState.port).toBe(server.port);
    expect(runtimeState.token).toBe(server.token);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warmupReport = await fetch(server.withAuth("/playbooks/handoff-review/tasks/manager-report/report")).then((r) => r.text());
    expect(warmupReport).toContain("<!doctype html>");
    expect(warmupReport).toContain("Human review report");
    const handoffId = readHumanReviewHandoffId(workspace);
    const reportUrl = server.withAuth(`/studio/handoff/${handoffId}`);

    const initialReport = await fetch(reportUrl).then((r) => r.text());
    expect(initialReport).toContain("<!doctype html>");
    expect(initialReport).toContain("Human review report");
    expect(initialReport).toContain("Feedback");
    expect(initialReport).toContain("Accept");
    expect(initialReport).toContain('<main class="shell">');
    expect(initialReport).toContain('class="layout"');
    expect(initialReport).toContain('class="report-shell"');
    expect(initialReport).toContain('name="feedback"');
    expect(initialReport).not.toContain('name="reportTitle"');
    expect(initialReport).not.toContain('name="summary"');
    expect(initialReport).not.toContain('<select name="decision">');
    expect(initialReport).not.toContain("Feedback history");
    expect(initialReport).toContain('<meta name="viewport"');
    const logText = logSpy.mock.calls.map((call) => call.join(" ")).join("\n");
    expect(logText).toContain("[human-review] review URL:");
    expect(logText).toContain("[human-review] artifact:");
    expect(logText).toContain("/studio/handoff/");
    expect(logText).toContain(".converge/inventory/handoff-review/reports/manager-report.html");
    expect(logText).not.toContain("browser:");
    expect(logText).not.toContain("cli:");

    const submitResp = await fetch(reportUrl, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "accept",
        feedback: "Keep the layout strong and preserve the feedback trail.",
      }),
    });
    expect(submitResp.status).toBe(303);

    const storedHtmlPath = join(
      workspace,
      ".converge",
      "inventory",
      "handoff-review",
      "reports",
      "manager-report.html",
    );
    expect(existsSync(storedHtmlPath)).toBe(true);

    const storedHtml = readFileSync(storedHtmlPath, "utf8");
    expect(storedHtml).not.toContain("<!doctype html>");
    expect(storedHtml).not.toContain('<main class="shell">');
    expect(storedHtml).not.toContain('class="layout"');
    expect(storedHtml).not.toContain('<form');
    expect(storedHtml).toContain("Weekly employee report");
    expect(storedHtml).toContain("Proposal narrative");
    expect(storedHtml).toContain("Approved");

    await server.close();
    expect(existsSync(runtimeStatePath)).toBe(false);
    server = await createAddStudioServer({
      projectDir: workspace,
      port: 0,
    });

    const reportAfterRestart = await fetch(server.withAuth(`/studio/handoff/${handoffId}`)).then((r) => r.text());
    expect(reportAfterRestart).toContain("Human review report");
    expect(reportAfterRestart).toContain("Weekly employee report");
    expect(reportAfterRestart).toContain("Proposal narrative");
    expect(reportAfterRestart).toContain(storedHtml.trim());
    logSpy.mockRestore();
  });
});

function writeProjectMetadata(workspace: string) {
  writeFileSync(
    join(workspace, ".converge", "project.yaml"),
    "name: test-project\n",
    "utf8",
  );
}

function readHumanReviewHandoffId(workspace: string): string {
  const handoffDir = join(workspace, ".converge", "ui", "handoffs");
  const entries = readdirSync(handoffDir).filter((name) => name.endsWith(".json"));
  expect(entries.length).toBeGreaterThan(0);
  const handoff = JSON.parse(readFileSync(join(handoffDir, entries[0]), "utf8")) as { id?: string };
  expect(handoff.id).toBeDefined();
  return handoff.id!;
}
