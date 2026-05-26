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

import { plan, parseTaskMd, type PlanOptions } from "@openplaybooks/converge-core";
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
import templateCatalog from "./add-ui-templates.json" with { type: "json" };
import { createHtmlServerManager, readHtmlServerState } from "./html-server-manager.js";

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

  await new Promise<void>(() => {
    const stop = () => {
      console.log("\n\u{1F6D1} Stopping studio server...");
      server.close().catch(() => {});
      // Force immediate exit — other SIGINT handlers (agent cleanup,
      // graceful shutdown) keep the event loop alive indefinitely.
      process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
    process.on("SIGHUP", stop);
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
    await rm(getHumanReportArtifactPath(projectDir, handoff.playbook, handoff.taskId), { force: true }).catch(() => {});
    await loadOrCreateHumanReportArtifact(projectDir, handoff.playbook, handoff.taskId);
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
    await rm(getHumanReportArtifactPath(projectDir, playbook, taskId), { force: true }).catch(() => {});
    await loadOrCreateHumanReportArtifact(projectDir, playbook, taskId);
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
    const reviews = await loadHumanReviews(projectDir, handoff.playbook, handoff.taskId);
    const reviewPrompt = await loadTaskReviewPrompt(projectDir, handoff.playbook, handoff.taskId);
    sendHtml(
      res,
      200,
      renderHumanReviewPageHtml({
        playbook: handoff.playbook,
        taskId: handoff.taskId,
        reportContentHtml: report,
        submitPath: path,
        reviews,
        reviewPrompt,
      }),
    );
    return;
  }

  if (method === "GET" && path.startsWith("/playbooks/")) {
    const name = decodeURIComponent(path.split("/")[2] || "");
    const tail = path.split("/").slice(3).join("/");
    if (tail === "run") {
      const runstate = await loadRunstate(projectDir, name);
      if (!runstate) {
        sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown run state.")]));
        return;
      }
      const view = buildLivingPlaybookView(runstate, name, projectDir);
      sendHtml(res, 200, renderLayout(`Run · ${escapeHtml(name)}`, [view], true));
      return;
    }
    if (tail.startsWith("tasks/") && tail.endsWith("/report")) {
      const taskId = decodeURIComponent(tail.slice("tasks/".length, -"/report".length));
      const report = await loadOrCreateHumanReportArtifact(projectDir, name, taskId);
      if (!report) {
        sendHtml(res, 404, renderLayout("Not found", [panel("Not found", "Unknown human review page.")]));
        return;
      }
      const reviews = await loadHumanReviews(projectDir, name, taskId);
      const reviewPrompt = await loadTaskReviewPrompt(projectDir, name, taskId);
      sendHtml(
        res,
        200,
        renderHumanReviewPageHtml({
          playbook: name,
          taskId,
          reportContentHtml: report,
          submitPath: path,
          reviews,
          reviewPrompt,
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

  // Inline feedback form as a post
  const feedbackPost = `<article class="post">
    <div class="post-vote">
      <div class="vote-dot milestone">+</div>
    </div>
    <div class="post-content">
      <div class="post-meta"><span class="post-sub">r/feedback</span><span class="post-dot">&middot;</span><span>reply to thread</span></div>
      <form method="post" action="/sessions/${session.id}/feedback">
        <textarea name="feedback" rows="3" placeholder="Add feedback, request changes, or ask questions..."></textarea>
        <div class="post-actions">
          <button type="submit" class="action-link action-approve">Post reply</button>
          ${session.status !== "planning" ? `</form><form method="post" action="/sessions/${session.id}/accept" style="display:inline"><button type="submit" class="action-link action-revise">Publish playbook</button></form>` : `</form>`}
        </div>
      </form>
    </div>
  </article>`;

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
        ${feedbackPost}
      </div>
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
  if (!playbook) return `<div class="empty">No playbook loaded.</div>`;
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

// ─── Timeline Feed (Reddit-style execution view) ────────────────────────────

interface TimelineNode {
  id: string;
  status: string;
  title?: string;
  description?: string;
  depends_on: string[];
  depended_on_by: string[];
  attempts: number;
  duration_ms: number;
  started_at?: string;
  completed_at?: string;
  skill?: string | string[];
  spawned_children: string[];
  from_seed?: string;
  attempts_detail?: Array<{
    attempt: number;
    status: string;
    duration_ms: number;
    error_message?: string;
    check_results?: Array<{ name: string; passed: boolean; message?: string }>;
  }>;
  checks?: Array<{ name: string; cmd?: string }>;
  outputs?: string[];
  review?: { artifact?: string; prompt?: string; format?: string };
}

interface TimelineWave {
  index: number;
  nodes: TimelineNode[];
  allPassed: boolean;
}

type TimelineFilter = "all" | "tasks" | "reviews" | "errors" | "system";

function computeWaves(nodes: TimelineNode[]): TimelineWave[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const layers = new Map<string, number>();

  function getLayer(id: string): number {
    if (layers.has(id)) return layers.get(id)!;
    const node = nodeMap.get(id);
    if (!node || node.depends_on.length === 0) {
      layers.set(id, 0);
      return 0;
    }
    const maxParent = Math.max(
      ...node.depends_on.map((dep) => (nodeMap.has(dep) ? getLayer(dep) : -1)),
    );
    const layer = maxParent + 1;
    layers.set(id, layer);
    return layer;
  }

  for (const node of nodes) getLayer(node.id);

  const waveMap = new Map<number, TimelineNode[]>();
  for (const node of nodes) {
    const layer = layers.get(node.id) ?? 0;
    if (!waveMap.has(layer)) waveMap.set(layer, []);
    waveMap.get(layer)!.push(node);
  }

  const waves: TimelineWave[] = [];
  const sortedLayers = [...waveMap.keys()].sort((a, b) => a - b);
  for (const layer of sortedLayers) {
    const waveNodes = waveMap.get(layer)!;
    waveNodes.sort((a, b) => {
      if (a.started_at && b.started_at) return a.started_at.localeCompare(b.started_at);
      return a.id.localeCompare(b.id);
    });
    waves.push({
      index: layer,
      nodes: waveNodes,
      allPassed: waveNodes.every((n) => n.status === "pass"),
    });
  }
  return waves;
}

function renderFilterBar(playbookName: string, active: TimelineFilter): string {
  const filters: Array<{ key: TimelineFilter; label: string }> = [
    { key: "all", label: "All" },
    { key: "tasks", label: "Tasks" },
    { key: "reviews", label: "Reviews" },
    { key: "errors", label: "Errors" },
    { key: "system", label: "System" },
  ];
  const chips = filters
    .map((f) => {
      const href =
        f.key === "all"
          ? `/playbooks/${encodeURIComponent(playbookName)}/run`
          : `/playbooks/${encodeURIComponent(playbookName)}/run?filter=${f.key}`;
      const cls = f.key === active ? "filter-chip active" : "filter-chip";
      return `<a href="${escapeHtml(href)}" class="${cls}">${escapeHtml(f.label)}</a>`;
    })
    .join("");
  return `<nav class="timeline-filter-bar">${chips}</nav>`;
}

function renderMilestonePost(title: string, chips: string[]): string {
  const chipHtml = chips.filter(Boolean).join(" · ");
  return `<article class="post post-milestone">
    <div class="post-main"><h3 class="post-title">${escapeHtml(title)}</h3> <span class="post-meta">${escapeHtml(chipHtml)}</span></div>
  </article>`;
}

function renderTaskPost(node: TimelineNode, playbookName: string): string {
  const status = node.status || "pending";
  const duration = node.duration_ms > 0 ? `${(node.duration_ms / 1000).toFixed(1)}s` : "";
  const skill = Array.isArray(node.skill) ? node.skill.join(", ") : node.skill || "";
  const statusSymbol = status === "pass" ? "✓" : status === "error" ? "✗" : "●";

  let metaParts = `<span class="sub-link">r/execution</span> <span class="author">${escapeHtml(node.id)}</span>`;
  if (duration) metaParts += ` · ${escapeHtml(duration)}`;
  if (skill) metaParts += ` · ${escapeHtml(skill)}`;

  // All detail hidden behind expand
  const detailParts: string[] = [];
  if (node.depends_on.length > 0) detailParts.push(`depends on: ${node.depends_on.join(", ")}`);
  if (node.attempts_detail && node.attempts_detail.length > 0) {
    const lines = node.attempts_detail.map((a) => {
      const dur = a.duration_ms > 0 ? ` ${(a.duration_ms / 1000).toFixed(1)}s` : "";
      return `#${a.attempt} ${a.status}${dur}${a.error_message ? " — " + a.error_message.slice(0, 80) : ""}`;
    });
    detailParts.push(...lines);
  }
  if (node.spawned_children.length > 0) detailParts.push(`spawned: ${node.spawned_children.join(", ")}`);

  let expandHtml = "";
  if (detailParts.length > 0) {
    expandHtml = `<details class="post-expand"><summary>details</summary><div class="post-body">${detailParts.map((d) => `<p>${escapeHtml(d)}</p>`).join("")}</div></details>`;
  }

  const actions: string[] = [];
  if (node.attempts_detail && node.attempts_detail.length > 1)
    actions.push(`<span class="action-link">\u{1F4AC} ${node.attempts_detail.length}</span>`);
  const viewPath = `/playbooks/${encodeURIComponent(playbookName)}/tasks/${encodeURIComponent(node.id)}/report`;
  actions.push(`<a href="${escapeHtml(viewPath)}" class="action-link">\u{1F441} View</a>`);

  return `<article class="post">
    <div class="upvote-bar"><span class="vote-arrow vote-up">▲</span><span class="vote-count status-${escapeHtml(status)}">${statusSymbol}</span><span class="vote-arrow vote-down">▼</span></div>
    <div class="post-main">
      <div class="post-meta">${metaParts}</div>
      <h3 class="post-title">${escapeHtml(node.title || node.id)}</h3>
      ${expandHtml}
      <div class="post-actions">${actions.join("")}</div>
    </div>
  </article>`;
}

function renderReviewGatePost(
  node: TimelineNode,
  playbookName: string,
  reviews: HumanReviewEntry[],
  artifactPreview?: string,
): string {
  const latestDecision = reviews.length > 0 ? reviews[reviews.length - 1].decision : undefined;
  const submitPath = `/playbooks/${encodeURIComponent(playbookName)}/tasks/${encodeURIComponent(node.id)}/report`;
  const viewPath = submitPath;
  const statusLabel = latestDecision ? humanDecisionLabel(latestDecision) : "awaiting";
  const voteColor = latestDecision === "approve" ? "status-pass" : latestDecision === "reject" ? "status-error" : "status-review";
  const voteSymbol = latestDecision === "approve" ? "✓" : latestDecision === "reject" ? "✗" : "?";

  const metaHtml = `<span class="sub-link">r/review</span> <span class="author">${escapeHtml(node.id)}</span> · ${escapeHtml(statusLabel)}`;

  // Thread hidden behind expand
  let threadHtml = "";
  if (reviews.length > 0) {
    const items = reviews
      .map((r) => {
        const badgeClass = r.decision === "approve" ? "pass" : r.decision === "reject" ? "error" : "blocked";
        return `<div class="comment-wrapper"><div class="thread-line"><div class="thread-line-inner"></div></div><div class="comment-content"><div class="comment">
          <div class="comment-meta"><span class="badge ${badgeClass}">${escapeHtml(humanDecisionLabel(r.decision))}</span> ${escapeHtml(formatHumanTimestamp(r.ts))}</div>
          ${r.feedback ? `<div class="comment-body">${escapeHtml(r.feedback)}</div>` : ""}
        </div></div></div>`;
      })
      .join("");
    threadHtml = `<details class="post-expand"><summary>\u{1F4AC} ${reviews.length} decision${reviews.length === 1 ? "" : "s"}</summary><div class="comment-thread">${items}</div></details>`;
  }

  // Compact form
  let formHtml = "";
  if (!latestDecision || latestDecision === "revise") {
    formHtml = `<details class="post-expand"><summary>reply</summary><div class="comment-form"><form method="post" action="${escapeHtml(submitPath)}" id="review-form-${escapeHtml(node.id)}"><textarea name="feedback" rows="2" placeholder="feedback..."></textarea></form></div></details>`;
  }

  const actions: string[] = [];
  if (!latestDecision || latestDecision === "revise") {
    actions.push(`<button type="submit" name="action" value="accept" form="review-form-${escapeHtml(node.id)}" class="action-link action-approve">✓ Approve</button>`);
    actions.push(`<button type="submit" name="action" value="feedback" form="review-form-${escapeHtml(node.id)}" class="action-link action-revise">↻ Revise</button>`);
    actions.push(`<button type="submit" name="action" value="reject" form="review-form-${escapeHtml(node.id)}" class="action-link action-reject">✕ Reject</button>`);
  }
  actions.push(`<a href="${escapeHtml(viewPath)}" class="action-link">\u{1F441} View</a>`);

  return `<article class="post">
    <div class="upvote-bar"><span class="vote-arrow vote-up">▲</span><span class="vote-count ${voteColor}">${voteSymbol}</span><span class="vote-arrow vote-down">▼</span></div>
    <div class="post-main">
      <div class="post-meta">${metaHtml}</div>
      <h3 class="post-title">${escapeHtml(node.title || node.id)}</h3>
      ${threadHtml}
      ${formHtml}
      <div class="post-actions">${actions.join("")}</div>
    </div>
  </article>`;
}

function renderEscalationPost(node: TimelineNode): string {
  const lastAttempt = node.attempts_detail?.[node.attempts_detail.length - 1];
  const errorMsg = lastAttempt?.error_message || "Task failed.";
  const shortErr = errorMsg.length > 120 ? errorMsg.slice(0, 120) + "..." : errorMsg;
  return `<article class="post">
    <div class="upvote-bar"><span class="vote-arrow vote-up">▲</span><span class="vote-count status-error">✗</span><span class="vote-arrow vote-down">▼</span></div>
    <div class="post-main">
      <div class="post-meta"><span class="sub-link">r/error</span> <span class="author">${escapeHtml(node.id)}</span> · attempt ${node.attempts}</div>
      <h3 class="post-title">${escapeHtml(node.title || node.id)}</h3>
      <div class="post-body"><p style="color:var(--error)">${escapeHtml(shortErr)}</p></div>
    </div>
  </article>`;
}

async function buildTimelineFeed(
  projectDir: string,
  playbookName: string,
  runstate: any,
  filter: TimelineFilter,
): Promise<string> {
  const rawNodes = Object.values(runstate.dag?.nodes ?? {}) as any[];
  const nodes: TimelineNode[] = rawNodes.map((n) => ({
    id: String(n.id),
    status: String(n.status || "pending"),
    title: n.title || n.task_def?.title,
    description: n.description || n.task_def?.description,
    depends_on: Array.isArray(n.depends_on) ? n.depends_on : [],
    depended_on_by: Array.isArray(n.depended_on_by) ? n.depended_on_by : [],
    attempts: n.attempts || 0,
    duration_ms: n.duration_ms || 0,
    started_at: n.started_at,
    completed_at: n.completed_at,
    skill: n.skill || n.task_def?.skill,
    spawned_children: Array.isArray(n.spawned_children) ? n.spawned_children : [],
    from_seed: n.from_seed,
    attempts_detail: Array.isArray(n.attempts_detail) ? n.attempts_detail : [],
    checks: n.checks || n.task_def?.checks,
    outputs: n.outputs || n.task_def?.outputs,
    review: n.task_def?.review,
  }));

  const reviewTaskIds = new Set<string>();
  for (const node of nodes) {
    if (node.review?.artifact || node.status === "blocked") {
      const reviews = await loadHumanReviews(projectDir, playbookName, node.id);
      if (reviews.length > 0 || node.review?.artifact) reviewTaskIds.add(node.id);
    }
  }

  const spawned = new Set(nodes.flatMap((n) => n.spawned_children));
  const topLevelNodes = nodes.filter((n) => !spawned.has(n.id));
  const waves = computeWaves(topLevelNodes);

  const posts: string[] = [];

  // Run start milestone
  const meta = runstate.metadata || {};
  posts.push(
    renderMilestonePost(`Run started`, [
      `${nodes.length} tasks`,
      meta.status || "running",
      meta.generated_at ? formatHumanTimestamp(meta.generated_at) : "",
    ].filter(Boolean)),
  );

  // Render each wave
  for (const wave of waves) {
    const waveLabel = wave.index === 0 ? "Root tasks" : `Wave ${wave.index + 1}`;
    const passCount = wave.nodes.filter((n) => n.status === "pass").length;
    const waveChips = [`${passCount}/${wave.nodes.length} pass`];
    const hasActive = wave.nodes.some((n) => n.status === "running" || n.status === "blocked");

    posts.push(renderMilestonePost(waveLabel, waveChips));

    if (wave.allPassed && !hasActive && wave.nodes.length > 3) {
      // Collapsed wave
      posts.push(`<details class="post-expand">
        <summary>${wave.nodes.length} tasks completed</summary>
        <div style="display:grid;gap:8px;margin-top:8px">
          ${wave.nodes.map((n) => renderNodePost(n, playbookName, filter, projectDir, reviewTaskIds)).join("")}
        </div>
      </details>`);
    } else {
      for (const node of wave.nodes) {
        posts.push(await renderNodePostAsync(node, playbookName, filter, projectDir, reviewTaskIds));
      }
    }
  }

  // Run end milestone
  if (meta.status === "complete" || meta.status === "error") {
    const passed = nodes.filter((n) => n.status === "pass").length;
    const failed = nodes.filter((n) => n.status === "error").length;
    posts.push(
      renderMilestonePost(
        meta.status === "complete" ? "Run complete" : "Run ended with errors",
        [`${passed}/${nodes.length} pass`, failed > 0 ? `${failed} errors` : ""].filter(Boolean),
      ),
    );
  }

  return posts.join("\n");
}

function renderNodePost(
  node: TimelineNode,
  playbookName: string,
  filter: TimelineFilter,
  projectDir: string,
  reviewTaskIds: Set<string>,
): string {
  if (reviewTaskIds.has(node.id)) {
    if (filter !== "all" && filter !== "reviews") return "";
    return renderReviewGatePost(node, playbookName, []);
  }
  if (node.status === "error") {
    if (filter !== "all" && filter !== "errors") return "";
    return renderEscalationPost(node);
  }
  if (filter !== "all" && filter !== "tasks") return "";
  return renderTaskPost(node, playbookName);
}

async function renderNodePostAsync(
  node: TimelineNode,
  playbookName: string,
  filter: TimelineFilter,
  projectDir: string,
  reviewTaskIds: Set<string>,
): Promise<string> {
  if (reviewTaskIds.has(node.id)) {
    if (filter !== "all" && filter !== "reviews") return "";
    const reviews = await loadHumanReviews(projectDir, playbookName, node.id);
    return renderReviewGatePost(node, playbookName, reviews);
  }
  if (node.status === "error") {
    if (filter !== "all" && filter !== "errors") return "";
    return renderEscalationPost(node);
  }
  if (filter !== "all" && filter !== "tasks") return "";
  return renderTaskPost(node, playbookName);
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

  // If a run exists, show a timeline preview
  let timelinePreview = "";
  const runstate = await loadRunstate(projectDir, name);
  if (runstate) {
    const timelineFeed = await buildTimelineFeed(projectDir, name, runstate, "all");
    timelinePreview = `
      <article class="feed-post">
        <div class="feed-post-head">
          <div>
            <div class="feed-kicker"><span class="flair flair-execution">latest run</span></div>
            <h2>Execution timeline</h2>
          </div>
          <div class="feed-chip-row">
            <a href="/playbooks/${encodeURIComponent(name)}/run" class="feed-chip">Open full timeline</a>
          </div>
        </div>
        <div class="feed-body">
          ${timelineFeed}
        </div>
      </article>`;
  }

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
        ${timelinePreview}
      </div>
    </section>`,
    `<section class="footnote"><a href="/">Back to studio home</a></section>`,
  ];
}

async function buildRunView(
  projectDir: string,
  name: string,
  filter: TimelineFilter = "all",
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

  const timelineFeed = await buildTimelineFeed(projectDir, name, runstate, filter);

  const sidebarMetrics = `<div class="stack">
    <div class="metric">Total <strong>${totals.total}</strong></div>
    <div class="metric">Pending <strong>${totals.pending}</strong></div>
    <div class="metric">Running <strong>${totals.running}</strong></div>
    <div class="metric">Passed <strong>${totals.passed}</strong></div>
    <div class="metric">Failed <strong>${totals.failed}</strong></div>
  </div>`;

  const sidebarMeta = `<div class="stack">
    <div class="metric">Execution <strong>${escapeHtml(runstate.metadata?.execution_id?.slice(0, 8) || "unknown")}</strong></div>
    <div class="metric">Started <strong>${escapeHtml(runstate.metadata?.generated_at ? formatHumanTimestamp(runstate.metadata.generated_at) : "unknown")}</strong></div>
    <div class="metric">Status <strong>${escapeHtml(runstate.metadata?.status || "unknown")}</strong></div>
  </div>`;

  return [
    `<section class="hero compact">
      <div>
        <div class="eyebrow">Execution timeline</div>
        <h1>${escapeHtml(name)}</h1>
        <p class="lede">Live playbook execution feed.</p>
      </div>
      <div class="status-stack">
        <div class="metric">Total <strong>${totals.total}</strong></div>
        <div class="metric">Running <strong>${totals.running}</strong></div>
        <div class="metric">Passed <strong>${totals.passed}</strong></div>
        <div class="metric">Failed <strong>${totals.failed}</strong></div>
      </div>
    </section>`,
    `<section class="feed-layout">
      <div class="feed-column">
        ${renderFilterBar(name, filter)}
        ${timelineFeed}
      </div>
    </section>`,
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

  const cachedPath = getHumanReportArtifactPath(projectDir, playbook, taskId);
  if (existsSync(cachedPath)) {
    await announceHumanReviewArtifact(projectDir, playbook, taskId);
    return await readFile(cachedPath, "utf8");
  }

  const taskMdPath = resolveTaskMdPath(projectDir, playbook, taskId);
  try {
    const parsed = await parseTaskMd(taskMdPath);
    if (parsed?.def.review?.artifact) {
      const reviewArtifactFile = join(projectDir, parsed.def.review.artifact);
      if (existsSync(reviewArtifactFile)) {
        const raw = await readFile(reviewArtifactFile, "utf8");
        const format = parsed.def.review.format ?? (reviewArtifactFile.endsWith(".html") ? "html" : "md");
        const html = format === "html" ? raw : renderMarkdownArtifact(raw);
        await mkdir(join(projectDir, ".converge", "inventory", playbook, "reports"), { recursive: true });
        await writeFile(cachedPath, html, "utf8");
        await announceHumanReviewArtifact(projectDir, playbook, taskId);
        return html;
      }
      return renderWaitingForArtifact(parsed.def.review.artifact);
    }
  } catch {
    // TASK.md parse failure — fall through to boilerplate
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

function resolveTaskMdPath(projectDir: string, playbook: string, taskId: string): string {
  return join(projectDir, ".converge", "playbooks", playbook, "tasks", taskId, "TASK.md");
}

async function loadTaskReviewPrompt(
  projectDir: string,
  playbook: string,
  taskId: string,
): Promise<string | undefined> {
  try {
    const parsed = await parseTaskMd(resolveTaskMdPath(projectDir, playbook, taskId));
    return parsed?.def.review?.prompt;
  } catch {
    return undefined;
  }
}

function renderMarkdownArtifact(markdown: string): string {
  return `<div class="summary-block report-body">
    <div class="label">Artifact content</div>
    <pre style="white-space: pre-wrap; font-family: inherit; color: var(--text); line-height: 1.7; margin: 0;">${escapeHtml(markdown)}</pre>
  </div>`;
}

function renderWaitingForArtifact(artifactPath: string): string {
  return `<div class="summary-block report-body">
    <div class="label">Artifact pending</div>
    <h3>Waiting for artifact</h3>
    <p class="lead">The review artifact at <code>${escapeHtml(artifactPath)}</code> has not been generated yet.</p>
    <p>The upstream task must complete and produce this file before the review can proceed.</p>
  </div>`;
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
  reviews?: HumanReviewEntry[];
  reviewPrompt?: string;
}): string {
  const contentHtml = args.reportContentHtml;
  const reviews = args.reviews ?? [];
  const latestDecision = reviews.length > 0 ? reviews[reviews.length - 1].decision : undefined;
  const decisionBadge = latestDecision
    ? `<span class="decision-badge decision-${escapeHtml(latestDecision)}">${escapeHtml(humanDecisionLabel(latestDecision))}</span>`
    : `<span class="decision-badge decision-pending">Awaiting review</span>`;
  const promptHtml = args.reviewPrompt
    ? `<p class="lede">${escapeHtml(args.reviewPrompt)}</p>`
    : `<p class="lede">Review the report below. Accept to proceed, or leave feedback for revision.</p>`;
  const historyHtml = reviews.length > 0
    ? `<div class="review-history">
        <h3 class="history-title">Review history</h3>
        ${reviews.map((r, i) => `<div class="history-entry">
          <div class="history-meta">
            <span class="history-index">#${i + 1}</span>
            <span class="history-decision decision-${escapeHtml(r.decision)}">${escapeHtml(humanDecisionLabel(r.decision))}</span>
            <span class="history-time">${escapeHtml(formatHumanTimestamp(r.ts))}</span>
          </div>
          ${r.feedback ? `<p class="history-feedback">${escapeHtml(r.feedback)}</p>` : ""}
        </div>`).join("")}
      </div>`
    : "";
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
          ${promptHtml}
        </div>
        <div class="hero-status">
          ${decisionBadge}
          <span class="hero-meta">${reviews.length} review${reviews.length === 1 ? "" : "s"}</span>
        </div>
      </section>

      <section class="layout">
        <article class="report-shell">
          ${contentHtml}
        </article>

        <aside class="sidebar">
          <h2 class="section-title">Decision</h2>
          <form method="post" action="${escapeHtml(args.submitPath)}" class="form">
            <label>
              <span>Feedback note</span>
              <textarea name="feedback" placeholder="What should be clarified, revised, or rejected before this moves forward?"></textarea>
            </label>
            <div class="feed-actions">
              <button type="submit" name="action" value="accept" class="btn-accept">Accept &amp; continue</button>
              <button type="submit" name="action" value="feedback" class="btn-revise">Request revision</button>
            </div>
          </form>
          ${historyHtml}
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
      .btn-accept {
        background: linear-gradient(135deg, #38bdf8, #22c55e);
        color: #04111b;
      }
      .btn-revise {
        background: rgba(148, 163, 184, 0.12);
        color: #e7eef8;
        border: 1px solid rgba(148, 163, 184, 0.22);
      }
      .hero {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: start;
      }
      .hero-status {
        display: grid;
        gap: 8px;
        align-content: start;
        text-align: right;
      }
      .hero-meta {
        color: var(--muted);
        font-size: 0.88rem;
      }
      .decision-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 7px 14px;
        border-radius: 999px;
        font-size: 0.82rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .decision-approve {
        background: rgba(34, 197, 94, 0.16);
        color: #6ee7a0;
        border: 1px solid rgba(34, 197, 94, 0.24);
      }
      .decision-revise {
        background: rgba(245, 158, 11, 0.16);
        color: #fbbf44;
        border: 1px solid rgba(245, 158, 11, 0.24);
      }
      .decision-reject {
        background: rgba(251, 113, 133, 0.16);
        color: #ffb0bd;
        border: 1px solid rgba(251, 113, 133, 0.24);
      }
      .decision-pending {
        background: rgba(148, 163, 184, 0.12);
        color: #b7c5d9;
        border: 1px solid rgba(148, 163, 184, 0.2);
      }
      .review-history {
        margin-top: 18px;
        display: grid;
        gap: 10px;
      }
      .history-title {
        margin: 0;
        font-size: 0.88rem;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #9cb5cd;
        font-weight: 700;
      }
      .history-entry {
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(2, 6, 23, 0.55);
        border: 1px solid rgba(148, 163, 184, 0.14);
        display: grid;
        gap: 8px;
      }
      .history-meta {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .history-index {
        color: #dce7f7;
        font-weight: 700;
        font-size: 0.86rem;
      }
      .history-decision {
        display: inline-flex;
        padding: 3px 8px;
        border-radius: 999px;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .history-time {
        color: var(--muted);
        font-size: 0.82rem;
      }
      .history-feedback {
        margin: 0;
        color: #d7e2f1;
        font-size: 0.92rem;
        line-height: 1.6;
      }
      @media (max-width: 900px) {
        .hero { grid-template-columns: 1fr; }
        .hero-status { text-align: left; }
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
    template: "",
    reportTitle: body.reportTitle?.trim() || context.taskId,
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
          --bg: #1A202C;
          --card: #2D3748;
          --card-light: #4A5568;
          --panel: #2D3748;
          --panel-border: #4A5568;
          --text: #E2E8F0;
          --muted: #718096;
          --accent: #63B3ED;
          --accent-2: #DD6B20;
          --success: #48BB78;
          --error: #FC8181;
          --upvote: #DD6B20;
          --downvote: #3182CE;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          overflow-x: hidden;
        }
        body::before,
        body::after {
          display: none;
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
          background: var(--card);
          border-radius: 6px;
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
        .hero.compact {
          max-width: 740px;
          margin: 0 auto 12px;
          padding: 16px 18px;
          border-radius: 4px;
          border: 1px solid var(--panel-border);
          background: linear-gradient(180deg, rgba(14, 20, 34, 0.95), rgba(10, 15, 26, 0.95));
        }
        .hero.compact h1 {
          margin: 6px 0 4px;
          font-size: clamp(1.2rem, 2.5vw, 1.6rem);
          letter-spacing: -0.03em;
        }
        .hero.compact .status-stack {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 8px;
        }
        .hero.compact .metric {
          padding: 6px 10px;
          font-size: 0.8rem;
        }
        .feed-layout {
          display: grid;
          gap: 8px;
          max-width: 740px;
          margin: 0 auto;
        }
        .feed-column {
          display: grid;
          gap: 8px;
          min-width: 0;
        }
        .topology-rail {
          display: none;
        }
        .feed-post,
        .reply-card {
          background: var(--card);
          border-radius: 6px;
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
        .badge.pass { background: rgba(52, 211, 153, 0.14); color: #84f1c0; }
        .badge.running { background: rgba(125, 211, 252, 0.14); color: #8ddfff; }
        .badge.error { background: rgba(251, 113, 133, 0.14); color: #ffb0bd; }
        .badge.pending { background: rgba(148, 163, 184, 0.12); color: #d7e4f5; }
        .badge.blocked { background: rgba(245, 158, 11, 0.14); color: #f9d58b; }
        .badge.skipped { background: rgba(148, 163, 184, 0.08); color: #96a4bb; }
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
          max-width: 740px;
          margin: 12px auto 0;
        }
        .plan-md {
          white-space: pre-wrap;
          line-height: 1.6;
          overflow: auto;
          max-height: 28rem;
        }
        .error pre { white-space: pre-wrap; }

        /* Reddit clone layout (Chakra dark theme) */
        .timeline-filter-bar {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          padding: 10px 16px;
          border-radius: 6px;
          background: var(--card);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .filter-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 12px;
          border-radius: 20px;
          border: none;
          background: transparent;
          color: var(--muted);
          font-size: 0.8rem;
          font-weight: 700;
          text-decoration: none;
        }
        .filter-chip:hover {
          background: var(--card-light);
          color: var(--text);
          text-decoration: none;
        }
        .filter-chip.active {
          background: var(--card-light);
          color: var(--text);
        }
        .post {
          display: flex;
          background: var(--card);
          border-radius: 6px;
          padding: 10px 12px;
          width: 100%;
        }
        .upvote-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-right: 12px;
          flex-shrink: 0;
          gap: 2px;
        }
        .vote-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 4px;
          cursor: pointer;
          color: var(--muted);
          font-size: 14px;
          user-select: none;
          background: transparent;
          border: none;
        }
        .vote-arrow:hover { background: var(--card-light); }
        .vote-arrow.vote-up { color: var(--upvote); }
        .vote-arrow.vote-down { color: var(--downvote); }
        .vote-count {
          font-size: 0.8rem;
          font-weight: 700;
          text-align: center;
          min-width: 20px;
          padding: 2px 0;
        }
        .vote-count.status-pass { color: var(--success); }
        .vote-count.status-running { color: var(--accent); }
        .vote-count.status-error { color: var(--error); }
        .vote-count.status-pending { color: var(--muted); }
        .vote-count.status-blocked { color: var(--upvote); }
        .vote-count.status-review { color: var(--upvote); }
        .post-main {
          flex-grow: 1;
          min-width: 0;
        }
        .post-meta {
          font-size: 0.75rem;
          color: var(--muted);
          margin-bottom: 4px;
          line-height: 1.4;
        }
        .post-meta .sub-link {
          color: var(--muted);
          font-weight: 700;
        }
        .post-meta .author { color: var(--text); }
        .post-title {
          display: block;
          margin: 2px 0 4px;
          font-size: 1em;
          font-weight: 600;
          color: var(--text);
          line-height: 1.3;
        }
        .post-body {
          color: var(--text);
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 4px;
        }
        .post-body p { margin: 0 0 8px; }
        .post-body pre {
          margin: 8px 0;
          padding: 10px 12px;
          border-radius: 6px;
          background: #1A202C;
          white-space: pre-wrap;
          font-size: 0.84rem;
          color: var(--text);
        }
        .post-actions {
          display: flex;
          align-items: center;
          gap: 0;
          margin-top: 4px;
          color: var(--muted);
          font-weight: 700;
          font-size: 0.75rem;
          flex-wrap: wrap;
        }
        .action-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px;
          border-radius: 4px;
          color: var(--muted);
          font-weight: 700;
          font-size: 0.8rem;
          text-decoration: none;
          cursor: pointer;
          border: none;
          background: transparent;
        }
        .action-link:hover {
          background: var(--card-light);
          color: var(--text);
          text-decoration: none;
        }
        .action-link.action-approve { color: var(--success); }
        .action-link.action-approve:hover { background: rgba(72, 187, 120, 0.15); }
        .action-link.action-revise { color: var(--upvote); }
        .action-link.action-revise:hover { background: rgba(221, 107, 32, 0.15); }
        .action-link.action-reject { color: var(--error); }
        .action-link.action-reject:hover { background: rgba(252, 129, 129, 0.15); }
        .post-expand {
          margin-top: 8px;
        }
        .post-expand summary {
          cursor: pointer;
          color: var(--accent);
          font-size: 0.8rem;
          font-weight: 700;
          padding: 4px 0;
        }
        .post-expand[open] summary { margin-bottom: 8px; }
        .post.post-milestone {
          background: transparent;
          padding: 6px 16px;
          border-radius: 0;
          border-bottom: 1px solid var(--card-light);
        }
        .post.post-milestone .post-main {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .post.post-milestone .post-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0;
          color: var(--muted);
        }
        .post.post-milestone .post-meta { margin: 0; }
        .post.post-milestone .upvote-bar { display: none; }

        /* Comment threads (Reddit nested replies) */
        .comment-thread {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 16px;
        }
        .comment-wrapper {
          display: flex;
          flex-direction: row;
        }
        .thread-line {
          width: 20px;
          flex-shrink: 0;
          display: flex;
          justify-content: center;
          cursor: pointer;
          padding: 4px 0;
        }
        .thread-line-inner {
          width: 2px;
          height: 100%;
          background: var(--card-light);
          transition: background 120ms ease;
        }
        .thread-line:hover .thread-line-inner {
          background: var(--upvote);
        }
        .comment-content {
          flex-grow: 1;
          min-width: 0;
        }
        .comment {
          background: var(--card);
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 8px;
        }
        .comment-meta {
          font-size: 0.75rem;
          color: var(--muted);
          margin-bottom: 4px;
        }
        .comment-meta .author { color: var(--text); }
        .comment-meta .badge {
          padding: 2px 6px;
          font-size: 0.65rem;
        }
        .comment-body {
          color: var(--text);
          line-height: 1.5;
          font-size: 0.9rem;
        }
        .comment-actions {
          display: flex;
          align-items: center;
          margin-top: 6px;
          color: var(--muted);
          font-weight: 700;
          font-size: 0.75rem;
        }
        .comment-form {
          margin-top: 12px;
          background: var(--card);
          border-radius: 6px;
          padding: 12px 16px;
        }
        .comment-form textarea {
          width: 100%;
          min-height: 4rem;
          font-size: 0.9rem;
          padding: 10px 12px;
          border-radius: 6px;
          margin-bottom: 8px;
          background: #1A202C;
          border: 1px solid var(--card-light);
          color: var(--text);
        }
        .comment-form .post-actions {
          justify-content: flex-start;
        }

        /* Attempt threads inside posts */
        .attempt-thread {
          display: flex;
          flex-direction: column;
          gap: 0;
          margin-top: 8px;
        }
        .attempt-wrapper {
          display: flex;
          flex-direction: row;
        }
        .attempt-reply {
          flex-grow: 1;
          padding: 8px 12px;
          font-size: 0.84rem;
          border-radius: 6px;
          margin-bottom: 4px;
          background: #1A202C;
        }
        .attempt-reply.attempt-pass { border-left: 3px solid var(--success); }
        .attempt-reply.attempt-error { border-left: 3px solid var(--error); }
        .attempt-reply-meta {
          display: flex;
          gap: 8px;
          color: var(--muted);
          font-size: 0.75rem;
          margin-bottom: 2px;
        }
        .spawn-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 8px;
        }
        .spawn-item {
          padding: 6px 10px;
          font-size: 0.8rem;
          color: var(--text);
          background: #1A202C;
          border-radius: 6px;
        }

        @media (max-width: 960px) {
          .grid, .grid.split { grid-template-columns: 1fr; }
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

// ─── Living Playbook Execution View ──────────────────────────────────────────
// A book that writes itself — paper surfaces, warm off-white, soft shadows,
// serif-free clean sans type, shimmer for running tasks, collapse/expand chapters,
// task body slide-out panel, multiple view modes (book / timeline / grid).
//
// Color palette:
//   canvas:  #fafaf8  — warm off-white paper ground
//   leaf:    #f5f4f0  — slightly deeper warm paper for lifted sections
//   shadow:  #e8e4db  — warm gray for hairlines and dividers
//   ink:     #1c1b18  — deep warm near-black for text
//   ink-2:   #4a4540  — secondary text
//   ink-3:   #8a8480  — tertiary / muted text
//   active:  #b45309  — amber-warm for running / active state
//   good:    #166534  — deep forest green for pass
//   warn:    #92400e  — amber-brown for revise / blocked
//   bad:     #991b1b  — deep red for failed / rejected
//   review:  #1e3a5f  — deep navy for awaiting review

function buildLivingPlaybookView(
  runstate: any,
  playbookName: string,
  projectDir: string,
): string {
  const meta = runstate.metadata || {};
  const nodes = Object.values(runstate.dag?.nodes ?? {}) as any[];
  const executions = nodes.filter((n: any) => n.from_seed).length;

  // Group tasks into chapters by extracting chapter from task path or using index-based grouping
  const chapters = computeLivingChapters(nodes);

  // View mode selector
  const viewModes = ["book", "timeline", "grid", "focus"];
  const activeView = "book";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(playbookName)} — Living Playbook</title>
  ${authCleanupScript()}
  <style>
    ${renderLivingPlaybookStyles()}
  </style>
</head>
<body>
  ${renderLivingHeader(meta, playbookName, nodes)}
  ${renderLivingToolbar(viewModes, activeView)}
  ${renderLivingBook(chapters, playbookName)}
  <div class="task-drawer-shell" id="task-drawer-shell" aria-hidden="true">
    <div class="task-drawer-backdrop" id="task-drawer-backdrop"></div>
    <div class="task-drawer" id="task-drawer" role="dialog" aria-modal="true" aria-label="Task details">
      <button class="drawer-close" id="drawer-close" aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
          <path d="M15 5L5 15M5 5l10 10"/>
        </svg>
      </button>
      <div class="drawer-content" id="drawer-content"></div>
    </div>
  </div>
  <script>
    ${renderLivingPlaybookScripts()}
  </script>
</body>
</html>`;
}

function renderLivingHeader(meta: any, playbookName: string, nodes: any[]): string {
  const passed = nodes.filter((n: any) => n.status === "pass").length;
  const running = nodes.filter((n: any) => n.status === "running").length;
  const failed = nodes.filter((n: any) => n.status === "error").length;
  const blocked = nodes.filter((n: any) => n.status === "blocked").length;
  const pending = nodes.filter((n: any) => n.status === "pending").length;
  const total = nodes.length;
  const iteration = meta.iteration ?? meta.convergence_iteration ?? 0;
  const elapsed = computeElapsed(meta.started_at);
  const status = meta.status || "running";

  const statusLabel = status === "running" ? "Running" :
    status === "complete" ? "Complete" :
    status === "error" ? "Errors" :
    status === "stalled" ? "Stalled" :
    capitalize(status);

  return `<header class="lp-header">
    <div class="lp-header-left">
      <div class="lp-eyebrow">Living Playbook</div>
      <h1 class="lp-title">${escapeHtml(playbookName)}</h1>
    </div>
    <div class="lp-header-right">
      <div class="lp-header-metrics">
        <div class="lp-metric">
          <span class="lp-metric-value">${total}</span>
          <span class="lp-metric-label">Tasks</span>
        </div>
        ${running > 0 ? `<div class="lp-metric lp-metric-active">
          <span class="lp-metric-value shimmer-text">${running}</span>
          <span class="lp-metric-label">Running</span>
        </div>` : ""}
        ${passed > 0 ? `<div class="lp-metric lp-metric-good">
          <span class="lp-metric-value">${passed}</span>
          <span class="lp-metric-label">Passed</span>
        </div>` : ""}
        ${failed > 0 ? `<div class="lp-metric lp-metric-bad">
          <span class="lp-metric-value">${failed}</span>
          <span class="lp-metric-label">Failed</span>
        </div>` : ""}
      </div>
      <div class="lp-header-meta">
        <span class="lp-status-badge lp-status-${escapeHtml(status)}">${escapeHtml(statusLabel)}</span>
        ${iteration > 0 ? `<span class="lp-iteration">Loop ${iteration}</span>` : ""}
        ${elapsed ? `<span class="lp-elapsed">${elapsed}</span>` : ""}
      </div>
    </div>
  </header>`;
}

function renderLivingToolbar(viewModes: string[], activeView: string): string {
  const chips = viewModes.map((mode) => {
    const label = mode === "book" ? "Book" : mode === "timeline" ? "Timeline" : mode === "grid" ? "Grid" : "Focus";
    const icon = mode === "book" ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2h4m0 0v8m0-8h6m0 0v8m0-8H2"/></svg>` :
      mode === "timeline" ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 3h10M2 7h7M2 11h5"/></svg>` :
      mode === "grid" ? `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 2h4v4H2zM8 2h4v4H8zM2 8h4v4H2zM8 8h4v4H8z"/></svg>` :
      `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="7" cy="7" r="5"/><path d="M7 5v2l1.5 1.5"/></svg>`;
    const cls = mode === activeView ? "lp-tool-chip active" : "lp-tool-chip";
    return `<button class="${cls}" data-view="${mode}">${icon}<span>${label}</span></button>`;
  }).join("");

  return `<nav class="lp-toolbar">
    <div class="lp-toolbar-left">
      <button class="lp-collapse-all" id="lp-collapse-all">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5l4 4 4-4"/></svg>
        <span>Collapse all</span>
      </button>
      <button class="lp-expand-all" id="lp-expand-all">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 9l4-4 4 4"/></svg>
        <span>Expand all</span>
      </button>
    </div>
    <div class="lp-toolbar-right">
      <div class="lp-view-picker">${chips}</div>
    </div>
  </nav>`;
}

function renderLivingBook(chapters: LivingChapter[], playbookName: string): string {
  if (chapters.length === 0) {
    return `<main class="lp-book lp-book-empty">
      <div class="lp-empty-state">
        <svg class="lp-empty-icon" width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1">
          <rect x="8" y="6" width="24" height="36" rx="2"/>
          <path d="M14 14h12M14 20h10M14 26h8"/>
          <path d="M24 14l12 4-12 4" stroke-linecap="round"/>
        </svg>
        <h2>No tasks yet</h2>
        <p>The playbook is running. Tasks will appear here as the execution progresses.</p>
      </div>
    </main>`;
  }

  const chapterCards = chapters.map((ch, ci) => {
    const progress = ch.tasks.filter((t: any) => t.status === "pass").length;
    const total = ch.tasks.length;
    const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
    const isComplete = progress === total && total > 0;
    const hasRunning = ch.tasks.some((t: any) => t.status === "running" || t.status === "ready");
    const hasFailed = ch.tasks.some((t: any) => t.status === "error");
    const hasReview = ch.tasks.some((t: any) => t.status === "review" || t.review);

    return renderLivingChapter(ch, ci, {
      progress,
      total,
      pct,
      isComplete,
      hasRunning,
      hasFailed,
      hasReview,
      playbookName,
    });
  }).join("");

  return `<main class="lp-book">
    <div class="lp-book-inner">
      ${chapterCards}
    </div>
  </main>`;
}

interface LivingChapter {
  id: string;
  title: string;
  subtitle: string;
  tasks: any[];
}

function computeLivingChapters(nodes: any[]): LivingChapter[] {
  // Group by playbook-level subdirectory path (e.g. tasks/chapter-1/... → "Chapter 1")
  // Fall back to wave-based grouping
  const nodeMap = new Map(nodes.map((n) => [String(n.id), n]));

  // Topological sort into waves
  const layers = new Map<string, number>();
  function getLayer(id: string): number {
    if (layers.has(id)) return layers.get(id)!;
    const node = nodeMap.get(id);
    if (!node) { layers.set(id, 0); return 0; }
    const deps = Array.isArray(node.depends_on) ? node.depends_on : [];
    if (deps.length === 0) { layers.set(id, 0); return 0; }
    const maxParent = Math.max(...deps.map((d: string) => nodeMap.has(d) ? getLayer(d) : -1), -1);
    const layer = maxParent + 1;
    layers.set(id, layer);
    return layer;
  }
  for (const node of nodes) getLayer(String(node.id));

  // Spawned tasks go under their parent
  const spawned = new Set<string>();
  for (const node of nodes) {
    const children = Array.isArray(node.spawned_children) ? node.spawned_children : [];
    for (const c of children) spawned.add(String(c));
  }
  const topLevel = nodes.filter((n) => !spawned.has(String(n.id)));

  // Group by wave layer
  const waveMap = new Map<number, any[]>();
  for (const node of topLevel) {
    const layer = layers.get(String(node.id)) ?? 0;
    if (!waveMap.has(layer)) waveMap.set(layer, []);
    waveMap.get(layer)!.push(node);
  }

  const sortedLayers = [...waveMap.keys()].sort((a, b) => a - b);
  return sortedLayers.map((layer, ci) => {
    const waveNodes = waveMap.get(layer)!;
    // Derive chapter title from first task's path
    const firstTask = waveNodes[0];
    const pathParts = (firstTask?.path || firstTask?.id || "").split("/");
    // Prefer human-readable chapter from task path segments
    const chapterSlug = pathParts.find((p: string) =>
      p !== "tasks" && p !== "playbooks" && p !== ".converge" && !p.startsWith("task-")
    ) || null;
    const title = chapterSlug
      ? humanizeSlug(String(chapterSlug))
      : layer === 0 ? "Foundation" : `Phase ${ci + 1}`;

    return {
      id: `chapter-${ci}`,
      title,
      subtitle: `${waveNodes.length} task${waveNodes.length !== 1 ? "s" : ""}`,
      tasks: waveNodes.sort((a: any, b: any) => {
        if (a.started_at && b.started_at) return a.started_at.localeCompare(b.started_at);
        return String(a.id).localeCompare(String(b.id));
      }),
    };
  });
}

function renderLivingChapter(
  ch: LivingChapter,
  chapterIndex: number,
  opts: {
    progress: number; total: number; pct: number;
    isComplete: boolean; hasRunning: boolean; hasFailed: boolean; hasReview: boolean;
    playbookName: string;
  },
): string {
  const statusDot = opts.isComplete
    ? `<span class="lp-chapter-dot lp-chapter-dot-good"></span>`
    : opts.hasFailed
      ? `<span class="lp-chapter-dot lp-chapter-dot-bad"></span>`
      : opts.hasReview
        ? `<span class="lp-chapter-dot lp-chapter-dot-review"></span>`
        : opts.hasRunning
          ? `<span class="lp-chapter-dot lp-chapter-dot-active"></span>`
          : `<span class="lp-chapter-dot lp-chapter-dot-pending"></span>`;

  const taskRows = ch.tasks.map((task) =>
    renderLivingTask(task, opts.playbookName)
  ).join("");

  const progressBar = opts.total > 0 ? `
    <div class="lp-chapter-progress-bar">
      <div class="lp-chapter-progress-fill ${opts.isComplete ? "lp-progress-complete" : opts.hasRunning ? "lp-progress-active" : ""}" style="width:${opts.pct}%"></div>
    </div>
    <span class="lp-chapter-progress-label">${opts.progress}/${opts.total}</span>
  ` : "";

  return `
  <article class="lp-chapter ${opts.isComplete ? "lp-chapter-done" : opts.hasRunning ? "lp-chapter-active" : ""}" data-chapter="${ch.id}">
    <div class="lp-chapter-header" data-chapter-toggle="${ch.id}">
      <div class="lp-chapter-title-row">
        ${statusDot}
        <h2 class="lp-chapter-title">${escapeHtml(ch.title)}</h2>
        <span class="lp-chapter-subtitle">${escapeHtml(ch.subtitle)}</span>
      </div>
      <div class="lp-chapter-controls">
        ${progressBar}
        <button class="lp-chapter-toggle" aria-label="Collapse chapter">
          <svg class="lp-toggle-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M4 6l4 4 4-4"/>
          </svg>
        </button>
      </div>
    </div>
    <div class="lp-chapter-body" data-chapter-body="${ch.id}">
      <div class="lp-task-list">
        ${taskRows}
      </div>
    </div>
  </article>`;
}

function renderLivingTask(task: any, playbookName: string): string {
  const status = task.status || "pending";
  const title = task.title || task.id || "Unnamed task";
  const description = task.description || "";
  const duration = task.duration_ms > 0 ? formatDuration(task.duration_ms) : "";
  const attempts = task.attempts || 0;
  const attempts_detail = Array.isArray(task.attempts_detail) ? task.attempts_detail : [];
  const checks = Array.isArray(task.checks) ? task.checks : [];
  const outputs = Array.isArray(task.outputs) ? task.outputs : [];
  const skill = Array.isArray(task.skill) ? task.skill.join(", ") : (task.skill || "");
  const spawnedChildren = Array.isArray(task.spawned_children) ? task.spawned_children : [];
  const review = task.review;
  const dependsOn = Array.isArray(task.depends_on) ? task.depends_on : [];

  // Status icon
  const statusIcon = status === "pass" ? `<svg class="lp-status-icon lp-status-icon-good" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8l3.5 3.5L13 5"/></svg>` :
    status === "error" || status === "failed" ? `<svg class="lp-status-icon lp-status-icon-bad" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>` :
    status === "running" ? `<span class="lp-status-icon lp-status-icon-active shimmer-icon">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="4"/></svg>
    </span>` :
    status === "blocked" ? `<svg class="lp-status-icon lp-status-icon-warn" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>` :
    status === "review" || review ? `<svg class="lp-status-icon lp-status-icon-review" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>` :
    `<span class="lp-status-icon lp-status-icon-pending"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="8" cy="8" r="6"/></svg></span>`;

  // Status label
  const statusLabel = status === "pass" ? "Passed" :
    status === "error" || status === "failed" ? "Failed" :
    status === "running" ? "Running" :
    status === "blocked" ? "Blocked" :
    status === "review" ? "Awaiting review" :
    status === "ready" ? "Ready" :
    status === "skipped" ? "Skipped" :
    capitalize(status);

  // Mode badge
  const modeLabel = task.mode || task.dag_type || "";
  const modeBadge = modeLabel && modeLabel !== "normal" && modeLabel !== "leaf"
    ? `<span class="lp-mode-badge lp-mode-${escapeHtml(modeLabel)}">${escapeHtml(modeLabel)}</span>`
    : "";

  // Spawned count
  const spawnedBadge = spawnedChildren.length > 0
    ? `<span class="lp-spawned-badge">${spawnedChildren.length} spawned</span>`
    : "";

  // Attempts badge
  const attemptsBadge = attempts > 1
    ? `<span class="lp-attempts-badge">${attempts} attempts</span>`
    : "";

  // Duration
  const durationHtml = duration
    ? `<span class="lp-task-duration">${escapeHtml(duration)}</span>`
    : status === "running"
      ? `<span class="lp-task-duration shimmer-text">running…</span>`
      : "";

  // Body slide-out trigger
  const bodyTrigger = description || task.body || task.task_def?.body
    ? `<button class="lp-task-body-toggle" data-task-id="${escapeHtml(String(task.id))}" aria-label="View task details">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="10" height="10" rx="1"/><path d="M5 5h4M5 7h3M5 9h2"/></svg>
        <span>Details</span>
      </button>`
    : "";

  // Check results
  const checksHtml = checks.length > 0
    ? `<div class="lp-task-checks">
        ${checks.map((check: any) => {
          const passed = check.passed ?? check.exit_code === 0;
          const cls = passed ? "lp-check-pass" : check.exit_code != null ? "lp-check-fail" : "lp-check-pending";
          const icon = passed
            ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5l2.5 2.5L9 3"/></svg>`
            : check.exit_code != null
              ? `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l5 5M8 3l-5 5"/></svg>`
              : `<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="5.5" cy="5.5" r="4"/></svg>`;
          const desc = check.description || check.name || "Check";
          return `<div class="lp-check ${cls}">${icon}<span>${escapeHtml(desc)}</span></div>`;
        }).join("")}
      </div>`
    : "";

  // Output artifacts
  const outputsHtml = outputs.length > 0
    ? `<div class="lp-task-outputs">
        ${outputs.map((o: string) => {
          const sizeLabel = "";
          return `<span class="lp-output-chip">${escapeHtml(o.split("/").pop() || o)}</span>`;
        }).join("")}
      </div>`
    : "";

  // Dependencies
  const depsHtml = dependsOn.length > 0
    ? `<span class="lp-task-deps">depends on ${dependsOn.map((d: string) => escapeHtml(d)).join(", ")}</span>`
    : "";

  return `
  <div class="lp-task lp-task-${escapeHtml(status)} ${status === "running" ? "lp-task-running" : ""}" data-task-id="${escapeHtml(String(task.id))}">
    <div class="lp-task-row">
      <div class="lp-task-status">${statusIcon}</div>
      <div class="lp-task-content">
        <div class="lp-task-title-row">
          <span class="lp-task-title">${escapeHtml(title)}</span>
          ${modeBadge}
          ${spawnedBadge}
          ${attemptsBadge}
        </div>
        <div class="lp-task-meta">
          <span class="lp-task-status-label">${escapeHtml(statusLabel)}</span>
          ${durationHtml}
          ${depsHtml}
        </div>
        ${checksHtml}
        ${outputsHtml}
      </div>
      <div class="lp-task-actions">
        ${duration && status === "running" ? `<span class="lp-live-counter" data-task-id="${escapeHtml(String(task.id))}"></span>` : ""}
        ${bodyTrigger}
      </div>
    </div>
  </div>`;
}

function renderLivingPlaybookStyles(): string {
  return `
    *, *::before, *::after { box-sizing: border-box; }

    :root {
      --lp-canvas: #fafaf8;
      --lp-leaf: #f5f4f0;
      --lp-shadow: #e8e4db;
      --lp-shadow-deep: #d4cfc6;
      --lp-ink: #1c1b18;
      --lp-ink-2: #4a4540;
      --lp-ink-3: #8a8480;
      --lp-active: #b45309;
      --lp-good: #166534;
      --lp-warn: #92400e;
      --lp-bad: #991b1b;
      --lp-review: #1e3a5f;
      --lp-font-body: 'Geist', 'Geist Fallback', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      --lp-font-mono: 'Geist Mono', 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace;
    }

    @keyframes lp-shimmer {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.55; }
    }

    @keyframes lp-pulse-ring {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.6); opacity: 0; }
    }

    @keyframes lp-drawer-enter {
      from { opacity: 0; transform: translateX(32px); }
      to { opacity: 1; transform: translateX(0); }
    }

    @keyframes lp-chapter-enter {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes lp-shimmer-bar {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .shimmer-text { animation: lp-shimmer 1.6s ease-in-out infinite; }
    .shimmer-icon { animation: lp-shimmer 1.4s ease-in-out infinite; }

    body {
      margin: 0;
      font-family: var(--lp-font-body);
      background: var(--lp-canvas);
      color: var(--lp-ink);
      min-height: 100dvh;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* ─── Header ─── */
    .lp-header {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      padding: 28px 48px 24px;
      background: var(--lp-canvas);
      border-bottom: 1px solid var(--lp-shadow);
    }

    .lp-header-left { display: grid; gap: 6px; }

    .lp-eyebrow {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--lp-shadow-deep);
      background: var(--lp-leaf);
      color: var(--lp-ink-3);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
      font-weight: 600;
      width: fit-content;
    }

    .lp-title {
      margin: 0;
      font-size: clamp(1.4rem, 3vw, 2rem);
      font-weight: 600;
      letter-spacing: -0.04em;
      line-height: 1.1;
      color: var(--lp-ink);
    }

    .lp-header-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 12px;
      flex-shrink: 0;
    }

    .lp-header-metrics {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .lp-metric {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 14px;
      border-radius: 12px;
      border: 1px solid var(--lp-shadow);
      background: var(--lp-leaf);
      min-width: 56px;
    }

    .lp-metric-value {
      font-size: 1.15rem;
      font-weight: 700;
      line-height: 1;
      color: var(--lp-ink);
      font-variant-numeric: tabular-nums;
    }

    .lp-metric-label {
      font-size: 0.7rem;
      color: var(--lp-ink-3);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-weight: 500;
      margin-top: 3px;
    }

    .lp-metric-active .lp-metric-value { color: var(--lp-active); }
    .lp-metric-good .lp-metric-value { color: var(--lp-good); }
    .lp-metric-bad .lp-metric-value { color: var(--lp-bad); }

    .lp-header-meta {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .lp-status-badge {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 999px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .lp-status-running {
      background: rgba(180, 83, 9, 0.12);
      color: var(--lp-active);
      border: 1px solid rgba(180, 83, 9, 0.25);
    }

    .lp-status-complete {
      background: rgba(22, 101, 52, 0.1);
      color: var(--lp-good);
      border: 1px solid rgba(22, 101, 52, 0.2);
    }

    .lp-status-error, .lp-status-stalled {
      background: rgba(153, 27, 27, 0.1);
      color: var(--lp-bad);
      border: 1px solid rgba(153, 27, 27, 0.2);
    }

    .lp-iteration, .lp-elapsed {
      font-size: 0.82rem;
      color: var(--lp-ink-3);
      font-variant-numeric: tabular-nums;
      font-family: var(--lp-font-mono);
    }

    /* ─── Toolbar ─── */
    .lp-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 12px 48px;
      background: var(--lp-canvas);
      border-bottom: 1px solid var(--lp-shadow);
      position: sticky;
      top: 0;
      z-index: 40;
    }

    .lp-toolbar-left, .lp-toolbar-right {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .lp-collapse-all, .lp-expand-all {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--lp-shadow);
      background: var(--lp-leaf);
      color: var(--lp-ink-2);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--lp-font-body);
      transition: background 140ms ease, border-color 140ms ease;
    }

    .lp-collapse-all:hover, .lp-expand-all:hover {
      background: var(--lp-shadow);
    }

    .lp-view-picker {
      display: flex;
      gap: 4px;
      padding: 4px;
      border-radius: 10px;
      background: var(--lp-leaf);
      border: 1px solid var(--lp-shadow);
    }

    .lp-tool-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 7px;
      border: none;
      background: transparent;
      color: var(--lp-ink-3);
      font-size: 0.82rem;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--lp-font-body);
      transition: background 140ms ease, color 140ms ease;
    }

    .lp-tool-chip:hover {
      background: var(--lp-shadow);
      color: var(--lp-ink);
    }

    .lp-tool-chip.active {
      background: var(--lp-canvas);
      color: var(--lp-ink);
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    /* ─── Book ─── */
    .lp-book {
      padding: 32px 48px 80px;
    }

    .lp-book-inner {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .lp-book-empty {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
    }

    .lp-empty-state {
      display: grid;
      gap: 12px;
      align-items: center;
      text-align: center;
      padding: 48px;
    }

    .lp-empty-icon {
      color: var(--lp-ink-3);
      opacity: 0.4;
    }

    .lp-empty-state h2 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      color: var(--lp-ink-2);
    }

    .lp-empty-state p {
      margin: 0;
      color: var(--lp-ink-3);
      line-height: 1.6;
      max-width: 40ch;
    }

    /* ─── Chapter ─── */
    .lp-chapter {
      border-radius: 20px;
      background: var(--lp-canvas);
      border: 1px solid var(--lp-shadow);
      box-shadow: 0 2px 12px rgba(28, 27, 24, 0.06);
      overflow: hidden;
      animation: lp-chapter-enter 400ms cubic-bezier(0.16, 1, 0.3, 1) both;
    }

    .lp-chapter:nth-child(1) { animation-delay: 0ms; }
    .lp-chapter:nth-child(2) { animation-delay: 80ms; }
    .lp-chapter:nth-child(3) { animation-delay: 160ms; }
    .lp-chapter:nth-child(4) { animation-delay: 240ms; }
    .lp-chapter:nth-child(5) { animation-delay: 320ms; }
    .lp-chapter:nth-child(n+6) { animation-delay: 400ms; }

    .lp-chapter-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 20px 24px;
      cursor: pointer;
      user-select: none;
      transition: background 140ms ease;
    }

    .lp-chapter-header:hover {
      background: rgba(232, 228, 219, 0.4);
    }

    .lp-chapter-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }

    .lp-chapter-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .lp-chapter-dot-good { background: var(--lp-good); }
    .lp-chapter-dot-bad { background: var(--lp-bad); }
    .lp-chapter-dot-active { background: var(--lp-active); animation: lp-shimmer 1.6s ease-in-out infinite; }
    .lp-chapter-dot-review { background: var(--lp-review); }
    .lp-chapter-dot-pending { background: var(--lp-shadow-deep); }

    .lp-chapter-title {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--lp-ink);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .lp-chapter-subtitle {
      font-size: 0.82rem;
      color: var(--lp-ink-3);
      white-space: nowrap;
    }

    .lp-chapter-controls {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .lp-chapter-progress-bar {
      width: 80px;
      height: 4px;
      border-radius: 999px;
      background: var(--lp-shadow);
      overflow: hidden;
    }

    .lp-chapter-progress-fill {
      height: 100%;
      border-radius: 999px;
      background: var(--lp-shadow-deep);
      transition: width 600ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .lp-progress-complete { background: var(--lp-good); }
    .lp-progress-active {
      background: linear-gradient(90deg, var(--lp-active), var(--lp-warn));
      background-size: 200% 100%;
      animation: lp-shimmer-bar 2s linear infinite;
    }

    .lp-chapter-progress-label {
      font-size: 0.78rem;
      color: var(--lp-ink-3);
      font-variant-numeric: tabular-nums;
      font-family: var(--lp-font-mono);
      min-width: 32px;
    }

    .lp-chapter-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      border: 1px solid var(--lp-shadow);
      background: var(--lp-leaf);
      color: var(--lp-ink-3);
      cursor: pointer;
      transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1), background 140ms ease;
      flex-shrink: 0;
    }

    .lp-chapter-toggle:hover { background: var(--lp-shadow); color: var(--lp-ink-2); }
    .lp-chapter-toggle .lp-toggle-icon { transition: transform 240ms cubic-bezier(0.16, 1, 0.3, 1); }

    .lp-chapter.collapsed .lp-chapter-body { display: none; }
    .lp-chapter.collapsed .lp-chapter-toggle .lp-toggle-icon { transform: rotate(-90deg); }
    .lp-chapter.collapsed .lp-chapter-toggle { transform: rotate(0deg); }

    .lp-chapter-body {
      border-top: 1px solid var(--lp-shadow);
      padding: 8px 16px 16px;
    }

    .lp-task-list {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    /* ─── Task ─── */
    .lp-task {
      border-radius: 14px;
      border: 1px solid transparent;
      transition: background 140ms ease, border-color 140ms ease;
    }

    .lp-task:hover {
      background: rgba(232, 228, 219, 0.3);
      border-color: var(--lp-shadow);
    }

    .lp-task-running {
      background: rgba(180, 83, 9, 0.04);
      border-color: rgba(180, 83, 9, 0.15);
    }

    .lp-task-pass {
      background: rgba(22, 101, 52, 0.03);
      border-color: rgba(22, 101, 52, 0.1);
    }

    .lp-task-error, .lp-task-failed {
      background: rgba(153, 27, 27, 0.03);
      border-color: rgba(153, 27, 27, 0.1);
    }

    .lp-task-blocked, .lp-task-review {
      background: rgba(30, 58, 95, 0.03);
      border-color: rgba(30, 58, 95, 0.1);
    }

    .lp-task-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 14px 16px;
    }

    .lp-task-status {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--lp-leaf);
      border: 1px solid var(--lp-shadow);
      flex-shrink: 0;
      margin-top: 1px;
    }

    .lp-status-icon { display: flex; align-items: center; justify-content: center; }
    .lp-status-icon-good { color: var(--lp-good); }
    .lp-status-icon-bad { color: var(--lp-bad); }
    .lp-status-icon-active { color: var(--lp-active); }
    .lp-status-icon-warn { color: var(--lp-warn); }
    .lp-status-icon-review { color: var(--lp-review); }
    .lp-status-icon-pending { color: var(--lp-ink-3); opacity: 0.5; }

    .lp-task-content {
      flex-grow: 1;
      min-width: 0;
      display: grid;
      gap: 6px;
    }

    .lp-task-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .lp-task-title {
      font-size: 0.95rem;
      font-weight: 500;
      color: var(--lp-ink);
      line-height: 1.3;
    }

    .lp-mode-badge {
      display: inline-flex;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      background: var(--lp-leaf);
      border: 1px solid var(--lp-shadow);
      color: var(--lp-ink-3);
    }

    .lp-mode-spawner .lp-mode-badge { background: rgba(30, 58, 95, 0.08); color: var(--lp-review); border-color: rgba(30, 58, 95, 0.2); }
    .lp-mode-converger .lp-mode-badge { background: rgba(180, 83, 9, 0.08); color: var(--lp-active); border-color: rgba(180, 83, 9, 0.2); }
    .lp-mode-gateway .lp-mode-badge { background: rgba(146, 64, 14, 0.08); color: var(--lp-warn); border-color: rgba(146, 64, 14, 0.2); }

    .lp-spawned-badge {
      display: inline-flex;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
      background: rgba(22, 101, 52, 0.08);
      color: var(--lp-good);
      border: 1px solid rgba(22, 101, 52, 0.18);
    }

    .lp-attempts-badge {
      display: inline-flex;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 500;
      background: var(--lp-leaf);
      color: var(--lp-ink-3);
      border: 1px solid var(--lp-shadow);
    }

    .lp-task-meta {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .lp-task-status-label {
      font-size: 0.78rem;
      color: var(--lp-ink-3);
      font-weight: 500;
    }

    .lp-task-duration {
      font-size: 0.78rem;
      color: var(--lp-ink-3);
      font-family: var(--lp-font-mono);
      font-variant-numeric: tabular-nums;
    }

    .lp-task-deps {
      font-size: 0.78rem;
      color: var(--lp-ink-3);
    }

    .lp-task-deps::before { content: "→ "; }

    /* ─── Checks ─── */
    .lp-task-checks {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .lp-check {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .lp-check-pass { background: rgba(22, 101, 52, 0.08); color: var(--lp-good); }
    .lp-check-fail { background: rgba(153, 27, 27, 0.08); color: var(--lp-bad); }
    .lp-check-pending { background: var(--lp-leaf); color: var(--lp-ink-3); border: 1px solid var(--lp-shadow); }

    /* ─── Outputs ─── */
    .lp-task-outputs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .lp-output-chip {
      display: inline-flex;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 0.72rem;
      font-family: var(--lp-font-mono);
      background: var(--lp-leaf);
      color: var(--lp-ink-2);
      border: 1px solid var(--lp-shadow);
    }

    /* ─── Task Actions ─── */
    .lp-task-actions {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      flex-shrink: 0;
    }

    .lp-task-body-toggle {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 8px;
      border: 1px solid var(--lp-shadow);
      background: var(--lp-leaf);
      color: var(--lp-ink-3);
      font-size: 0.78rem;
      font-weight: 500;
      cursor: pointer;
      font-family: var(--lp-font-body);
      opacity: 0;
      transition: opacity 140ms ease, background 140ms ease, border-color 140ms ease;
    }

    .lp-task:hover .lp-task-body-toggle {
      opacity: 1;
    }

    .lp-task-body-toggle:hover {
      background: var(--lp-shadow);
      color: var(--lp-ink-2);
    }

    .lp-live-counter {
      font-size: 0.72rem;
      font-family: var(--lp-font-mono);
      color: var(--lp-active);
      animation: lp-shimmer 1.6s ease-in-out infinite;
    }

    /* ─── Drawer ─── */
    .task-drawer-shell {
      position: fixed;
      inset: 0;
      z-index: 200;
      pointer-events: none;
      opacity: 0;
      transition: opacity 240ms ease;
    }

    .task-drawer-shell[aria-hidden="false"] {
      pointer-events: auto;
      opacity: 1;
    }

    .task-drawer-backdrop {
      position: absolute;
      inset: 0;
      background: rgba(28, 27, 24, 0.3);
      backdrop-filter: blur(2px);
    }

    .task-drawer {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: min(640px, 90vw);
      background: var(--lp-canvas);
      border-left: 1px solid var(--lp-shadow);
      box-shadow: -20px 0 60px rgba(28, 27, 24, 0.12);
      display: flex;
      flex-direction: column;
      animation: lp-drawer-enter 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
      overflow: hidden;
    }

    .drawer-close {
      position: absolute;
      top: 20px;
      right: 20px;
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--lp-shadow);
      background: var(--lp-leaf);
      color: var(--lp-ink-2);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 140ms ease;
      z-index: 1;
    }

    .drawer-close:hover { background: var(--lp-shadow); }

    .drawer-content {
      flex: 1;
      overflow-y: auto;
      padding: 28px 32px 48px;
    }

    /* ─── Drawer inner content ─── */
    .lp-drawer-eyebrow {
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--lp-shadow-deep);
      background: var(--lp-leaf);
      color: var(--lp-ink-3);
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 10px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .lp-drawer-title {
      margin: 0 0 8px;
      font-size: 1.4rem;
      font-weight: 600;
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: var(--lp-ink);
    }

    .lp-drawer-desc {
      margin: 0 0 24px;
      color: var(--lp-ink-2);
      line-height: 1.6;
      font-size: 0.95rem;
      max-width: 52ch;
    }

    .lp-drawer-section {
      margin-bottom: 24px;
    }

    .lp-drawer-section-title {
      font-size: 0.78rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--lp-ink-3);
      font-weight: 600;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--lp-shadow);
    }

    .lp-drawer-body {
      background: var(--lp-leaf);
      border: 1px solid var(--lp-shadow);
      border-radius: 14px;
      padding: 20px 22px;
      font-size: 0.9rem;
      line-height: 1.7;
      color: var(--lp-ink);
      max-width: none;
      overflow-x: auto;
    }

    .lp-drawer-body p { margin: 0 0 12px; }
    .lp-drawer-body p:last-child { margin-bottom: 0; }
    .lp-drawer-body code {
      font-family: var(--lp-font-mono);
      font-size: 0.85em;
      background: rgba(28, 27, 24, 0.06);
      padding: 2px 5px;
      border-radius: 4px;
    }
    .lp-drawer-body pre {
      background: var(--lp-ink);
      color: var(--lp-canvas);
      padding: 16px 18px;
      border-radius: 12px;
      overflow-x: auto;
      font-size: 0.85rem;
      line-height: 1.65;
      font-family: var(--lp-font-mono);
      margin: 12px 0;
    }
    .lp-drawer-body pre code {
      background: transparent;
      padding: 0;
      color: inherit;
    }
    .lp-drawer-body ul, .lp-drawer-body ol {
      margin: 0 0 12px;
      padding-left: 20px;
    }
    .lp-drawer-body li { margin-bottom: 4px; }
    .lp-drawer-body strong { font-weight: 600; color: var(--lp-ink); }

    .lp-drawer-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .lp-drawer-meta-item {
      display: grid;
      gap: 3px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--lp-leaf);
      border: 1px solid var(--lp-shadow);
    }

    .lp-drawer-meta-label {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--lp-ink-3);
      font-weight: 600;
    }

    .lp-drawer-meta-value {
      font-size: 0.9rem;
      color: var(--lp-ink);
      font-weight: 500;
      font-family: var(--lp-font-mono);
    }

    /* ─── Review actions in drawer ─── */
    .lp-drawer-review-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    .lp-drawer-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 16px;
      border-radius: 10px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      font-family: var(--lp-font-body);
      border: 1px solid;
      transition: transform 140ms ease, box-shadow 140ms ease;
    }

    .lp-drawer-btn:hover { transform: translateY(-1px); }

    .lp-drawer-btn-approve {
      background: rgba(22, 101, 52, 0.1);
      color: var(--lp-good);
      border-color: rgba(22, 101, 52, 0.25);
    }
    .lp-drawer-btn-approve:hover { box-shadow: 0 4px 12px rgba(22, 101, 52, 0.15); }

    .lp-drawer-btn-revise {
      background: rgba(180, 83, 9, 0.08);
      color: var(--lp-active);
      border-color: rgba(180, 83, 9, 0.2);
    }
    .lp-drawer-btn-revise:hover { box-shadow: 0 4px 12px rgba(180, 83, 9, 0.12); }

    .lp-drawer-btn-reject {
      background: rgba(153, 27, 27, 0.08);
      color: var(--lp-bad);
      border-color: rgba(153, 27, 27, 0.2);
    }
    .lp-drawer-btn-reject:hover { box-shadow: 0 4px 12px rgba(153, 27, 27, 0.12); }

    /* ─── Attempt history ─── */
    .lp-attempt-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .lp-attempt-item {
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--lp-leaf);
      border: 1px solid var(--lp-shadow);
      display: grid;
      gap: 6px;
    }

    .lp-attempt-meta {
      display: flex;
      gap: 8px;
      align-items: center;
      font-size: 0.78rem;
      color: var(--lp-ink-3);
      font-family: var(--lp-font-mono);
    }

    .lp-attempt-status {
      display: inline-flex;
      padding: 2px 7px;
      border-radius: 999px;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .lp-attempt-status.pass { background: rgba(22, 101, 52, 0.1); color: var(--lp-good); }
    .lp-attempt-status.fail { background: rgba(153, 27, 27, 0.08); color: var(--lp-bad); }

    .lp-attempt-error {
      font-size: 0.82rem;
      color: var(--lp-bad);
      line-height: 1.5;
      padding: 8px 10px;
      border-radius: 8px;
      background: rgba(153, 27, 27, 0.06);
      font-family: var(--lp-font-mono);
    }

    /* ─── Responsive ─── */
    @media (max-width: 768px) {
      .lp-header {
        padding: 20px 24px 16px;
        flex-direction: column;
        align-items: flex-start;
      }
      .lp-header-right { align-items: flex-start; }
      .lp-header-metrics { justify-content: flex-start; }
      .lp-toolbar { padding: 10px 24px; }
      .lp-book { padding: 20px 24px 60px; }
      .lp-chapter-header { padding: 16px 18px; }
      .lp-task-row { padding: 12px 14px; }
      .lp-drawer-meta-grid { grid-template-columns: 1fr; }
      .lp-drawer-eyebrow, .lp-drawer-title { margin-right: 44px; }
    }

    @media (max-width: 480px) {
      .lp-title { font-size: 1.3rem; }
      .lp-metric { min-width: 48px; padding: 6px 10px; }
      .lp-chapter-progress-bar { width: 56px; }
      .lp-view-picker span { display: none; }
    }
  `;
}

function renderLivingPlaybookScripts(): string {
  return `
    (() => {
      // ── Chapter collapse/expand ──
      document.querySelectorAll('[data-chapter-toggle]').forEach((header) => {
        header.addEventListener('click', () => {
          const chapter = header.closest('.lp-chapter');
          if (!chapter) return;
          chapter.classList.toggle('collapsed');
          const body = chapter.querySelector('[data-chapter-body]');
          if (body) {
            body.style.display = chapter.classList.contains('collapsed') ? 'none' : '';
          }
        });
      });

      document.getElementById('lp-collapse-all')?.addEventListener('click', () => {
        document.querySelectorAll('.lp-chapter').forEach((ch) => {
          ch.classList.add('collapsed');
          const body = ch.querySelector('[data-chapter-body]');
          if (body) body.style.display = 'none';
        });
      });

      document.getElementById('lp-expand-all')?.addEventListener('click', () => {
        document.querySelectorAll('.lp-chapter').forEach((ch) => {
          ch.classList.remove('collapsed');
          const body = ch.querySelector('[data-chapter-body]');
          if (body) body.style.display = '';
        });
      });

      // ── Task body drawer ──
      const drawerShell = document.getElementById('task-drawer-shell');
      const drawer = document.getElementById('task-drawer');
      const drawerContent = document.getElementById('drawer-content');
      const backdrop = document.getElementById('task-drawer-backdrop');
      const closeBtn = document.getElementById('drawer-close');

      let taskDataCache = {};

      async function openDrawer(taskId) {
        if (!drawerShell || !drawer || !drawerContent) return;
        drawerContent.innerHTML = '<div style="padding: 48px; text-align: center; color: var(--lp-ink-3);">Loading…</div>';
        drawerShell.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        // Fetch task detail via API
        try {
          const resp = await fetch('/api/living/task/' + encodeURIComponent(taskId));
          if (resp.ok) {
            const data = await resp.json();
            taskDataCache[taskId] = data;
            drawerContent.innerHTML = renderTaskDrawerContent(data);
          } else {
            // Fallback: render from DOM data
            const taskEl = document.querySelector('[data-task-id="' + taskId + '"]');
            if (taskEl) {
              const title = taskEl.querySelector('.lp-task-title')?.textContent || taskId;
              const status = taskEl.closest('[class*="lp-task-"]')?.className.match(/lp-task-(\\w+)/)?.[1] || 'pending';
              drawerContent.innerHTML = renderSimpleDrawer(taskId, title, status);
            }
          }
        } catch {
          drawerContent.innerHTML = '<div style="padding: 48px; color: var(--lp-bad);">Could not load task details.</div>';
        }
      }

      function closeDrawer() {
        if (!drawerShell) return;
        drawerShell.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      }

      backdrop?.addEventListener('click', closeDrawer);
      closeBtn?.addEventListener('click', closeDrawer);

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && drawerShell?.getAttribute('aria-hidden') === 'false') {
          closeDrawer();
        }
      });

      document.querySelectorAll('.lp-task-body-toggle').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const taskId = btn.getAttribute('data-task-id');
          if (taskId) openDrawer(taskId);
        });
      });

      // ── Live duration counters ──
      const counters = document.querySelectorAll('.lp-live-counter[data-task-id]');
      if (counters.length > 0) {
        const startTimes = {};
        counters.forEach((c) => {
          const tid = c.getAttribute('data-task-id');
          startTimes[tid] = Date.now();
        });
        setInterval(() => {
          const now = Date.now();
          counters.forEach((c) => {
            const tid = c.getAttribute('data-task-id');
            const elapsed = Math.floor((now - (startTimes[tid] || now)) / 1000);
            c.textContent = formatDurationSimple(elapsed);
          });
        }, 1000);
      }

      // ── View mode switching ──
      document.querySelectorAll('.lp-tool-chip[data-view]').forEach((chip) => {
        chip.addEventListener('click', () => {
          const view = chip.getAttribute('data-view');
          document.querySelectorAll('.lp-tool-chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          // TODO: Wire up actual view mode switching
        });
      });

      // ── Simple markdown to HTML ──
      function mdToHtml(md) {
        if (!md) return '<p>No details provided.</p>';
        return md
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/^#{3}\s+(.+)$/gm, '<h3>$1</h3>')
          .replace(/^#{2}\s+(.+)$/gm, '<h2>$1</h2>')
          .replace(/^#{1}\s+(.+)$/gm, '<h1>$1</h1>')
          .replace(/\`{3}([\s\S]*?)\`{3}/g, '<pre><code>$1</code></pre>')
          .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/^- (.+)$/gm, '<li>$1</li>')
          .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^([^<\\n].*)$/gm, (m) => m.startsWith('<') ? m : '<p>' + m + '</p>')
          .replace(/<p><\/p>/g, '');
      }

      function renderTaskDrawerContent(data) {
        const title = escapeHtml(data.title || data.id || 'Task');
        const status = data.status || 'pending';
        const description = data.description || '';
        const body = data.body || data.task_def?.body || '';
        const checks = data.checks || [];
        const attempts = data.attempts_detail || [];
        const deps = data.depends_on || [];
        const skill = Array.isArray(data.skill) ? data.skill.join(', ') : (data.skill || '');
        const duration = data.duration_ms ? formatDuration(data.duration_ms) : '';
        const mode = data.mode || data.dag_type || '';
        const review = data.review;

        const checksRows = checks.length > 0
          ? checks.map((c) => {
            const passed = c.passed ?? c.exit_code === 0;
            const icon = passed
              ? '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6l3 3 5-5"/></svg>'
              : '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>';
            return '<div style="display:flex;gap:6px;align-items:center;padding:6px 10px;border-radius:8px;background:' + (passed ? 'rgba(22,101,52,0.08)' : 'rgba(153,27,27,0.08)') + ';color:' + (passed ? '#166534' : '#991b1b') + ';font-size:0.85rem;font-weight:500;">' + icon + escapeHtml(c.description || c.name || 'Check') + '</div>';
          }).join('')
          : '<p style="color:var(--lp-ink-3);font-size:0.85rem;">No checks defined.</p>';

        const attemptsRows = attempts.length > 0
          ? attempts.map((a, i) =>
            '<div class="lp-attempt-item">' +
              '<div class="lp-attempt-meta">' +
                '<span>Attempt ' + (a.attempt || i + 1) + '</span>' +
                '<span>' + (a.duration_ms ? formatDuration(a.duration_ms) : '') + '</span>' +
                '<span class="lp-attempt-status ' + (a.status === 'pass' ? 'pass' : 'fail') + '">' + escapeHtml(a.status || 'failed') + '</span>' +
              '</div>' +
              (a.error_message ? '<div class="lp-attempt-error">' + escapeHtml(a.error_message.slice(0, 300)) + '</div>' : '') +
              (a.check_results ? a.check_results.map((cr) => {
                const icon = cr.passed
                  ? '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5.5l2.5 2.5L9 3"/></svg>'
                  : '<svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 3l5 5M8 3l-5 5"/></svg>';
                return '<div style="display:flex;gap:5px;align-items:center;font-size:0.8rem;padding:4px 8px;border-radius:6px;background:' + (cr.passed ? 'rgba(22,101,52,0.06)' : 'rgba(153,27,27,0.06)') + ';color:' + (cr.passed ? '#166534' : '#991b1b') + ';">' + icon + escapeHtml(cr.name || cr.message || 'check') + '</div>';
              }).join('') : '') +
            '</div>').join('')
          : '<p style="color:var(--lp-ink-3);font-size:0.85rem;">Single attempt — no retry history.</p>';

        return '<div class="lp-drawer-eyebrow">Task Detail</div>' +
          '<h2 class="lp-drawer-title">' + title + '</h2>' +
          (description ? '<p class="lp-drawer-desc">' + escapeHtml(description) + '</p>' : '') +
          (body ? '<div class="lp-drawer-section"><div class="lp-drawer-section-title">Instructions</div><div class="lp-drawer-body">' + mdToHtml(body) + '</div></div>' : '') +
          '<div class="lp-drawer-section">' +
            '<div class="lp-drawer-section-title">Summary</div>' +
            '<div class="lp-drawer-meta-grid">' +
              (duration ? '<div class="lp-drawer-meta-item"><div class="lp-drawer-meta-label">Duration</div><div class="lp-drawer-meta-value">' + escapeHtml(duration) + '</div></div>' : '') +
              (mode ? '<div class="lp-drawer-meta-item"><div class="lp-drawer-meta-label">Mode</div><div class="lp-drawer-meta-value">' + escapeHtml(mode) + '</div></div>' : '') +
              (skill ? '<div class="lp-drawer-meta-item"><div class="lp-drawer-meta-label">Skills</div><div class="lp-drawer-meta-value">' + escapeHtml(skill) + '</div></div>' : '') +
              (deps.length ? '<div class="lp-drawer-meta-item"><div class="lp-drawer-meta-label">Depends on</div><div class="lp-drawer-meta-value">' + deps.map((d) => escapeHtml(String(d))).join(', ') + '</div></div>' : '') +
              '<div class="lp-drawer-meta-item"><div class="lp-drawer-meta-label">Status</div><div class="lp-drawer-meta-value" style="color:var(--lp-' + (status === 'pass' ? 'good' : status === 'error' || status === 'failed' ? 'bad' : status === 'running' ? 'active' : 'ink-2') + ')">' + escapeHtml(status) + '</div></div>' +
            '</div>' +
          '</div>' +
          '<div class="lp-drawer-section">' +
            '<div class="lp-drawer-section-title">Verification checks</div>' +
            checksRows +
          '</div>' +
          (attempts.length > 1 ? '<div class="lp-drawer-section"><div class="lp-drawer-section-title">Attempt history</div><div class="lp-attempt-list">' + attemptsRows + '</div></div>' : '') +
          (review ? '<div class="lp-drawer-section"><div class="lp-drawer-section-title">Human review</div>' +
            '<p style="color:var(--lp-ink-2);font-size:0.9rem;line-height:1.6;">' + escapeHtml(review.prompt || 'Review the artifact and provide your decision.') + '</p>' +
            '<div class="lp-drawer-review-actions">' +
              '<button class="lp-drawer-btn lp-drawer-btn-approve">Approve</button>' +
              '<button class="lp-drawer-btn lp-drawer-btn-revise">Request revision</button>' +
              '<button class="lp-drawer-btn lp-drawer-btn-reject">Reject</button>' +
            '</div></div>' : '');
      }

      function renderSimpleDrawer(taskId, title, status) {
        return '<div class="lp-drawer-eyebrow">Task Detail</div>' +
          '<h2 class="lp-drawer-title">' + escapeHtml(title) + '</h2>' +
          '<p style="color:var(--lp-ink-3);font-size:0.9rem;">Full task details are available when the execution view is served with task data.</p>';
      }

      function escapeHtml(v) {
        return String(v)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');
      }

      function formatDurationSimple(seconds) {
        if (seconds < 60) return seconds + 's';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m + 'm ' + s + 's';
      }
    })();
  `;
}

function computeElapsed(startedAt?: string): string {
  if (!startedAt) return "";
  const start = new Date(startedAt).getTime();
  if (Number.isNaN(start)) return "";
  const elapsed = Date.now() - start;
  const s = Math.floor(elapsed / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${s}s`;
}

function capitalize(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : "";
}

function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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
