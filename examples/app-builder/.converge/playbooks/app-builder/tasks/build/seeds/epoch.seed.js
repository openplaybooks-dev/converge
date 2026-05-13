/**
 * Scrum Epoch Seed — reads backlog, spawns next sprint.
 *
 * No AI calls here. The backlog (goals.jsonl) is the cross-epoch plan.
 * Each epoch plans, builds, and updates the backlog reactively.
 *
 * backlog.jsonl format (one JSON per line):
 *   {"type":"goal","id":"g1","desc":"...","status":"pending|active|done"}
 *   {"type":"task","id":"t1","goalId":"g1","desc":"...","status":"pending|active|done"}
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const ARTIFACTS_DIR = ".converge/artifacts/app-builder";
const BACKLOG_PATH = join(ARTIFACTS_DIR, "backlog.jsonl");
const EPOCHS_DIR = join(ARTIFACTS_DIR, "epochs");
const TEMPLATE_PATH = ".converge/playbooks/app-builder/templates/epoch/TASK.md";

function ensureDir(d) { const p = join(d, ARTIFACTS_DIR); if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

function readBacklog(projectDir) {
  const f = join(projectDir, BACKLOG_PATH);
  if (!existsSync(f)) return [];
  const raw = readFileSync(f, "utf8").trim();
  if (!raw) return [];
  try { return raw.split("\n").map((l) => JSON.parse(l)); } catch { return []; }
}

function appendBacklog(projectDir, entries) {
  ensureDir(projectDir);
  if (entries.length === 0) return;
  appendFileSync(join(projectDir, BACKLOG_PATH),
    entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}

function writeBacklog(projectDir, entries) {
  ensureDir(projectDir);
  writeFileSync(join(projectDir, BACKLOG_PATH),
    entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}

function nextEpoch(d) {
  const dir = join(d, EPOCHS_DIR);
  if (!existsSync(dir)) return 1;
  const nums = readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{3}$/.test(e.name))
    .map((e) => parseInt(e.name, 10)).filter((n) => !isNaN(n));
  return nums.length > 0 ? Math.max(...nums) + 1 : 1;
}

function listFiles(projectDir) {
  const result = [];
  function walk(dir, prefix) {
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.name.startsWith(".") || e.name === "node_modules") continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, prefix + e.name + "/");
      else result.push(prefix + e.name);
    }
  }
  walk(projectDir, "");
  return result;
}

function backlogSummary(backlog) {
  const goals = backlog.filter((e) => e.type === "goal");
  const tasks = backlog.filter((e) => e.type === "task");
  const done = tasks.filter((t) => t.status === "done").length;
  const active = tasks.filter((t) => t.status === "active").length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  return `Goals: ${goals.length} | Tasks: ${done} done, ${active} active, ${pending} pending`;
}

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  ensureDir(projectDir);

  const ideaPath = join(projectDir, "idea.md");
  if (!existsSync(ideaPath)) { ctx.log.error("idea.md not found"); return ctx.loop.stop(); }

  let backlog = readBacklog(projectDir);
  let summary = backlogSummary(backlog);

  // First run — initialize backlog from idea.md
  if (backlog.length === 0) {
    const idea = readFileSync(ideaPath, "utf8");
    const init = [
      { type: "goal", id: "g1", desc: "CLI foundation: scaffold, entry point, config, status command", status: "active", createdAt: new Date().toISOString() },
      { type: "goal", id: "g2", desc: "Core checks: git stats, file stats, test runner, dependency audit, type check", status: "pending", createdAt: new Date().toISOString() },
      { type: "goal", id: "g3", desc: "Scoring & history: health score, SQLite, trends, thresholds", status: "pending", createdAt: new Date().toISOString() },
      { type: "goal", id: "g4", desc: "Watch & automation: file watcher, CI mode, custom rules, export, badge", status: "pending", createdAt: new Date().toISOString() },
      { type: "goal", id: "g5", desc: "Polish: colorized output, spinners, error recovery, dashboard, docs", status: "pending", createdAt: new Date().toISOString() },
    ];
    appendBacklog(projectDir, init);
    backlog = init;
    summary = backlogSummary(backlog);
    ctx.log.info(`Initialized backlog: ${summary}`);
  }

  // Find current active goal
  const goals = backlog.filter((e) => e.type === "goal");
  const tasks = backlog.filter((e) => e.type === "task");
  const activeGoal = goals.find((g) => g.status === "active") || goals.find((g) => g.status === "pending");

  if (!activeGoal) {
    // All goals done — check if anything left
    const files = listFiles(projectDir).filter((f) =>
      !f.startsWith(".converge/") && !f.startsWith("node_modules/") && f !== "idea.md" && f !== "README.md");
    if (files.length > 0) {
      ctx.log.info(`All goals complete. ${files.length} files built. Stopping.`);
    } else {
      ctx.log.info("No goals and no files. Something went wrong.");
    }
    return ctx.loop.stop();
  }

  // Find first pending/active task for this goal
  let task = tasks.find((t) => t.goalId === activeGoal.id && t.status === "active");
  if (!task) task = tasks.find((t) => t.goalId === activeGoal.id && t.status === "pending");

  const epoch = String(nextEpoch(projectDir)).padStart(3, "0");
  const id = `epoch-${epoch}`;
  const files = listFiles(projectDir).filter((f) =>
    !f.startsWith(".converge/") && !f.startsWith("node_modules/") && f !== "idea.md" && f !== "README.md");
  const fileList = files.length > 0 ? files.slice(0, 30).join(", ") : "nothing yet";

  // Save backlog snapshot for this epoch
  const snapshotDir = join(projectDir, EPOCHS_DIR, epoch);
  ensureDir(projectDir);
  writeFileSync(join(projectDir, EPOCHS_DIR, epoch, "backlog-snapshot.jsonl"),
    backlog.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");

  const goalDesc = activeGoal.desc;
  const taskDesc = task ? task.desc : `Work on goal: ${goalDesc}`;
  const taskId = task ? task.id : null;

  ctx.log.info(`Epoch ${epoch}: goal=${activeGoal.id} task=${taskId || "plan"} | ${summary} | Built: ${fileList}`);

  // Mark task as active
  if (task && task.status === "pending") {
    task.status = "active";
    writeBacklog(projectDir, backlog);
  }

  // Mark goal as active if pending
  if (activeGoal.status === "pending") {
    activeGoal.status = "active";
    writeBacklog(projectDir, backlog);
  }

  await ctx.spawn(
    { _type: "template-ref", path: TEMPLATE_PATH, vars: {
      taskId: id, epoch, goalId: activeGoal.id, goalDesc, taskDesc,
      taskIdRef: taskId || "plan", fileList, summary,
      backlogPath: BACKLOG_PATH, ideaPath: "idea.md",
      artifactDir: `${EPOCHS_DIR}/${epoch}`,
    }},
    { id },
  );

  return ctx.loop.continue();
}
