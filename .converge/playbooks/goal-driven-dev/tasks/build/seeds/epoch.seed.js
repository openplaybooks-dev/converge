/**
 * Goal-Driven Epoch Seed — Hybrid static/dynamic goals.
 *
 * Goals: playbook.yml `goals:` (static) OR goals.jsonl from idea.md (dynamic).
 * Tasks: tasks.jsonl — created by plan phase, managed reactively.
 *
 * Flow:
 *   1. Check ctx.goals (playbook-declared, static)
 *   2. If none → check goals.jsonl (AI-decomposed, dynamic)
 *   3. If neither → first epoch's plan phase creates goals from idea.md
 *   4. Each epoch = sprint: plan → implement → verify
 *   5. Stop when all goal checks pass
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, appendFileSync } from "node:fs";
import { join } from "node:path";

const ARTIFACTS_DIR = ".converge/artifacts/goal-driven-dev";
const GOALS_PATH = join(ARTIFACTS_DIR, "goals.jsonl");
const TASKS_PATH = join(ARTIFACTS_DIR, "tasks.jsonl");
const EPOCHS_DIR = join(ARTIFACTS_DIR, "epochs");
const TEMPLATE_PATH = ".converge/playbooks/goal-driven-dev/templates/epoch/TASK.md";

// ── JSONL helpers ────────────────────────────────────────────────────

function ensureDir(d) { const p = join(d, ARTIFACTS_DIR); if (!existsSync(p)) mkdirSync(p, { recursive: true }); }
function readJsonl(d, path) {
  const f = join(d, path);
  if (!existsSync(f)) return [];
  const raw = readFileSync(f, "utf8").trim();
  if (!raw) return [];
  try { return raw.split("\n").map((l) => JSON.parse(l)); } catch { return []; }
}
function writeJsonl(d, path, entries) {
  ensureDir(d);
  writeFileSync(join(d, path), entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}
function appendJsonl(d, path, entries) {
  ensureDir(d);
  if (entries.length === 0) return;
  appendFileSync(join(d, path), entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf8");
}

function nextEpoch(d) {
  const counterPath = join(d, ARTIFACTS_DIR, "epoch-counter.txt");
  let n = 1;
  if (existsSync(counterPath)) n = parseInt(readFileSync(counterPath, "utf8").trim(), 10) || 1;
  writeFileSync(counterPath, String(n + 1), "utf8");
  return n;
}
function listFiles(d) {
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
  walk(d, "");
  return result;
}
function summary(goals, tasks) {
  const gDone = goals.filter((g) => g.status === "done").length;
  const tDone = tasks.filter((t) => t.status === "done").length;
  const tActive = tasks.filter((t) => t.status === "active").length;
  const tPending = tasks.filter((t) => t.status === "pending").length;
  return `${gDone}/${goals.length} goals, ${tDone} done ${tActive} active ${tPending} pending`;
}

// ── MAIN ─────────────────────────────────────────────────────────────

export async function run(ctx) {
  const projectDir = ctx.projectDir;
  ensureDir(projectDir);

  // ── Resolve goals: static (playbook) or dynamic (goals.jsonl) ──────
  await ctx.goals.evaluate();
  let goals = [];
  const hasStatic = (await ctx.goals.getState())?.results?.length > 0;

  if (hasStatic) {
    // Static: goals from playbook.yml via ctx.goals
    goals = await ctx.goals.getRemaining();
    ctx.log.info(`Static goals: ${goals.length} remaining`);
  } else {
    // Dynamic: goals from idea.md decomposition (stored in goals.jsonl)
    goals = readJsonl(projectDir, GOALS_PATH);

    if (goals.length === 0) {
      // First run — no goals yet. Let the epoch's plan phase create them.
      ctx.log.info("No goals yet — first epoch will decompose idea.md into goals.jsonl");
      goals = [{ id: "bootstrap", description: "Decompose idea.md into goals and build first feature", status: "active", checks: [] }];
    }
  }

  if (goals.length === 0) {
    ctx.log.info("All goals complete. Stopping.");
    return ctx.loop.stop();
  }

  // Verify with framework if static
  if (hasStatic && await ctx.goals.allSatisfied()) {
    ctx.log.info("All static goals satisfied. Stopping.");
    return ctx.loop.stop();
  }

  // ── Task backlog ───────────────────────────────────────────────────
  let tasks = readJsonl(projectDir, TASKS_PATH);
  const activeGoal = goals[0];
  const goalTasks = tasks.filter((t) => t.goalId === activeGoal.id);
  let task = goalTasks.find((t) => t.status === "active") || goalTasks.find((t) => t.status === "pending");

  const epoch = String(nextEpoch(projectDir)).padStart(3, "0");
  const id = `epoch-${epoch}`;
  const files = listFiles(projectDir).filter((f) =>
    !f.startsWith(".converge/") && !f.startsWith("node_modules/") && f !== "idea.md" && f !== "README.md");
  const fileList = files.length > 0 ? files.slice(0, 20).join(", ") : "nothing yet";

  mkdirSync(join(projectDir, EPOCHS_DIR, epoch), { recursive: true });
  writeJsonl(projectDir, join(EPOCHS_DIR, epoch, "backlog-snapshot.jsonl"), [...goals, ...tasks]);

  const taskDesc = task ? task.desc : `Plan and build: ${activeGoal.description}`;
  const taskIdRef = task ? task.id : "plan";

  ctx.log.info(`Epoch ${epoch}: goal=${activeGoal.id} | ${summary(goals, tasks)} | Built: ${fileList}`);

  if (task && task.status === "pending") {
    task.status = "active";
    writeJsonl(projectDir, TASKS_PATH, tasks);
  }

  await ctx.spawn(
    { _type: "template-ref", path: TEMPLATE_PATH, vars: {
      taskId: id, epoch, goalId: activeGoal.id,
      goalDesc: activeGoal.description, taskDesc, taskIdRef, fileList,
      summary: summary(goals, tasks),
      goalsPath: GOALS_PATH, tasksPath: TASKS_PATH, ideaPath: "idea.md",
      hasStaticGoals: String(hasStatic),
      artifactDir: `${EPOCHS_DIR}/${epoch}`,
    }},
    { id },
  );

  return ctx.loop.continue();
}
