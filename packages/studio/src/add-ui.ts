import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  mkdir,
  readdir,
  readFile,
  rm,
  rename,
  writeFile,
  cp,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

import { plan, type PlanOptions } from "@openplaybooks/converge-core";
import {
  discoverPlaybooks,
} from "@openplaybooks/converge-core/task/playbook";
import {
  ensureHumanReviewHandoff,
  getHumanReviewHandoffRoute,
  loadHumanReviewHandoffById,
} from "@openplaybooks/converge-core/task/review";
import {
  loadPlaybookFromFolder,
} from "@openplaybooks/converge-core/playbook";
import templateCatalog from "./add-ui-templates.json";
import { createHtmlServerManager, readHtmlServerState } from "./html-server-manager.ts";

const execFileAsync = promisify(execFile);

type PlannerAgentFactory = NonNullable<PlanOptions["plannerAgentfn"]>;

type SessionStatus =
  | "idle"
  | "planning"
  | "awaiting-feedback"
  | "publishing"
  | "published"
  | "failed";

type HumanDecision = "approve" | "revise" | "reject";

interface FeedbackEntry {
  ts: string;
  message: string;
}

interface HumanReviewEntry {
  ts: string;
  playbook: string;
  taskId: string;
  template: string;
  summary: string;
  decision: HumanDecision;
  feedback: string;
  reportTitle: string;
}

interface StudioSession {
  id: string;
  projectDir: string;
  name: string;
  templateId?: string;
  templateLabel?: string;
  playbookInstruction?: string;
  goal: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
  status: SessionStatus;
  draftDir: string;
  workDir?: string;
  finalDir: string;
  lastError?: string;
  feedback: FeedbackEntry[];
  activeRun?: Promise<void> | null;
  rerunRequested?: boolean;
}

interface PlannerSessionSnapshot {
  id: string;
  name: string;
  status: SessionStatus;
  revision: number;
  updatedAt: string;
  draftDir: string;
  finalDir: string;
  lastError?: string;
  feedback: FeedbackEntry[];
}

interface StudioOptions {
  projectDir: string;
  port?: number;
  host?: string;
  openBrowser?: boolean;
  plannerAgentfn?: PlannerAgentFactory;
}

interface StudioServer {
  url: string;
  authUrl: string;
  token: string;
  withAuth(path?: string): string;
  close(): Promise<void>;
}

const SESSIONS_DIR = join(".converge", "ui", "add");

type TemplateSpec = {
  id: string;
  label: string;
  workflowInstruction: string[];
};

function findTemplateSpec(templateId: string | undefined): TemplateSpec | undefined {
  if (templateId === undefined) return undefined;
  for (const group of templateCatalog.templateGroups) {
    const match = group.templates.find((template) => template.id === templateId);
    if (match) return match;
  }
  return undefined;
}

function resolveTemplateSpec(templateValue: string | undefined): TemplateSpec | undefined {
  const trimmed = templateValue?.trim();
  if (!trimmed) return undefined;
  const byId = findTemplateSpec(trimmed);
  if (byId) return byId;
  for (const group of templateCatalog.templateGroups) {
    const match = group.templates.find((template) => template.label === trimmed);
    if (match) return match;
  }
  return undefined;
}

const TEMPLATE_GROUPS: Array<{
  label: string;
  templates: TemplateSpec[];
}> = templateCatalog.templateGroups.map((group) => ({
      label: group.label,
      templates: group.templates.map((template) => ({
        id: template.id,
        label: template.label,
        workflowInstruction: template.workflowInstruction,
    })),
  }));

const announcedHumanReviewArtifacts = new Set<string>();

export async function runAddStudio(options: StudioOptions): Promise<void> {
  const server = await createAddStudioServer(options);
  console.log(`\n🌐 Browser studio running at ${server.authUrl}`);
  console.log("   Press Ctrl-C to stop.\n");

  if (options.openBrowser !== false) {
    await tryOpenBrowser(server.authUrl).catch(() => {});
  }

  await new Promise<void>((resolveStop) => {
    let closed = false;
    const stop = async () => {
      if (closed) return;
      closed = true;
      await server.close().catch(() => {});
      resolveStop();
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    process.once("SIGHUP", stop);
  });
}

export async function createAddStudioServer(
  options: StudioOptions,
): Promise<StudioServer> {
  const projectDir = resolve(options.projectDir);
  const rootDir = join(projectDir, SESSIONS_DIR);
  await mkdir(rootDir, { recursive: true });

  const sessions = new Map<string, StudioSession>();
  await loadSessionsFromDisk(rootDir, sessions);
  const manager = await createHtmlServerManager({
    projectDir,
    port: options.port,
    host: options.host,
    onRequest: async ({ req, res }) => {
      await handleRequest({
        req,
        res,
        projectDir,
        rootDir,
        sessions,
        plannerAgentfn: options.plannerAgentfn,
      }).catch((err: any) => {
        sendHtml(
          res,
          500,
          renderLayout("Converge Studio", [
            `<section class="panel error"><h1>Server error</h1><pre>${escapeHtml(err?.stack || err?.message || String(err))}</pre></section>`,
          ]),
        );
      });
    },
    onUnauthorized: ({ res }) => {
      sendHtml(
        res,
        401,
        renderLayout("Unauthorized", [
          panel("Unauthorized", "Open the browser studio with the authenticated URL or provide the access token."),
        ]),
      );
    },
  });

  return manager;
}

async function handleRequest(args: {
  req: IncomingMessage;
  res: ServerResponse;
  projectDir: string;
  rootDir: string;
  sessions: Map<string, StudioSession>;
  plannerAgentfn?: PlannerAgentFactory;
}): Promise<void> {
  const { req, res, projectDir, rootDir, sessions, plannerAgentfn } = args;
  const method = (req.method || "GET").toUpperCase();
  const url = new URL(req.url || "/", "http://127.0.0.1");
  const path = url.pathname;

  if (method === "GET" && path === "/help") {
    const view = await buildHelpView();
    sendHtml(res, 200, renderLayout("Planner help", view));
    return;
  }

  if (method === "GET" && path === "/") {
    const view = await buildHomeView(projectDir, rootDir, sessions);
    sendHtml(res, 200, renderLayout("Converge Studio", view));
    return;
  }

  if (method === "POST" && path === "/api/sessions") {
    const body = await readForm(req);
    const goal = body.goal?.trim();
    const playbookInstruction = body.playbookInstruction?.trim() || "";
    const templateValue = body.template?.trim() || "";
    const name = body.name?.trim() || slugify(body.goal || "plan");
    if (!goal) {
      sendJson(res, 400, { error: "goal is required" });
      return;
    }
    const template = resolveTemplateSpec(templateValue);
    const session = await createSession(rootDir, sessions, {
      goal,
      name,
      projectDir,
      playbookInstruction,
      templateId: template?.id ?? templateValue,
      templateLabel: template?.label ?? (templateValue || undefined),
    });
    void schedulePlanning(session, plannerAgentfn, sessions, rootDir);
    sendJson(res, 201, {
      id: session.id,
      url: `/sessions/${session.id}`,
      status: session.status,
    });
    return;
  }

  if (method === "POST" && path === "/sessions") {
    const body = await readForm(req);
    const goal = body.goal?.trim();
    const playbookInstruction = body.playbookInstruction?.trim() || "";
    const templateValue = body.template?.trim() || "";
    const name = body.name?.trim() || slugify(body.goal || "plan");
    if (!goal) {
      sendHtml(
        res,
        400,
        renderLayout("Converge Studio", [panel("Missing goal", "Goal is required.")]),
      );
      return;
    }
    const template = resolveTemplateSpec(templateValue);
    const session = await createSession(rootDir, sessions, {
      goal,
      name,
      projectDir,
      playbookInstruction,
      templateId: template?.id ?? templateValue,
      templateLabel: template?.label ?? (templateValue || undefined),
    });
    void schedulePlanning(session, plannerAgentfn, sessions, rootDir);
    redirect(res, `/sessions/${session.id}`);
    return;
  }

  if (method === "GET" && path.startsWith("/sessions/")) {
    const sessionId = path.split("/")[2];
    const session = sessions.get(sessionId);
    if (!session) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown session.")]));
      return;
    }
    const view = await buildSessionView(session, projectDir);
    const refresh = session.status === "planning" || session.status === "publishing";
    sendHtml(res, 200, renderLayout(`Plan · ${escapeHtml(session.name)}`, view, refresh));
    return;
  }

  if (method === "GET" && path.startsWith("/api/sessions/") && path.endsWith("/status")) {
    const sessionId = path.split("/")[3];
    const session = sessions.get(sessionId);
    if (!session) {
      sendJson(res, 404, { error: "not found" });
      return;
    }
    sendJson(res, 200, await serializeSession(session, projectDir));
    return;
  }

  if (method === "POST" && path.startsWith("/sessions/") && path.endsWith("/feedback")) {
    const sessionId = path.split("/")[2];
    const session = sessions.get(sessionId);
    if (!session) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown session.")]));
      return;
    }
    const body = await readForm(req);
    const feedback = body.feedback?.trim();
    if (!feedback) {
      redirect(res, `/sessions/${session.id}`);
      return;
    }
    await appendFeedback(session, rootDir, feedback);
    void schedulePlanning(session, plannerAgentfn, sessions, rootDir);
    redirect(res, `/sessions/${session.id}`);
    return;
  }

  if (method === "POST" && path.startsWith("/sessions/") && path.endsWith("/accept")) {
    const sessionId = path.split("/")[2];
    const session = sessions.get(sessionId);
    if (!session) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown session.")]));
      return;
    }
    try {
      await publishSession(session);
      redirect(res, `/playbooks/${encodeURIComponent(session.name)}`);
    } catch (err: any) {
      sendHtml(
        res,
        400,
        renderLayout("Publish failed", [
          panel(
            "Could not publish plan",
            `<pre>${escapeHtml(err?.message || String(err))}</pre>`,
          ),
          sessionFooter(session),
        ]),
      );
    }
    return;
  }

  if (method === "POST" && path.startsWith("/studio/handoff/")) {
    const handoffId = decodeURIComponent(path.split("/")[3] || "");
    const handoff = await loadHumanReviewHandoffById(projectDir, handoffId);
    if (!handoff) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown human review page.")]));
      return;
    }
    const body = await readForm(req);
    const review = normalizeHumanReview(body, {
      playbook: handoff.playbook,
      taskId: handoff.taskId,
    });
    await appendHumanReview(projectDir, review);
    await writeHumanReportArtifact(projectDir, handoff.playbook, handoff.taskId);
    redirect(res, `/studio/handoff/${encodeURIComponent(handoff.id)}`);
    return;
  }

  if (method === "POST" && path.startsWith("/playbooks/") && path.endsWith("/report")) {
    const parts = path.split("/");
    const playbook = decodeURIComponent(parts[2] || "");
    const taskId = decodeURIComponent(parts.slice(4, -1).join("/"));
    const body = await readForm(req);
    const review = normalizeHumanReview(body, { playbook, taskId });
    await appendHumanReview(projectDir, review);
    await writeHumanReportArtifact(projectDir, playbook, taskId);
    redirect(
      res,
      `/studio/handoff/${encodeURIComponent((await ensureHumanReviewHandoff(projectDir, playbook, taskId)).id)}`,
    );
    return;
  }

  if (method === "GET" && path.startsWith("/studio/handoff/")) {
    const handoffId = decodeURIComponent(path.split("/")[3] || "");
    const handoff = await loadHumanReviewHandoffById(projectDir, handoffId);
    if (!handoff) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown human review page.")]));
      return;
    }
    const report = await loadOrCreateHumanReportArtifact(projectDir, handoff.playbook, handoff.taskId);
    if (!report) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown human review page.")]));
      return;
    }
    sendHtml(
      res,
      200,
      renderHumanReviewPageHtml({
        playbook: handoff.playbook,
        taskId: handoff.taskId,
        reportContentHtml: report,
        submitPath: path,
      }),
    );
    return;
  }

  if (method === "GET" && path.startsWith("/playbooks/")) {
    const name = decodeURIComponent(path.split("/")[2] || "");
    const tail = path.split("/").slice(3).join("/");
    if (tail === "run") {
      const view = await buildRunView(projectDir, name);
      if (!view) {
        sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown run state.")]));
        return;
      }
      sendHtml(res, 200, renderLayout(`Run · ${escapeHtml(name)}`, view, true));
      return;
    }
    if (tail.startsWith("tasks/") && tail.endsWith("/report")) {
      const taskId = decodeURIComponent(tail.slice("tasks/".length, -"/report".length));
      const report = await loadOrCreateHumanReportArtifact(projectDir, name, taskId);
      if (!report) {
        sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown human review page.")]));
        return;
      }
      sendHtml(
        res,
        200,
        renderHumanReviewPageHtml({
          playbook: name,
          taskId,
          reportContentHtml: report,
          submitPath: path,
        }),
      );
      return;
    }
    const view = await buildPlaybookView(projectDir, name);
    if (!view) {
      sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown playbook.")]));
      return;
    }
    sendHtml(res, 200, renderLayout(`Playbook · ${escapeHtml(name)}`, view));
    return;
  }

  sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "The requested page does not exist.")]));
}

async function createSession(
  rootDir: string,
  sessions: Map<string, StudioSession>,
  opts: {
    goal: string;
    name: string;
    projectDir: string;
    playbookInstruction?: string;
    templateId?: string;
    templateLabel?: string;
  },
): Promise<StudioSession> {
  const id = randomUUID();
  const sessionDir = join(rootDir, id);
  const draftDir = join(sessionDir, "draft");
  const finalDir = join(opts.projectDir, ".converge", "playbooks", opts.name);
  const session: StudioSession = {
    id,
    projectDir: opts.projectDir,
    name: opts.name,
    templateId: opts.templateId,
    templateLabel: opts.templateLabel,
    playbookInstruction: opts.playbookInstruction,
    goal: opts.goal,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    revision: 0,
    status: "idle",
    draftDir,
    finalDir,
    feedback: [],
    activeRun: null,
    rerunRequested: true,
  };
  sessions.set(id, session);
  await persistSession(rootDir, session);
  return session;
}

async function appendFeedback(
  session: StudioSession,
  rootDir: string,
  feedback: string,
): Promise<void> {
  session.feedback.push({ ts: new Date().toISOString(), message: feedback });
  session.updatedAt = new Date().toISOString();
  session.rerunRequested = true;
  await persistSession(rootDir, session);
  await appendFeedbackEntry(rootDir, session.id, feedback);
}

async function schedulePlanning(
  session: StudioSession,
  plannerAgentfn: PlannerAgentFactory | undefined,
  sessions: Map<string, StudioSession>,
  rootDir: string,
): Promise<void> {
  session.rerunRequested = true;
  if (session.activeRun) return session.activeRun;

  const running = (async () => {
    while (session.rerunRequested) {
      session.rerunRequested = false;
      await performPlanning(session, plannerAgentfn, sessions);
    }
  })().catch(async (err: any) => {
    session.status = "failed";
    session.lastError = err?.message || String(err);
    session.updatedAt = new Date().toISOString();
    await persistSession(rootDir, session);
  });

  session.activeRun = running.finally(() => {
    session.activeRun = null;
  });
  return session.activeRun;
}

async function performPlanning(
  session: StudioSession,
  plannerAgentfn: PlannerAgentFactory | undefined,
  sessions: Map<string, StudioSession>,
): Promise<void> {
  const rootDir = join(session.projectDir, SESSIONS_DIR);
  const runDir = join(
    rootDir,
    session.id,
    "runs",
    `rev-${String(session.revision + 1).padStart(2, "0")}`,
  );
  const hasDraft = existsSync(session.draftDir);
  session.status = "planning";
  session.workDir = runDir;
  session.lastError = undefined;
  session.updatedAt = new Date().toISOString();
  await persistSession(rootDir, session);

  await rm(runDir, { recursive: true, force: true });
  await mkdir(runDir, { recursive: true });
  if (hasDraft) {
    await cp(session.draftDir, runDir, { recursive: true });
  }
  await rm(join(session.projectDir, ".converge", "inventory"), {
    recursive: true,
    force: true,
  });

  const goal = buildPlannerPrompt(session);
  const previousOutputDir = process.env.CONVERGE_PLAN_OUTPUT_DIR;
  process.env.CONVERGE_PLAN_OUTPUT_DIR = runDir;
  try {
    await plan({
      goal,
      name: session.name,
      projectDir: session.projectDir,
      outputDir: runDir,
      update: hasDraft,
      plannerAgentfn,
    });

    await sanitizePlaybookYml(runDir);
    await rm(session.draftDir, { recursive: true, force: true });
    await rename(runDir, session.draftDir);
    session.revision += 1;
    session.status = "awaiting-feedback";
    session.updatedAt = new Date().toISOString();
    session.workDir = undefined;
    await persistSession(rootDir, session);
  } catch (err: any) {
    session.status = "failed";
    session.lastError = err?.message || String(err);
    session.updatedAt = new Date().toISOString();
    session.workDir = runDir;
    await persistSession(rootDir, session);
    sessions.set(session.id, session);
  } finally {
    if (previousOutputDir === undefined) {
      delete process.env.CONVERGE_PLAN_OUTPUT_DIR;
    } else {
      process.env.CONVERGE_PLAN_OUTPUT_DIR = previousOutputDir;
    }
  }
}

async function publishSession(session: StudioSession): Promise<void> {
  const src = session.draftDir;
  if (!existsSync(src)) {
    throw new Error("No accepted draft exists yet.");
  }
  if (session.activeRun) {
    throw new Error("The planner is still running.");
  }
  if (existsSync(session.finalDir)) {
    throw new Error(
      `Playbook "${session.name}" already exists at ${session.finalDir}. Remove it or choose a different name.`,
    );
  }
  session.status = "publishing";
  session.updatedAt = new Date().toISOString();
  await persistSession(join(session.projectDir, SESSIONS_DIR), session);
  await mkdir(join(session.projectDir, ".converge", "playbooks"), { recursive: true });
  await cp(src, session.finalDir, { recursive: true });
  session.status = "published";
  session.updatedAt = new Date().toISOString();
  await persistSession(join(session.projectDir, SESSIONS_DIR), session);
}

function buildPlannerPrompt(session: StudioSession): string {
  const lines: string[] = [];
  const template = findTemplateSpec(session.templateId);
  if (template && template.id !== "") {
    lines.push(`Workflow template: ${template.label}`);
    lines.push(template.workflowInstruction.join("\n\n"));
    lines.push("");
  } else if (session.templateLabel?.trim()) {
    lines.push(`Workflow template: ${session.templateLabel.trim()}`);
    lines.push(
      "Treat the workflow text as the playbook shape and keep it separate from the goal or app description.",
    );
    lines.push("");
  }
  if (session.playbookInstruction?.trim()) {
    lines.push("Playbook instruction:");
    lines.push(session.playbookInstruction.trim());
    lines.push("");
  }
  lines.push(session.goal.trim());
  if (session.feedback.length > 0) {
    lines.push("", "User feedback so far:");
    for (const item of session.feedback) {
      lines.push(`- ${item.ts}: ${item.message}`);
    }
  }
  lines.push("", "The plan should be revisable in the browser.");
  return lines.join("\n");
}

async function buildHomeView(
  projectDir: string,
  rootDir: string,
  sessions: Map<string, StudioSession>,
): Promise<string[]> {
  return [
    `<section class="compose-shell">
      <div class="compose-intro">
        <div class="eyebrow">Converge</div>
        <h1>Playbook planner</h1>
        <p class="lede">Choose the playbook shape first, then describe the app or outcome it should produce.</p>
      </div>
      <form method="post" action="/sessions" class="compose-card stack">
        <div class="compose-section compose-panel">
          <span class="section-kicker">How</span>
          <div class="compose-stack-left">
            <label class="template-select-field">
              <span>Template</span>
              <div class="template-select-shell">
                <select
                  name="template"
                  data-template-select
                >
                  ${TEMPLATE_GROUPS.map(
                    (group) => `
                      <optgroup label="${escapeHtml(group.label)}">
                        ${group.templates
                          .map(
                            (template) =>
                              `<option value="${escapeHtml(template.id)}" data-instruction="${escapeHtml(template.workflowInstruction.join("\n\n"))}">${escapeHtml(template.label)}</option>`,
                          )
                          .join("")}
                      </optgroup>`,
                    ).join("")}
                </select>
              </div>
            </label>
            <label class="playbook-field">
              <span>Playbook instruction</span>
              <textarea
                name="playbookInstruction"
                rows="2"
                placeholder="Describe how this playbook should be structured and what it should prioritize"
                data-autoresize
                data-template-instruction
              ></textarea>
            </label>
          </div>
        </div>
        <div class="compose-section compose-panel">
          <span class="section-kicker">What</span>
          <label class="prompt-field">
            <span>Goal / app description</span>
            <textarea
              name="goal"
              rows="2"
              placeholder="Describe the app, workflow, or outcome you want the playbook to produce"
              data-template-prompt
              data-autoresize
            ></textarea>
          </label>
        </div>
        <div class="compose-actions">
          <p class="hint">The workflow shapes the playbook. The goal tells it what to build.</p>
          <button type="submit">Start plan</button>
        </div>
      </form>
      <p class="help-link help-link-bottom"><a href="/help">How this planner works</a></p>
    </section>`,
    `<script>
      (() => {
        const select = document.querySelector('[data-template-select]');
        const instruction = document.querySelector('[data-template-instruction]');
        if (!(select instanceof HTMLSelectElement)) return;

        const resize = (field) => {
          if (!(field instanceof HTMLTextAreaElement)) return;
          const styles = getComputedStyle(field);
          const lineHeight = Number.parseFloat(styles.lineHeight) || 24;
          const borderY =
            Number.parseFloat(styles.borderTopWidth) +
            Number.parseFloat(styles.borderBottomWidth);
          const paddingY =
            Number.parseFloat(styles.paddingTop) +
            Number.parseFloat(styles.paddingBottom);
          const maxHeight = lineHeight * 10 + paddingY + borderY;
          field.style.height = "0px";
          const nextHeight = Math.min(field.scrollHeight + borderY, maxHeight);
          field.style.height = \`\${nextHeight}px\`;
          field.style.overflowY = field.scrollHeight + borderY > maxHeight ? "auto" : "hidden";
        };

        const fields = document.querySelectorAll('textarea[data-autoresize]');
        fields.forEach((field) => {
          if (!(field instanceof HTMLTextAreaElement)) return;
          const sync = () => resize(field);
          field.addEventListener("input", sync);
          sync();
        });

        const applyTemplate = () => {
          if (!(instruction instanceof HTMLTextAreaElement)) return;
          const option = select.selectedOptions[0];
          const nextValue = option?.dataset.instruction ?? "";
          instruction.value = nextValue;
          instruction.dispatchEvent(new Event("input", { bubbles: true }));
        };

        select.addEventListener("change", applyTemplate);
        applyTemplate();
      })();
    </script>`,
  ];
}

async function buildSessionView(
  session: StudioSession,
  projectDir: string,
): Promise<string[]> {
  const data = await serializeSession(session, projectDir);
  const playbook = await loadDraftPlaybook(session).catch(() => null);
  const reportUrl = `/playbooks/${encodeURIComponent(session.name)}/tasks/manager-report/report`;
  const published = existsSync(session.finalDir);
  const feed = buildSessionFeed(session, data.planMarkdown, playbook, {
    reportUrl,
    published,
  });

  return [
    `<section class="hero compact">
      <div>
        <div class="eyebrow">Planner feed</div>
        <h1>${escapeHtml(session.name)}</h1>
        <p class="lede">${escapeHtml(shorten(session.goal, 180))}</p>
      </div>
      <div class="status-stack">
        <div class="badge ${session.status}">${escapeHtml(session.status)}</div>
        <div class="metric">Revision <strong>${session.revision}</strong></div>
        <div class="metric">Feedback <strong>${session.feedback.length}</strong></div>
      </div>
    </section>`,
    `<section class="feed-layout">
      <div class="feed-column">
        ${feed}
      </div>
      <aside class="topology-rail">
        ${panel(
          "Planner topology",
          renderPlannerLifecycle({
            status: session.status,
            lastError: session.lastError,
            mode: "session",
          }),
        )}
        ${panel(
          "Outputs",
          renderPlannerOutputs({
            mode: "session",
            playbookName: session.name,
            sessionId: session.id,
            draftDir: session.draftDir,
            finalDir: session.finalDir,
            status: session.status,
            reportUrl,
            published,
          }),
        )}
        ${panel(
          "Feedback loop",
          `<form method="post" action="/sessions/${session.id}/feedback" class="stack">
            <label>
              <span>Reply to the thread</span>
              <textarea name="feedback" rows="6" placeholder="Comment on the latest post, call out loops, ask for a split, or flag unclear work."></textarea>
            </label>
            <button type="submit">Post reply</button>
          </form>`,
        )}
        ${panel(
          "Publish",
          `<form method="post" action="/sessions/${session.id}/accept">
            <button type="submit" ${session.status === "planning" ? "disabled" : ""}>Publish playbook</button>
          </form>
          <p class="hint">Publishing copies the approved draft into <code>.converge/playbooks/${escapeHtml(session.name)}</code>.</p>`,
        )}
      </aside>
    </section>`,
    `<section class="footnote">
      <a href="/">Back to studio home</a>
      <span>Session:</span> <code>${escapeHtml(session.id)}</code>
    </section>`,
  ];
}

async function buildHelpView(): Promise<string[]> {
  return [
    `<section class="compose-shell">
      <div class="compose-intro">
        <h1>How the planner works</h1>
        <p class="lede">Use the planner in two parts: the left side describes how the playbook should behave, and the right side describes what you want the playbook to produce.</p>
      </div>
      <section class="compose-card stack help-page">
        ${panel(
          "A quick mental model",
          `<div class="help-flow">
            <div class="help-node">
              <span class="help-tag">How</span>
              <strong>Playbook workflow</strong>
              <span>Pick a template like research or app building.</span>
            </div>
            <div class="help-arrow">→</div>
            <div class="help-node">
              <span class="help-tag">How</span>
              <strong>Playbook instruction</strong>
              <span>Add constraints, priorities, or preferred structure.</span>
            </div>
            <div class="help-arrow">→</div>
            <div class="help-node highlight">
              <span class="help-tag">What</span>
              <strong>Goal / app description</strong>
              <span>Describe the app, outcome, or question to solve.</span>
            </div>
          </div>
          <p class="help-copy help-note">The planner turns those three pieces into a draft playbook you can revise in the browser.</p>`,
        )}
        ${panel(
          "What is a playbook?",
          `<div class="stack">
            <p class="help-copy">A playbook is the workflow the planner should follow. It defines the structure, tasks, and priorities before the goal is turned into work.</p>
            <div class="help-example">
              <strong>Think of it as the plan for planning</strong>
              <span>The playbook tells the planner whether it should research first, build first, split work into catalogs, or spawn dynamic tasks.</span>
            </div>
          </div>`,
        )}
        ${panel(
          "How the fields map",
          `<div class="stack">
            <div class="help-row"><strong>Template select</strong><span>Choose the playbook shape. This is the starting scaffold.</span></div>
            <div class="help-row"><strong>Playbook instruction</strong><span>Tell the planner how to interpret the shape, what to prioritize, and what to avoid.</span></div>
            <div class="help-row"><strong>Goal / app description</strong><span>Describe the thing you want the playbook to produce, build, or investigate.</span></div>
          </div>`,
        )}
        ${panel(
          "Examples",
          `<div class="help-cases">
            <div class="help-case">
              <span class="help-tag">Research</span>
              <strong>Workflow</strong>
              <span>Deep research</span>
              <strong>Instruction</strong>
              <span>Track sources, compare claims, and keep the structure focused on evidence.</span>
              <strong>Goal</strong>
              <span>“Investigate the best workflow for remote-first product teams.”</span>
            </div>
            <div class="help-case">
              <span class="help-tag">Build app</span>
              <strong>Workflow</strong>
              <span>Build Flutter app</span>
              <strong>Instruction</strong>
              <span>Prefer mobile-first screens, reusable widgets, and tests around key flows.</span>
              <strong>Goal</strong>
              <span>“Build a family expense tracker with categories, recurring items, and simple reports.”</span>
            </div>
          </div>`,
        )}
        ${panel(
          "What happens next?",
          `<div class="stack">
            <div class="help-row"><strong>1. Combine</strong><span>The planner merges the selected workflow, your instruction, and your goal into one prompt.</span></div>
            <div class="help-row"><strong>2. Structure</strong><span>It uses that prompt to draft tasks, templates, catalogs, spawn rules, and helper scripts.</span></div>
            <div class="help-row"><strong>3. Review</strong><span>You can revise the plan in the browser before publishing the playbook.</span></div>
          </div>`,
        )}
        <p class="help-back"><a href="/">Back to planner</a></p>
      </section>
    </section>`,
  ];
}

async function buildDraftPreview(session: StudioSession): Promise<string | null> {
  const pb = await loadDraftPlaybook(session);
  if (!pb) return null;
  const taskRows = pb.def.tasks
    .map((task) => {
      const deps = task.depends_on?.length ? task.depends_on.join(", ") : "none";
      return `<div class="task-row">
        <div class="task-id">${escapeHtml(task.id || task.path || "task")}</div>
        <div class="task-meta">${escapeHtml(deps)}</div>
      </div>`;
    })
    .join("");

  return panel(
    "Draft playbook structure",
    `<div class="task-grid">${taskRows || `<div class="empty">No tasks yet.</div>`}</div>`,
  );
}

async function loadDraftPlaybook(session: StudioSession) {
  if (!existsSync(session.draftDir)) return null;
  return await loadPlaybookFromFolder(session.draftDir);
}

function buildSessionFeed(
  session: StudioSession,
  planMarkdown: string,
  playbook: Awaited<ReturnType<typeof loadDraftPlaybook>> | null,
  args: { reportUrl: string; published: boolean },
): string {
  const template = session.templateLabel || session.templateId || "Blank";
  const instruction = session.playbookInstruction?.trim() || "No playbook instruction supplied.";
  const feedbackItems = session.feedback.length
    ? session.feedback
        .map(
          (entry, index) => `<article class="reply-card">
            <div class="reply-meta">
              <span class="reply-index">Reply ${index + 1}</span>
              <span class="reply-time">${escapeHtml(entry.ts)}</span>
            </div>
            <p>${escapeHtml(entry.message)}</p>
          </article>`,
        )
        .join("")
    : `<div class="empty">No replies yet. Use the sidebar to post the next planning comment.</div>`;

  const taskThread = playbook?.def.tasks?.length
    ? `<div class="thread">
        ${playbook.def.tasks
          .map((task, index) => {
            const deps = task.depends_on?.length ? task.depends_on.join(", ") : "none";
            return `<div class="reply-card nested">
              <div class="reply-meta">
                <span class="reply-index">Task ${index + 1}</span>
                <span class="reply-time">${escapeHtml(deps)}</span>
              </div>
              <strong>${escapeHtml(task.id || task.path || "task")}</strong>
              <p>${escapeHtml(task.title || "Planner task")}</p>
            </div>`;
          })
          .join("")}
      </div>`
    : `<div class="empty">Draft tasks will appear here once the planner generates a playbook.</div>`;

  return `
    <article class="feed-post">
      <div class="feed-post-head">
        <div>
          <div class="feed-kicker">Planner prompt</div>
          <h2>${escapeHtml(session.name)}</h2>
        </div>
        <div class="feed-chip-row">
          <span class="feed-chip">${escapeHtml(template)}</span>
          <span class="feed-chip">Revision ${session.revision}</span>
          <span class="feed-chip">${escapeHtml(session.status)}</span>
        </div>
      </div>
      <div class="feed-body">
        <p>${escapeHtml(shorten(session.goal, 240))}</p>
        <div class="feed-block">
          <div class="feed-label">Playbook instruction</div>
          <pre>${escapeHtml(instruction)}</pre>
        </div>
      </div>
      <div class="feed-footer">
        <a href="${escapeHtml(args.reportUrl)}">${args.published ? "Open review artifact" : "Review artifact after publish"}</a>
        <a href="/sessions/${session.id}">Permalink</a>
      </div>
    </article>

    <article class="feed-post">
      <div class="feed-post-head">
        <div>
          <div class="feed-kicker">Draft playbook</div>
          <h2>Task topology and output</h2>
        </div>
        <div class="feed-chip-row">
          <span class="feed-chip">${playbook ? `${playbook.def.tasks.length} tasks` : "No draft yet"}</span>
        </div>
      </div>
      <div class="feed-body">
        <div class="feed-block">
          <div class="feed-label">Plan artifact</div>
          <pre class="plan-md">${escapeHtml(planMarkdown || "Planner output will appear here.")}</pre>
        </div>
        <div class="feed-block">
          <div class="feed-label">Subtasks</div>
          ${taskThread}
        </div>
      </div>
    </article>

    <article class="feed-post">
      <div class="feed-post-head">
        <div>
          <div class="feed-kicker">Feedback thread</div>
          <h2>Human replies and loops</h2>
        </div>
        <div class="feed-chip-row">
          <span class="feed-chip">${session.feedback.length} replies</span>
          <span class="feed-chip">Loop ${session.revision}</span>
        </div>
      </div>
      <div class="feed-body">
        <div class="thread">${feedbackItems}</div>
      </div>
    </article>
  `;
}

function buildPlaybookFeed(
  playbook: Awaited<ReturnType<typeof loadDraftPlaybook>>,
  name: string,
  session: PlannerSessionSnapshot | null,
  args: { reportUrl: string; runUrl: string; journalExists: boolean },
): string {
  const taskThread = playbook.def.tasks.length
    ? `<div class="thread">
        ${playbook.def.tasks
          .map((task, index) => {
            const deps = task.depends_on?.length ? task.depends_on.join(", ") : "none";
            return `<div class="reply-card nested">
              <div class="reply-meta">
                <span class="reply-index">Task ${index + 1}</span>
                <span class="reply-time">${escapeHtml(deps)}</span>
              </div>
              <strong>${escapeHtml(task.id || task.path || "task")}</strong>
              <p>${escapeHtml(task.title || "Planner task")}</p>
            </div>`;
          })
          .join("")}
      </div>`
    : `<div class="empty">No tasks are defined yet.</div>`;
  const latestStatus = session?.status || "published";
  const latestRevision = session?.revision || 0;
  const latestFeedback = session?.feedback.length || 0;

  return `
    <article class="feed-post">
      <div class="feed-post-head">
        <div>
          <div class="feed-kicker">Published plan</div>
          <h2>${escapeHtml(name)}</h2>
        </div>
        <div class="feed-chip-row">
          <span class="feed-chip">${escapeHtml(latestStatus)}</span>
          <span class="feed-chip">Revision ${latestRevision}</span>
          <span class="feed-chip">${playbook.def.tasks.length} tasks</span>
        </div>
      </div>
      <div class="feed-body">
        <p>${escapeHtml(playbook.def.description || "No description provided.")}</p>
        <div class="feed-block">
          <div class="feed-label">Topology</div>
          ${taskThread}
        </div>
      </div>
      <div class="feed-footer">
        <a href="${escapeHtml(args.reportUrl)}">Open review artifact</a>
        <a href="${escapeHtml(args.runUrl)}">Open run dashboard</a>
      </div>
    </article>

    <article class="feed-post">
      <div class="feed-post-head">
        <div>
          <div class="feed-kicker">Review thread</div>
          <h2>Human-in-the-loop artifact</h2>
        </div>
        <div class="feed-chip-row">
          <span class="feed-chip">${latestFeedback} replies</span>
          <span class="feed-chip">${args.journalExists ? "journal present" : "journal empty"}</span>
        </div>
      </div>
      <div class="feed-body">
        <div class="feed-block">
          <div class="feed-label">Artifact</div>
          <p>Open the persisted HTML report to preview the infographic review and leave feedback.</p>
        </div>
        <div class="feed-block">
        <div class="feed-label">Loop summary</div>
          <p>Finalized from revision ${latestRevision} after ${latestFeedback} feedback ${latestFeedback === 1 ? "reply" : "replies"}.</p>
        </div>
      </div>
    </article>
  `;
}

async function buildPlaybookView(
  projectDir: string,
  name: string,
): Promise<string[] | null> {
  const playbookDir = join(projectDir, ".converge", "playbooks", name);
  if (!existsSync(playbookDir)) return null;
  const pb = await loadPlaybookFromFolder(playbookDir);
  const session = await loadPlannerSessionSnapshot(projectDir, name);
  const taskRows = pb.def.tasks
    .map((task, index) => {
      const deps = task.depends_on?.length ? task.depends_on.join(", ") : "none";
      return `<div class="reply-card nested">
        <div class="reply-meta">
          <span class="reply-index">Task ${index + 1}</span>
          <span class="reply-time">${escapeHtml(deps)}</span>
        </div>
        <strong>${escapeHtml(task.id || task.path || "task")}</strong>
        <p>${escapeHtml(task.title || "Planner task")}</p>
      </div>`;
    })
    .join("");
  const journalDir = join(projectDir, ".converge", "journal", name);
  const journalExists = existsSync(journalDir);
  const reportUrl = `/playbooks/${encodeURIComponent(name)}/tasks/manager-report/report`;
  const feed = buildPlaybookFeed(pb, name, session, {
    reportUrl,
    runUrl: `/playbooks/${encodeURIComponent(name)}/run`,
    journalExists,
  });

  return [
    `<section class="hero compact">
      <div>
        <div class="eyebrow">Published playbook</div>
        <h1>${escapeHtml(name)}</h1>
        <p class="lede">${escapeHtml(pb.def.description || "No description provided.")}</p>
      </div>
      <div class="status-stack">
        <div class="badge published">published</div>
        <div class="metric">Tasks <strong>${pb.def.tasks.length}</strong></div>
        <div class="metric">Journal <strong>${journalExists ? "present" : "none yet"}</strong></div>
      </div>
    </section>`,
    `<section class="feed-layout">
      <div class="feed-column">
        ${feed}
      </div>
      <aside class="topology-rail">
        ${panel(
          "Playbook topology",
          renderPlannerLifecycle({
            status: session?.status ?? "published",
            lastError: session?.lastError,
            mode: "playbook",
          }),
        )}
        ${panel(
          "Outputs",
          renderPlannerOutputs({
            mode: "playbook",
            playbookName: name,
            sessionId: session?.id,
            draftDir: session?.draftDir,
            finalDir: session?.finalDir ?? playbookDir,
            status: session?.status ?? "published",
            reportUrl,
            runUrl: `/playbooks/${encodeURIComponent(name)}/run`,
            published: true,
          }),
        )}
        ${panel(
          "Task threads",
          `<div class="thread">${taskRows || `<div class="empty">No tasks found.</div>`}</div>`,
        )}
        ${panel(
          "Runtime",
          `<div class="stack">
            <div class="empty">Run the playbook from the CLI: <code>converge run --playbook=${escapeHtml(name)}</code></div>
            <div class="empty"><a href="/playbooks/${encodeURIComponent(name)}/run">Open run dashboard</a></div>
          </div>`,
        )}
      </aside>
    </section>`,
    `<section class="footnote"><a href="/">Back to studio home</a></section>`,
  ];
}

async function buildRunView(
  projectDir: string,
  name: string,
): Promise<string[] | null> {
  const runstate = await loadRunstate(projectDir, name);
  if (!runstate) return null;
  const nodes = Object.values(runstate.dag?.nodes ?? {});
  const totals = {
    total: nodes.length,
    pending: nodes.filter((n: any) => n.status === "pending").length,
    running: nodes.filter((n: any) => n.status === "running").length,
    passed: nodes.filter((n: any) => n.status === "pass").length,
    failed: nodes.filter((n: any) => n.status === "error").length,
  };
  const nodeRows = nodes
    .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)))
    .map(
      (node: any) => `<div class="task-row">
        <div>
          <div class="task-id">${escapeHtml(String(node.id))}</div>
          <div class="task-meta">${escapeHtml(
            (node.depends_on ?? []).length ? `depends on ${node.depends_on.join(", ")}` : "root task",
          )}</div>
        </div>
        <div class="badge ${escapeHtml(String(node.status || "pending"))}">${escapeHtml(String(node.status || "pending"))}</div>
      </div>`,
    )
    .join("");

  return [
    `<section class="hero compact">
      <div>
        <div class="eyebrow">Realtime execution</div>
        <h1>${escapeHtml(name)}</h1>
        <p class="lede">Read-only run dashboard from <code>.converge/journal/${escapeHtml(name)}/runstate.json</code>.</p>
      </div>
      <div class="status-stack">
        <div class="metric">Total <strong>${totals.total}</strong></div>
        <div class="metric">Pending <strong>${totals.pending}</strong></div>
        <div class="metric">Running <strong>${totals.running}</strong></div>
        <div class="metric">Passed <strong>${totals.passed}</strong></div>
        <div class="metric">Failed <strong>${totals.failed}</strong></div>
      </div>
    </section>`,
    panel(
      "Run metadata",
      `<div class="stack">
        <div class="metric">Execution id <strong>${escapeHtml(runstate.metadata?.execution_id || "unknown")}</strong></div>
        <div class="metric">Generated <strong>${escapeHtml(runstate.metadata?.generated_at || "unknown")}</strong></div>
        <div class="metric">Status <strong>${escapeHtml(runstate.metadata?.status || "unknown")}</strong></div>
      </div>`,
    ),
    panel("Task list", `<div class="stack">${nodeRows || `<div class="empty">No task nodes found.</div>`}</div>`),
    `<section class="footnote">
      <a href="/playbooks/${encodeURIComponent(name)}">Back to playbook</a>
    </section>`,
  ];
}

async function loadOrCreateHumanReportArtifact(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<string | null> {
  const playbookDir = join(projectDir, ".converge", "playbooks", playbook);
  if (!existsSync(playbookDir)) return null;
  const artifactPath = getHumanReportArtifactPath(projectDir, playbook, taskId);
  if (existsSync(artifactPath)) {
    await announceHumanReviewArtifact(projectDir, playbook, taskId);
    return await readFile(artifactPath, "utf8");
  }
  return await writeHumanReportArtifact(projectDir, playbook, taskId);
}

async function writeHumanReportArtifact(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<string> {
  const reviews = await loadHumanReviews(projectDir, playbook, taskId);
  const html = renderHumanReportContentHtml({
    playbook,
    taskId,
    reviews,
  });
  const artifactPath = getHumanReportArtifactPath(projectDir, playbook, taskId);
  await mkdir(join(projectDir, ".converge", "inventory", playbook, "reports"), {
    recursive: true,
  });
  await writeFile(artifactPath, html, "utf8");
  await announceHumanReviewArtifact(projectDir, playbook, taskId);
  return html;
}

function getHumanReportArtifactPath(
  projectDir: string,
  playbook: string,
  taskId: string,
): string {
  return join(projectDir, ".converge", "inventory", playbook, "reports", `${taskId}.html`);
}

function getHumanReportReviewsPath(
  projectDir: string,
  playbook: string,
  taskId: string,
): string {
  return join(projectDir, ".converge", "inventory", playbook, "reports", `${taskId}.jsonl`);
}

async function announceHumanReviewArtifact(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<void> {
  const key = `${resolve(projectDir)}::${playbook}::${taskId}`;
  if (announcedHumanReviewArtifacts.has(key)) return;
  announcedHumanReviewArtifacts.add(key);

  const artifactPath = getHumanReportArtifactPath(projectDir, playbook, taskId);
  const handoff = await ensureHumanReviewHandoff(projectDir, playbook, taskId);
  const reportPath = getHumanReviewHandoffRoute(handoff.id);
  const state = await readHtmlServerState(projectDir).catch(() => null);
  const reportUrl =
    state && state.token
      ? `${new URL(reportPath, `http://${state.host}:${state.port}`).toString()}?token=${encodeURIComponent(state.token)}`
      : reportPath;

  console.log(
    [
      `[human-review] review URL: ${reportUrl}`,
      `[human-review] artifact: ${artifactPath}`,
    ].join("\n"),
  );
}

function renderHumanReviewPageHtml(args: {
  playbook: string;
  taskId: string;
  reportContentHtml: string;
  submitPath: string;
}): string {
  const contentHtml = args.reportContentHtml;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(args.playbook)} / ${escapeHtml(args.taskId)} report</title>
    ${authCleanupScript()}
    <style>
      ${renderStudioReviewStyles()}
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="hero">
        <div>
          <div class="eyebrow">Human review report</div>
          <h1>${escapeHtml(args.playbook)} / ${escapeHtml(args.taskId)}</h1>
          <p class="lede">Read the report. Leave one feedback note if needed, or accept it as-is.</p>
        </div>
      </section>

      <section class="layout">
        <article class="report-shell">
          ${contentHtml}
        </article>

        <aside class="sidebar">
          <h2 class="section-title">Feedback</h2>
          <form method="post" action="${escapeHtml(args.submitPath)}" class="form">
            <label>
              <span>One feedback note</span>
              <textarea name="feedback" placeholder="What should be clarified, revised, or rejected before this moves forward?"></textarea>
            </label>
            <div class="feed-actions">
              <button type="submit" name="action" value="accept">Accept</button>
              <button type="submit" name="action" value="feedback">Feedback</button>
            </div>
          </form>
        </aside>
      </section>

    </main>
  </body>
</html>`;
}

function renderStudioReviewStyles(): string {
  return `
      :root {
        color-scheme: dark;
        --bg: #050816;
        --bg-2: #0b1120;
        --card: rgba(15, 23, 42, 0.78);
        --card-2: rgba(2, 6, 23, 0.82);
        --line: rgba(148, 163, 184, 0.18);
        --text: #e5eefb;
        --muted: #8ea2bf;
        --accent: #38bdf8;
        --accent-2: #a855f7;
        --good: #22c55e;
        --warn: #f59e0b;
        --bad: #fb7185;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
          sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 28%),
          radial-gradient(circle at top right, rgba(168, 85, 247, 0.14), transparent 24%),
          linear-gradient(180deg, var(--bg), var(--bg-2));
        min-height: 100vh;
      }
      a { color: #9bdaf7; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .shell {
        width: min(1200px, calc(100% - 32px));
        margin: 0 auto;
        padding: 28px 0 40px;
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 10px;
        align-items: start;
        padding: 16px 18px;
        border-radius: 20px;
        background:
          linear-gradient(135deg, rgba(56, 189, 248, 0.09), rgba(168, 85, 247, 0.05)),
          rgba(7, 12, 24, 0.88);
        border: 1px solid var(--line);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
      }
      .eyebrow {
        display: inline-flex;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(125, 211, 252, 0.22);
        color: #bfe8ff;
        background: rgba(56, 189, 248, 0.08);
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 11px;
        font-weight: 700;
      }
      h1 {
        margin: 8px 0 6px;
        font-size: clamp(1.45rem, 3vw, 2.1rem);
        line-height: 1.05;
        letter-spacing: -0.06em;
      }
      .lede {
        margin: 0;
        max-width: 68ch;
        color: var(--muted);
        line-height: 1.55;
        font-size: 0.96rem;
      }
      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 18px;
        margin-top: 18px;
        align-items: start;
      }
      .report-shell,
      .sidebar {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        backdrop-filter: blur(14px);
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.24);
      }
      .report-shell { padding: 22px; }
      .sidebar { padding: 18px; position: sticky; top: 18px; }
      .section-title {
        margin: 0 0 12px;
        font-size: 0.95rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #d8e6fb;
      }
      .summary {
        margin-top: 14px;
        display: grid;
        gap: 12px;
      }
      .summary-block {
        padding: 14px 16px;
        border-radius: 18px;
        background: rgba(2, 6, 23, 0.55);
        border: 1px solid rgba(148, 163, 184, 0.14);
      }
      .summary-block .label {
        margin-bottom: 8px;
        color: var(--muted);
        font-size: 0.88rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .report-body {
        display: grid;
        gap: 10px;
      }
      .report-body h3 {
        margin: 0;
        font-size: 1.25rem;
        letter-spacing: -0.03em;
        color: #f5f9ff;
      }
      .report-body p {
        margin: 0;
        color: #d7e2f1;
        line-height: 1.7;
      }
      .report-body .lead {
        font-size: 1rem;
        color: #e5eefb;
      }
      .checklist {
        margin: 0;
        padding-left: 18px;
        display: grid;
        gap: 8px;
        color: #d6deea;
        line-height: 1.6;
      }
      .form {
        display: grid;
        gap: 12px;
      }
      label {
        display: grid;
        gap: 6px;
        color: #d8e6fb;
        font-size: 0.92rem;
      }
      input, textarea, select, button {
        font: inherit;
        border-radius: 16px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        background: rgba(2, 6, 23, 0.92);
        color: var(--text);
        padding: 13px 14px;
      }
      textarea { min-height: 120px; resize: vertical; }
      .feed-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }
      button {
        cursor: pointer;
        border: 0;
        font-weight: 700;
        padding: 12px 16px;
      }
      button[value="accept"] {
        background: linear-gradient(135deg, #38bdf8, #22c55e);
        color: #04111b;
      }
      button[value="feedback"] {
        background: rgba(148, 163, 184, 0.12);
        color: #e7eef8;
        border: 1px solid rgba(148, 163, 184, 0.22);
      }
      @media (max-width: 900px) {
        .hero,
        .layout { grid-template-columns: 1fr; }
        .sidebar { position: static; }
      }
  `;
}

function renderHumanReportContentHtml(args: {
  playbook: string;
  taskId: string;
  reviews: HumanReviewEntry[];
}): string {
  const latest = args.reviews[args.reviews.length - 1] ?? null;
  const latestTitle = latest?.reportTitle || "Decision memo";
  const latestDecision = latest ? humanDecisionLabel(latest.decision) : "Waiting for review";
  const latestSummary =
    latest?.summary ||
    "This report frames the proposal, the reasoning behind it, and the decision the human should make.";
  const recommendationText =
    latest?.decision === "approve"
      ? "The latest decision approves the proposal. If you want to proceed, keep the scope intact and preserve the stated tradeoffs."
      : latest?.decision === "reject"
        ? "The latest decision rejects the proposal. Use the feedback to revise the report and tighten the evidence before resubmitting."
        : "The latest decision requests revisions. Clarify the proposal, reduce ambiguity, and make the requested decision easier to justify.";
  const proposalText =
    latest?.summary ||
    "This report should contain the actual proposal content, not a task checklist. Write it as a memo with the decision, rationale, tradeoffs, and the concrete next step the human should review.";
  const decisionPrompt =
    latest?.decision === "approve"
      ? "Confirm that the proposal is ready to move forward and that the evidence is sufficient."
      : latest?.decision === "reject"
        ? "Decide whether the proposal should be reworked before any downstream execution happens."
        : "Decide whether the proposal is ready, needs changes, or should be rejected.";
  const tradeoffText =
    "A strong report makes the tradeoffs explicit: speed versus confidence, scope versus fidelity, and immediate delivery versus future rework.";
  return `
      <h2 class="section-title">Report</h2>
      <div class="summary-block report-body">
        <div class="label">Proposal narrative</div>
        <h3>${escapeHtml(latestTitle)}</h3>
        <p class="lead">${escapeHtml(proposalText)}</p>
      </div>
      <div class="meta-row" aria-label="report metadata">
        <span class="chip">Decision: ${escapeHtml(latestDecision)}</span>
        <span class="chip">Updated: ${escapeHtml(latest ? formatHumanTimestamp(latest.ts) : "Waiting for review")}</span>
        <span class="chip">Playbook: ${escapeHtml(args.playbook)}</span>
      </div>
      <div class="summary" style="margin-top: 18px;">
        <div class="summary-block">
          <div class="label">Executive summary</div>
          <div>${escapeHtml(latestSummary)}</div>
        </div>
        <div class="summary-block">
          <div class="label">Recommendation</div>
          <div>${escapeHtml(recommendationText)}</div>
        </div>
        <div class="summary-block">
          <div class="label">Decision request</div>
          <div>${escapeHtml(decisionPrompt)}</div>
        </div>
        <div class="summary-block">
          <div class="label">Tradeoffs</div>
          <div>${escapeHtml(tradeoffText)}</div>
        </div>
        <div class="summary-block">
          <div class="label">What to check</div>
          <ul class="checklist">
            <li>Does the proposal clearly describe what should happen next?</li>
            <li>Are the risks, tradeoffs, and unknowns stated plainly?</li>
            <li>Is the requested decision easy to make from the evidence provided?</li>
          </ul>
        </div>
      </div>`;
}

async function serializeSession(session: StudioSession, projectDir: string) {
  const planMarkdownPath = join(session.draftDir, "PLAN.md");
  let planMarkdown = "";
  if (existsSync(planMarkdownPath)) {
    planMarkdown = await readFile(planMarkdownPath, "utf8");
  }
  return {
    id: session.id,
    name: session.name,
    goal: session.goal,
    status: session.status,
    revision: session.revision,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    draftExists: existsSync(session.draftDir),
    planMarkdown,
    feedback: session.feedback,
    lastError: session.lastError,
    finalDir: session.finalDir,
  };
}

async function loadRunstate(
  projectDir: string,
  playbook: string,
): Promise<any | null> {
  const primary = join(projectDir, ".converge", "journal", playbook, "runstate.json");
  const fallback = join(projectDir, ".converge", "target", playbook, "runstate.json");
  const path = existsSync(primary) ? primary : existsSync(fallback) ? fallback : null;
  if (!path) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

async function loadPlannerSessionSnapshot(
  projectDir: string,
  playbook: string,
): Promise<PlannerSessionSnapshot | null> {
  const rootDir = join(projectDir, SESSIONS_DIR);
  if (!existsSync(rootDir)) return null;
  const entries = await readdir(rootDir, { withFileTypes: true });
  const matches: PlannerSessionSnapshot[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sessionPath = join(rootDir, entry.name, "session.json");
    if (!existsSync(sessionPath)) continue;
    try {
      const raw = JSON.parse(await readFile(sessionPath, "utf8")) as Partial<StudioSession>;
      if (raw.name !== playbook || !raw.id) continue;
      matches.push({
        id: raw.id,
        name: raw.name || playbook,
        status: (raw.status as SessionStatus) || "idle",
        revision: raw.revision || 0,
        updatedAt: raw.updatedAt || new Date().toISOString(),
        draftDir: raw.draftDir || join(rootDir, entry.name, "draft"),
        finalDir:
          raw.finalDir || join(projectDir, ".converge", "playbooks", raw.name || playbook),
        lastError: raw.lastError,
        feedback: Array.isArray(raw.feedback)
          ? raw.feedback
              .filter((item): item is FeedbackEntry => !!item && typeof item === "object")
              .map((item) => ({
                ts: typeof item.ts === "string" ? item.ts : new Date().toISOString(),
                message: typeof item.message === "string" ? item.message : "",
              }))
          : [],
      });
    } catch {
      continue;
    }
  }
  matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return matches[0] ?? null;
}

async function loadHumanReviews(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<HumanReviewEntry[]> {
  const path = getHumanReportReviewsPath(projectDir, playbook, taskId);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf8");

  // Normalize: split by newlines and also handle any concatenated JSON objects
  // (multiple JSON objects merged without newlines, which can happen if writes
  // didn't receive a trailing newline).
  const entries: HumanReviewEntry[] = [];

  for (const line of raw.split("\n").filter(Boolean)) {
    if (!line.startsWith("{")) continue;
    // Try parsing as-is first
    let parsed = tryParseLine(line);
    if (parsed && parsed.playbook === playbook && parsed.taskId === taskId) {
      entries.push(parsed);
      continue;
    }
    // Handle concatenated entries: split on }{ boundary
    if (line.includes("}{")) {
      const parts = line.split("}{");
      for (let i = 0; i < parts.length; i++) {
        const chunk = (i === 0 ? "" : "{") + parts[i] + (i === parts.length - 1 ? "" : "}");
        const p = tryParseLine(chunk);
        if (p && p.playbook === playbook && p.taskId === taskId) {
          entries.push(p);
        }
      }
    }
  }

  return entries;
}

function tryParseLine(line: string): HumanReviewEntry | null {
  try {
    return JSON.parse(line) as HumanReviewEntry;
  } catch {
    return null;
  }
}

async function appendHumanReview(projectDir: string, review: HumanReviewEntry): Promise<void> {
  const dir = join(projectDir, ".converge", "inventory", review.playbook, "reports");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${review.taskId}.jsonl`);
  await writeFile(path, JSON.stringify(review) + "\n", { flag: "a" });
  await mirrorHumanReviewToAttemptFeedback(projectDir, review);
}

async function mirrorHumanReviewToAttemptFeedback(
  projectDir: string,
  review: HumanReviewEntry,
): Promise<void> {
  const attemptDir = join(
    projectDir,
    ".converge",
    "journal",
    review.playbook,
    "tasks",
    review.taskId,
    "attempts",
    "wip",
  );
  if (!existsSync(attemptDir)) return;

  const feedbackPath = join(attemptDir, "FEEDBACK.md");
  const existing = existsSync(feedbackPath)
    ? await readFile(feedbackPath, "utf8")
    : "";
  const reviewBlock = formatHumanReviewFeedback(review);
  const nextFeedback = existing.trim()
    ? `${existing.trimEnd()}\n\n---\n\n${reviewBlock}\n`
    : `${reviewBlock}\n`;
  await writeFile(feedbackPath, nextFeedback, "utf8");
}

function formatHumanReviewFeedback(review: HumanReviewEntry): string {
  return [
    "# FEEDBACK.md — Human Review",
    "",
    `**Playbook**: ${review.playbook}`,
    `**Task**: ${review.taskId}`,
    `**Decision**: ${humanDecisionLabel(review.decision)}`,
    `**Report**: ${review.reportTitle}`,
    `**Recorded**: ${review.ts}`,
    "",
    "## Summary",
    "",
    review.summary || "No summary provided.",
    "",
    "## Feedback",
    "",
    review.feedback || "No feedback provided.",
  ].join("\n");
}

function normalizeHumanReview(
  body: Record<string, string>,
  context: { playbook: string; taskId: string },
): HumanReviewEntry {
  const action = body.action?.trim();
  return {
    ts: new Date().toISOString(),
    playbook: context.playbook,
    taskId: context.taskId,
    template: "employee-report",
    reportTitle: body.reportTitle?.trim() || "Weekly employee report",
    summary: body.summary?.trim() || "",
    decision:
      action === "accept"
        ? "approve"
        : action === "feedback"
          ? "revise"
          : normalizeDecision(body.decision),
    feedback: body.feedback?.trim() || "",
  };
}

function normalizeDecision(value: string | undefined): HumanDecision {
  if (value === "approve" || value === "revise" || value === "reject") {
    return value;
  }
  return "revise";
}

function humanDecisionLabel(value: HumanDecision | undefined): string {
  if (value === "approve") return "Approved";
  if (value === "reject") return "Rejected";
  if (value === "revise") return "Needs revision";
  return "Waiting for review";
}

function humanDecisionTone(value: HumanDecision | undefined): "good" | "warn" | "bad" | "neutral" {
  if (value === "approve") return "good";
  if (value === "reject") return "bad";
  if (value === "revise") return "warn";
  return "neutral";
}

function formatHumanTimestamp(ts: string): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function persistSession(rootDir: string, session: StudioSession): Promise<void> {
  const sessionDir = join(rootDir, session.id);
  await mkdir(sessionDir, { recursive: true });
  const payload = {
    id: session.id,
    projectDir: session.projectDir,
    name: session.name,
    templateId: session.templateId,
    templateLabel: session.templateLabel,
    playbookInstruction: session.playbookInstruction,
    goal: session.goal,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    revision: session.revision,
    status: session.status,
    draftDir: session.draftDir,
    workDir: session.workDir,
    finalDir: session.finalDir,
    lastError: session.lastError,
    feedback: session.feedback,
  };
  await writeFile(join(sessionDir, "session.json"), JSON.stringify(payload, null, 2), "utf8");
}

async function appendFeedbackEntry(
  rootDir: string,
  sessionId: string,
  feedback: string,
): Promise<void> {
  const sessionDir = join(rootDir, sessionId);
  await mkdir(sessionDir, { recursive: true });
  const line = JSON.stringify({ ts: new Date().toISOString(), message: feedback }) + "\n";
  await writeFile(join(sessionDir, "feedback.jsonl"), line, { flag: "a" });
}

async function loadSessionsFromDisk(
  rootDir: string,
  sessions: Map<string, StudioSession>,
): Promise<void> {
  if (!existsSync(rootDir)) return;
  const entries = await readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const sessionPath = join(rootDir, entry.name, "session.json");
    if (!existsSync(sessionPath)) continue;
    try {
      const raw = JSON.parse(await readFile(sessionPath, "utf8")) as Partial<StudioSession>;
      if (!raw.id || !raw.name || !raw.goal) continue;
      sessions.set(raw.id, {
        id: raw.id,
        projectDir: raw.projectDir || resolve(rootDir, "..", "..", ".."),
        name: raw.name,
        templateId: raw.templateId || undefined,
        templateLabel: raw.templateLabel || undefined,
        playbookInstruction: raw.playbookInstruction || undefined,
        goal: raw.goal,
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
        revision: raw.revision || 0,
        status: (raw.status as SessionStatus) || "idle",
        draftDir: raw.draftDir || join(rootDir, entry.name, "draft"),
        workDir: raw.workDir || undefined,
        finalDir:
          raw.finalDir || join(resolve(rootDir, "..", "..", ".."), ".converge", "playbooks", raw.name),
        lastError: raw.lastError,
        feedback: Array.isArray(raw.feedback)
          ? raw.feedback
              .filter((item): item is FeedbackEntry => !!item && typeof item === "object")
              .map((item) => ({
                ts: typeof item.ts === "string" ? item.ts : new Date().toISOString(),
                message: typeof item.message === "string" ? item.message : "",
              }))
          : [],
        activeRun: null,
        rerunRequested: false,
      });
    } catch {
      continue;
    }
  }
}

async function sanitizePlaybookYml(playbookDir: string): Promise<void> {
  const path = join(playbookDir, "playbook.yml");
  if (!existsSync(path)) return;

  const raw = await readFile(path, "utf8");
  const parsed = parseYaml(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return;
  if (!("tasks" in parsed)) return;

  const next = { ...parsed } as Record<string, unknown>;
  delete next.tasks;
  await writeFile(path, stringifyYaml(next), "utf8");
}

function panel(title: string, body: string): string {
  return `<section class="panel"><h2>${escapeHtml(title)}</h2>${body}</section>`;
}

function authCleanupScript(): string {
  return `<script>
    (() => {
      try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has("token")) return;
        url.searchParams.delete("token");
        const query = url.searchParams.toString();
        const next = url.pathname + (query ? "?" + query : "") + url.hash;
        window.history.replaceState({}, "", next);
      } catch {
        // Ignore malformed URLs in non-browser contexts.
      }
    })();
  </script>`;
}

function renderFeedbackHistory(entries: FeedbackEntry[]): string {
  if (entries.length === 0) {
    return panel("Feedback history", `<div class="empty">No feedback yet.</div>`);
  }
  const list = entries
    .map(
      (entry) => `<div class="feedback-item">
        <div class="task-meta">${escapeHtml(entry.ts)}</div>
        <div>${escapeHtml(entry.message)}</div>
      </div>`,
    )
    .join("");
  return panel("Feedback history", `<div class="stack">${list}</div>`);
}

function sessionFooter(session: StudioSession): string {
  return `<section class="footnote">
    <a href="/sessions/${session.id}">Back to session</a>
    <span>Status:</span> <code>${escapeHtml(session.status)}</code>
  </section>`;
}

function plannerLifecycleIndex(status: SessionStatus): number {
  if (status === "idle") return 0;
  if (status === "planning") return 1;
  if (status === "awaiting-feedback") return 2;
  if (status === "publishing") return 3;
  if (status === "published") return 4;
  return 5;
}

function renderPlannerLifecycle(args: {
  status: SessionStatus;
  lastError?: string;
  mode: "session" | "playbook";
}): string {
  const steps: Array<{
    status: SessionStatus;
    label: string;
    detail: string;
  }> = [
    {
      status: "idle",
      label: "Idle",
      detail: "The planner exists but has not started shaping the playbook yet.",
    },
    {
      status: "planning",
      label: "Planning",
      detail: "The planner is drafting tasks, templates, catalogs, and helper scripts.",
    },
    {
      status: "awaiting-feedback",
      label: "Awaiting feedback",
      detail: "The draft is ready for review and can be revised in the browser.",
    },
    {
      status: "publishing",
      label: "Publishing",
      detail: "The accepted draft is being copied into the playbook folder.",
    },
    {
      status: "published",
      label: "Published",
      detail: "The playbook is available to run and review in the studio.",
    },
    {
      status: "failed",
      label: "Failed",
      detail: "The planner hit an error and the last failure is shown below.",
    },
  ];
  const currentIndex = plannerLifecycleIndex(args.status);
  const stepRows = steps
    .map((step, index) => {
      const current = args.status === "failed" ? step.status === "failed" : index === currentIndex;
      const done = args.status !== "failed" && index < currentIndex;
      const stateClass = current ? "current" : done ? "done" : "upcoming";
      return `<article class="lifecycle-step ${stateClass}">
        <div class="lifecycle-top">
          <span class="lifecycle-index">${index + 1}</span>
          <span class="lifecycle-label">${escapeHtml(step.label)}</span>
        </div>
        <p>${escapeHtml(step.detail)}</p>
      </article>`;
    })
    .join("");
  return `<div class="stack">
    <div class="lifecycle-summary">
      <span class="badge ${args.status}">${escapeHtml(args.status)}</span>
      <span class="metric">Mode <strong>${escapeHtml(args.mode)}</strong></span>
    </div>
    <div class="lifecycle-grid">${stepRows}</div>
    ${
      args.lastError
        ? `<div class="error-box"><strong>Last error</strong><pre>${escapeHtml(args.lastError)}</pre></div>`
        : `<div class="empty">The current step is highlighted above. The published playbook and review artifact are linked in the outputs panel.</div>`
    }
  </div>`;
}

function renderPlannerOutputs(args: {
  mode: "session" | "playbook";
  playbookName: string;
  status: SessionStatus;
  reportUrl: string;
  runUrl?: string;
  sessionId?: string;
  draftDir?: string;
  finalDir?: string;
  published: boolean;
}): string {
  const reviewLabel =
    args.mode === "session" ? "Preview the HTML artifact" : "Review the HTML artifact";
  const outputCards =
    args.mode === "session"
      ? [
          `<article class="artifact-card">
            <div class="artifact-tag">Draft output</div>
            <strong>Planner playbook</strong>
            <p>The current draft lives in <code>${escapeHtml(args.draftDir || "")}</code>.</p>
            ${args.sessionId ? `<a href="/sessions/${encodeURIComponent(args.sessionId)}">Open session</a>` : ""}
          </article>`,
          `<article class="artifact-card accent">
            <div class="artifact-tag">Human in the loop</div>
            <strong>${escapeHtml(reviewLabel)}</strong>
            <p>One review task serves the persisted infographic HTML for human feedback.</p>
            ${
              args.published
                ? `<a href="${escapeHtml(args.reportUrl)}">Open review artifact</a>`
                : `<span>The review artifact appears after the playbook is published.</span>`
            }
          </article>`,
          `<article class="artifact-card">
            <div class="artifact-tag">Publish target</div>
            <strong>Playbook folder</strong>
            <p>The accepted draft is copied into <code>${escapeHtml(args.finalDir || "")}</code>.</p>
            ${
              args.published
                ? `<a href="/playbooks/${encodeURIComponent(args.playbookName)}">Open playbook view</a>`
                : `<span>The playbook view appears after publishing.</span>`
            }
          </article>`,
        ]
      : [
          `<article class="artifact-card">
            <div class="artifact-tag">Published output</div>
            <strong>Playbook folder</strong>
            <p>The accepted playbook lives in <code>${escapeHtml(args.finalDir || "")}</code>.</p>
            <a href="/playbooks/${encodeURIComponent(args.playbookName)}">Open playbook</a>
          </article>`,
          `<article class="artifact-card accent">
            <div class="artifact-tag">Human in the loop</div>
            <strong>${escapeHtml(reviewLabel)}</strong>
            <p>Use the HTML artifact to preview the report and leave feedback.</p>
            <a href="${escapeHtml(args.reportUrl)}">Open review artifact</a>
          </article>`,
          `<article class="artifact-card">
            <div class="artifact-tag">Runtime</div>
            <strong>Run dashboard</strong>
            <p>Watch the execution state from the journal once the playbook is run.</p>
            <a href="${escapeHtml(args.runUrl || `/playbooks/${encodeURIComponent(args.playbookName)}/run`)}">Open run dashboard</a>
          </article>`,
        ];
  return `<div class="artifact-grid">${outputCards.join("")}</div>`;
}

function renderLayout(title: string, sections: string[], refresh = false): string {
  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      ${refresh ? '<meta http-equiv="refresh" content="2" />' : ""}
      <title>${escapeHtml(title)}</title>
      ${authCleanupScript()}
      <style>
        :root {
          color-scheme: dark;
          --bg: #0c1220;
          --panel: rgba(14, 20, 34, 0.92);
          --panel-border: rgba(148, 163, 184, 0.16);
          --text: #e5eefb;
          --muted: #96a4bb;
          --accent: #7dd3fc;
          --accent-2: #f59e0b;
          --success: #34d399;
          --error: #fb7185;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background:
            radial-gradient(circle at 18% 14%, rgba(56, 189, 248, 0.16), transparent 24%),
            radial-gradient(circle at 82% 18%, rgba(168, 85, 247, 0.16), transparent 22%),
            radial-gradient(circle at 50% 92%, rgba(16, 185, 129, 0.08), transparent 28%),
            linear-gradient(180deg, #050816 0%, #07101e 38%, #09111f 100%);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }
        body::before,
        body::after {
          content: "";
          position: fixed;
          inset: auto;
          pointer-events: none;
          z-index: 0;
          filter: blur(20px);
          opacity: 0.8;
        }
        body::before {
          width: 420px;
          height: 420px;
          left: -140px;
          top: -120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.16), transparent 68%);
        }
        body::after {
          width: 460px;
          height: 460px;
          right: -180px;
          bottom: -140px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.14), transparent 68%);
        }
        a { color: var(--accent); text-decoration: none; }
        code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
        .page {
          max-width: 1240px;
          margin: 0 auto;
          padding: 24px 20px 32px;
          position: relative;
          z-index: 1;
        }
        .compose-shell {
          display: grid;
          place-items: center;
          gap: 18px;
          min-height: calc(100vh - 56px);
          padding: 8px 0 12px;
          position: relative;
        }
        .compose-shell > div {
          width: min(1080px, 100%);
          text-align: center;
        }
        .compose-shell h1 {
          margin: 8px 0 10px;
          font-size: clamp(1.7rem, 3.4vw, 2.55rem);
          line-height: 1;
          letter-spacing: -0.05em;
          font-weight: 650;
          text-wrap: balance;
        }
      .help-link {
          margin: 10px 0 0;
          font-size: 0.95rem;
        }
        .help-link-bottom {
          margin-top: 14px;
          text-align: center;
        }
        .lede {
          color: var(--muted);
          max-width: 62ch;
          margin: 0 auto;
          font-size: 1rem;
          line-height: 1.62;
        }
        .eyebrow {
          display: inline-flex;
          padding: 7px 11px;
          border: 1px solid var(--panel-border);
          border-radius: 999px;
          color: #bfe8ff;
          background: rgba(56, 189, 248, 0.1);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 11px;
        }
        .compose-card, .panel, .card-link, .footnote {
          border: 1px solid var(--panel-border);
          background:
            linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(10, 15, 26, 0.94)),
            rgba(14, 20, 34, 0.92);
          border-radius: 24px;
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
        }
        .compose-card {
          width: min(1080px, 100%);
          padding: 28px;
          text-align: left;
          position: relative;
          overflow: hidden;
        }
        .compose-card::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(135deg, rgba(56, 189, 248, 0.08), transparent 35%),
            linear-gradient(315deg, rgba(168, 85, 247, 0.06), transparent 32%);
          pointer-events: none;
        }
        .panel { padding: 18px; margin-bottom: 16px; }
        .panel h2 { margin: 0 0 14px; font-size: 1rem; letter-spacing: 0.04em; text-transform: uppercase; color: #d7e7fb; }
        .help-page .panel { margin-bottom: 0; }
        .help-copy { margin: 0; color: #d5e0f3; line-height: 1.6; }
        .help-note { margin-top: 10px; }
        .help-row, .help-example {
          display: grid;
          gap: 4px;
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(9, 14, 25, 0.48);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .help-row strong, .help-example strong { color: #eef5ff; }
        .help-row span, .help-example span { color: var(--muted); line-height: 1.55; }
        .help-back { margin: 4px 0 0; }
        .lifecycle-summary {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .lifecycle-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .lifecycle-step {
          display: grid;
          gap: 8px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.52);
        }
        .lifecycle-step.current {
          border-color: rgba(125, 211, 252, 0.28);
          background:
            linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(168, 85, 247, 0.08)),
            rgba(9, 14, 25, 0.58);
        }
        .lifecycle-step.done {
          opacity: 0.88;
          border-color: rgba(52, 211, 153, 0.18);
        }
        .lifecycle-step.upcoming {
          opacity: 0.76;
        }
        .lifecycle-top {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .lifecycle-index {
          display: inline-flex;
          width: 1.7rem;
          height: 1.7rem;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(148, 163, 184, 0.12);
          color: #dce7f7;
          font-size: 0.82rem;
          font-weight: 700;
        }
        .lifecycle-label {
          font-weight: 700;
          color: #eef5ff;
        }
        .lifecycle-step p {
          margin: 0;
          color: var(--muted);
          line-height: 1.55;
        }
        .artifact-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .artifact-card {
          display: grid;
          gap: 8px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.52);
        }
        .artifact-card.accent {
          border-color: rgba(125, 211, 252, 0.24);
          background:
            linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(168, 85, 247, 0.06)),
            rgba(9, 14, 25, 0.58);
        }
        .artifact-card strong {
          color: #eef5ff;
          font-size: 1rem;
        }
        .artifact-card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.55;
        }
        .artifact-tag {
          display: inline-flex;
          width: fit-content;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.7);
          color: #b7c5d9;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10px;
          font-weight: 700;
        }
        .artifact-card a {
          width: fit-content;
        }
        .error-box {
          padding: 14px 16px;
          border-radius: 16px;
          border: 1px solid rgba(251, 113, 133, 0.2);
          background: rgba(251, 113, 133, 0.08);
        }
        .error-box strong {
          display: block;
          margin-bottom: 8px;
          color: #ffb0bd;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 0.78rem;
        }
        .error-box pre {
          margin: 0;
          white-space: pre-wrap;
          color: #f3d9df;
        }
        .help-flow {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr) auto minmax(0, 1fr);
          gap: 12px;
          align-items: stretch;
        }
        .help-node, .help-case {
          display: grid;
          gap: 6px;
          padding: 14px;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.52);
        }
        .help-node.highlight {
          border-color: rgba(125, 211, 252, 0.26);
          background:
            linear-gradient(135deg, rgba(56, 189, 248, 0.14), rgba(168, 85, 247, 0.08)),
            rgba(9, 14, 25, 0.58);
        }
        .help-node strong,
        .help-case strong {
          color: #eef5ff;
        }
        .help-node span,
        .help-case span {
          color: var(--muted);
          line-height: 1.5;
        }
        .help-arrow {
          display: grid;
          place-items: center;
          color: #8fbfe2;
          font-size: 1.4rem;
          font-weight: 700;
          user-select: none;
        }
        .help-tag {
          display: inline-flex;
          width: fit-content;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.7);
          color: #b7c5d9;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10px;
          font-weight: 700;
        }
        .help-cases {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
        .grid.split { grid-template-columns: 1.7fr 1fr; }
        .feed-layout {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(290px, 0.75fr);
          gap: 18px;
          align-items: start;
        }
        .feed-column {
          display: grid;
          gap: 16px;
          min-width: 0;
        }
        .topology-rail {
          display: grid;
          gap: 16px;
          position: sticky;
          top: 18px;
        }
        .feed-post,
        .reply-card {
          border: 1px solid rgba(148, 163, 184, 0.16);
          background:
            linear-gradient(180deg, rgba(17, 24, 39, 0.94), rgba(10, 15, 26, 0.94)),
            rgba(14, 20, 34, 0.92);
          border-radius: 24px;
          box-shadow:
            0 18px 48px rgba(0, 0, 0, 0.24),
            inset 0 1px 0 rgba(255, 255, 255, 0.03);
        }
        .feed-post {
          padding: 20px;
        }
        .feed-post-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 14px;
        }
        .feed-kicker {
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10px;
          color: #95b6d3;
          font-weight: 700;
          margin-bottom: 6px;
        }
        .feed-post h2 {
          margin: 0;
          font-size: 1.1rem;
          color: #eef5ff;
        }
        .feed-chip-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 8px;
        }
        .feed-chip {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(9, 14, 25, 0.68);
          color: #c6d5ea;
          font-size: 0.8rem;
          font-weight: 700;
        }
        .feed-body {
          display: grid;
          gap: 14px;
        }
        .feed-block {
          display: grid;
          gap: 10px;
          padding: 14px;
          border-radius: 18px;
          background: rgba(9, 14, 25, 0.52);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .feed-label {
          color: #9cb5cd;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .feed-block pre {
          margin: 0;
          white-space: pre-wrap;
          line-height: 1.65;
          color: #e9f2ff;
        }
        .feed-footer {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .thread {
          display: grid;
          gap: 10px;
        }
        .reply-card {
          padding: 14px;
          border-radius: 18px;
          background: rgba(9, 14, 25, 0.58);
        }
        .reply-card.nested {
          margin-left: 12px;
          border-style: dashed;
        }
        .reply-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          align-items: center;
          margin-bottom: 8px;
        }
        .reply-index {
          color: #dce7f7;
          font-weight: 700;
        }
        .reply-time {
          color: var(--muted);
          font-size: 0.86rem;
        }
        .reply-card p {
          margin: 0;
          line-height: 1.6;
          color: #d9e3f1;
        }
        .reply-card strong {
          display: block;
          margin-bottom: 6px;
          color: #eef5ff;
        }
        .feed-post .empty {
          margin: 0;
        }
        .column { min-width: 0; }
        .stack { display: grid; gap: 14px; position: relative; z-index: 1; }
        .compose-panel {
          min-width: 0;
          padding: 20px;
          border-radius: 22px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.36);
        }
        .compose-section {
          display: grid;
          gap: 16px;
          position: relative;
        }
        .section-kicker {
          position: absolute;
          top: 16px;
          right: 16px;
          display: inline-flex;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          background: rgba(9, 14, 25, 0.54);
          color: #b7c5d9;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-size: 10px;
          font-weight: 700;
        }
        .compose-stack-left {
          display: grid;
          gap: 16px;
          padding-top: 6px;
        }
        label { display: grid; gap: 8px; font-size: 0.92rem; color: #d5e0f3; }
        input, textarea, button {
          box-sizing: border-box;
          font: inherit;
          border-radius: 16px;
          border: 1px solid rgba(148, 163, 184, 0.22);
          background: rgba(9, 14, 25, 0.92);
          color: var(--text);
          padding: 13px 14px;
        }
        .template-select-field {
          display: grid;
          gap: 8px;
          margin-bottom: 2px;
        }
        .template-select-field span {
          color: #edf5ff;
          font-weight: 600;
          letter-spacing: 0.01em;
        }
        .template-select-shell {
          position: relative;
        }
        .template-select-shell::after {
          content: "";
          position: absolute;
          right: 16px;
          top: 50%;
          width: 9px;
          height: 9px;
          border-right: 2px solid rgba(229, 238, 251, 0.82);
          border-bottom: 2px solid rgba(229, 238, 251, 0.82);
          transform: translateY(-72%) rotate(45deg);
          pointer-events: none;
        }
        .template-select-shell select {
          width: 100%;
          min-height: 58px;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          padding: 16px 46px 16px 18px;
          background:
            linear-gradient(180deg, rgba(17, 24, 39, 0.98), rgba(10, 15, 26, 0.98)),
            linear-gradient(135deg, rgba(56, 189, 248, 0.09), rgba(168, 85, 247, 0.06));
          border: 1px solid rgba(125, 211, 252, 0.22);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 10px 24px rgba(0, 0, 0, 0.18);
          border-radius: 16px;
          cursor: pointer;
          line-height: 1.2;
          font-weight: 600;
          color: #eef5ff;
          outline: none;
          transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
        }
        .template-select-shell select:hover {
          border-color: rgba(125, 211, 252, 0.42);
          transform: translateY(-1px);
        }
        .template-select-shell select:focus {
          border-color: rgba(125, 211, 252, 0.65);
          box-shadow:
            0 0 0 3px rgba(125, 211, 252, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.04),
            0 10px 24px rgba(0, 0, 0, 0.18);
        }
        .template-select-shell select option,
        .template-select-shell select optgroup {
          color: #e5eefb;
          background: #0b1220;
        }
        textarea {
          resize: none;
          overflow: hidden;
          min-height: 4.5rem;
        }
        .prompt-field textarea {
          min-height: 5rem;
          font-size: 1rem;
          line-height: 1.55;
        }
        .playbook-field textarea {
          min-height: 4.5rem;
          font-size: 0.97rem;
          line-height: 1.5;
        }
        .compose-actions {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
          margin-top: 6px;
          position: relative;
          z-index: 1;
        }
        .compose-actions button {
          min-width: 180px;
          padding-inline: 20px;
          justify-self: end;
          align-self: end;
        }
        .compose-actions .hint {
          margin: 0;
          max-width: 56ch;
          font-size: 0.96rem;
        }
        button {
          cursor: pointer;
          background: linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(168, 85, 247, 0.18));
          border-color: rgba(125, 211, 252, 0.34);
          font-weight: 600;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        button:hover {
          transform: translateY(-1px);
          border-color: rgba(125, 211, 252, 0.5);
          box-shadow: 0 16px 30px rgba(0, 0, 0, 0.22);
        }
        button:focus-visible,
        .template-select-shell select:focus-visible,
        textarea:focus-visible {
          outline: none;
          box-shadow:
            0 0 0 3px rgba(56, 189, 248, 0.16),
            0 0 0 1px rgba(56, 189, 248, 0.2);
        }
        button[disabled] { opacity: 0.45; cursor: not-allowed; }
        .cards { display: grid; gap: 12px; }
        .card-link {
          display: block;
          padding: 16px;
          color: inherit;
        }
        .card-title { font-weight: 700; margin-bottom: 4px; }
        .card-meta, .task-meta, .hint, .metric { color: var(--muted); font-size: 0.92rem; }
        .card-body { margin-top: 8px; line-height: 1.5; color: #cfd8e6; }
        .task-grid, .stack { display: grid; gap: 10px; }
        .task-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 10px;
          align-items: center;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(9, 14, 25, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .task-id { font-weight: 600; }
        .feedback-item {
          padding: 12px 14px;
          border-radius: 14px;
          background: rgba(9, 14, 25, 0.7);
          border: 1px solid rgba(148, 163, 184, 0.12);
        }
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 12px;
          border-radius: 999px;
          font-size: 0.82rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          width: fit-content;
        }
        .badge.idle { background: rgba(148, 163, 184, 0.12); color: #d7e4f5; }
        .badge.planning { background: rgba(125, 211, 252, 0.14); color: #8ddfff; }
        .badge.awaiting-feedback { background: rgba(245, 158, 11, 0.14); color: #f9d58b; }
        .badge.published { background: rgba(52, 211, 153, 0.14); color: #84f1c0; }
        .badge.failed { background: rgba(251, 113, 133, 0.14); color: #ffb0bd; }
        .badge.publishing { background: rgba(168, 85, 247, 0.14); color: #d0b0ff; }
        .status-stack { display: grid; align-content: start; gap: 10px; }
        .metric {
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.12);
          background: rgba(9, 14, 25, 0.7);
        }
        .metric strong { color: var(--text); font-size: 1.1rem; }
        .empty {
          color: var(--muted);
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(9, 14, 25, 0.45);
          border: 1px dashed rgba(148, 163, 184, 0.18);
        }
        .footnote {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          padding: 12px 16px;
          color: var(--muted);
          margin-top: 12px;
        }
        .plan-md {
          white-space: pre-wrap;
          line-height: 1.6;
          overflow: auto;
          max-height: 28rem;
        }
        .error pre { white-space: pre-wrap; }
        @media (max-width: 960px) {
          .grid, .grid.split { grid-template-columns: 1fr; }
          .feed-layout {
            grid-template-columns: 1fr;
          }
          .topology-rail {
            position: static;
          }
          .lifecycle-grid,
          .artifact-grid,
          .help-cases,
          .help-flow {
            grid-template-columns: 1fr;
          }
          .compose-shell {
            min-height: auto;
            padding-top: 0;
          }
          .compose-shell h1 {
            font-size: clamp(2rem, 10vw, 3.2rem);
          }
          .compose-card {
            padding: 18px;
          }
          .compose-actions {
            flex-direction: column;
            align-items: stretch;
          }
          .compose-actions button {
            width: 100%;
          }
        }
      </style>
    </head>
    <body>
      <main class="page">
        ${sections.join("\n")}
      </main>
    </body>
  </html>`;
}

async function readForm(req: IncomingMessage): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  const params = new URLSearchParams(raw);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(json),
    "cache-control": "no-store",
  });
  res.end(json);
}

function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "content-length": Buffer.byteLength(html),
    "cache-control": "no-store",
  });
  res.end(html);
}

function redirect(res: ServerResponse, location: string): void {
  res.writeHead(303, {
    location,
    "cache-control": "no-store",
  });
  res.end();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function shorten(value: string, max: number): string {
  const s = value.replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "plan"
  );
}

async function tryOpenBrowser(url: string): Promise<void> {
  const platform = process.platform;
  if (platform === "darwin") {
    await execFileAsync("open", [url]);
    return;
  }
  if (platform === "win32") {
    await execFileAsync("cmd", ["/c", "start", "", url]);
    return;
  }
  await execFileAsync("xdg-open", [url]);
}
