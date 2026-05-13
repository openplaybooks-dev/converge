/**
 * Spawn the sequential stages for one framework improvement epoch.
 * Mental model selection happens here (deterministic, no AI needed).
 */
import { join, relative } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';

const MODELS = [
  { index: 1,  name: 'Blueprint vs Runtime',        source: 'CLAUDE.md §5' },
  { index: 2,  name: 'Checks, Not Vibes',             source: 'CLAUDE.md §5, README' },
  { index: 3,  name: 'Framework vs Project',          source: 'CLAUDE.md §3.5, AGENTS.md §3.5' },
  { index: 4,  name: 'Fingerprint Determinism',       source: 'CLAUDE.md §5, README' },
  { index: 5,  name: 'DAG Determinism',               source: 'CLAUDE.md §5, README' },
  { index: 6,  name: 'Source of Truth',               source: 'CLAUDE.md §5' },
  { index: 7,  name: 'Simplicity First',              source: 'CLAUDE.md §2, AGENTS.md §2' },
  { index: 8,  name: 'Gap Detection Correctness',     source: 'CLAUDE.md §4' },
  { index: 9,  name: 'Seed Determinism',              source: 'CLAUDE.md §5' },
  { index: 10, name: 'Resume/Retry Correctness',      source: 'CLAUDE.md §5' },
];

export async function run(ctx) {
  const vars = ctx.vars;

  // ── Deterministic mental model selection ──────────────────────
  const artifactsRoot = join(ctx.projectDir, '.converge', 'artifacts', 'self-improvement-loop');
  const metricsPath = join(artifactsRoot, 'metrics.jsonl');
  const escalatedPath = join(artifactsRoot, 'escalated.json');

  const metrics = existsSync(metricsPath)
    ? readFileSync(metricsPath, 'utf-8').split('\n').filter(Boolean)
        .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean)
    : [];
  const escalated = existsSync(escalatedPath)
    ? JSON.parse(readFileSync(escalatedPath, 'utf-8'))
    : [];

  const recentModels = metrics.slice(-2).map(m => m.mental_model || '').filter(Boolean);
  const allAudited = new Set(metrics.map(m => m.mental_model || ''));

  // Models blocked by escalation (by file pattern overlap)
  const blockedIndices = new Set();
  for (const e of escalated) {
    const reason = (e.reason || '').toLowerCase();
    const files = (e.files || []).join(' ').toLowerCase();
    if (reason.includes('dag') || reason.includes('select') || files.includes('dag')) blockedIndices.add(5);
    if (reason.includes('lock') || reason.includes('resume') || reason.includes('crash') || reason.includes('retry')) blockedIndices.add(10);
  }

  // Pick lowest-index model: not recently audited, not escalated
  let selectedModel = null, selectedIndex = -1, selectedSource = '';
  for (const m of MODELS) {
    if (recentModels.includes(m.name)) continue;
    if (blockedIndices.has(m.index)) continue;
    if (allAudited.has(m.name)) continue; // prefer uncovered
    selectedModel = m; break;
  }
  // Round-robin restart: if all covered, pick lowest not recently audited
  if (!selectedModel) {
    for (const m of MODELS) {
      if (recentModels.includes(m.name)) continue;
      if (blockedIndices.has(m.index)) continue;
      selectedModel = m; break;
    }
  }
  // All blocked
  if (!selectedModel) {
    selectedModel = { name: 'escalate-all-models-blocked', index: -1, source: 'N/A' };
  }

  // Write selection.json for audit trail
  const artifactsRel = vars.artifactsRel;
  const outDir = join(ctx.projectDir, artifactsRel, 'mental-model');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'selection.json'), JSON.stringify({
    epoch: vars.epoch,
    model: selectedModel.name,
    model_index: selectedModel.index,
    source_file: selectedModel.source,
    reason: selectedModel.index === -1
      ? 'All models escalated — human maintainer needed'
      : `Model #${selectedModel.index} selected — lowest uncovered, not recently audited, not escalated`,
    escalation_check: selectedModel.index === -1 ? 'all-blocked' : 'clean',
    blocked_models: [...blockedIndices, ...MODELS.filter(m => recentModels.includes(m.name)).map(m => m.index)],
    escalation_note: selectedModel.index === -1 ? 'ALL_BLOCKED' : null,
  }, null, 2) + '\n');

  // Share selected model with all children
  const sharedVars = {
    ...vars,
    selectedModel: selectedModel.name,
    selectedModelIndex: String(selectedModel.index),
    selectedModelSource: selectedModel.source,
  };

  const stageIds = {
    observeTaskId: `${vars.taskId}-000-observe`,
    selectTaskId: `${vars.taskId}-001-select`,
    testTaskId: `${vars.taskId}-002-test`,
    implementTaskId: `${vars.taskId}-003-implement`,
    verifyTaskId: `${vars.taskId}-004-verify`,
    summarizeTaskId: `${vars.taskId}-005-summarize`,
  };

  // Spawn the 6-phase audit pipeline (observe → select → test → implement → verify → summarize)
  for (const [key, phase] of [
    ['observeTaskId', 'observe'],
    ['selectTaskId', 'select'],
    ['testTaskId', 'test'],
    ['implementTaskId', 'implement'],
    ['verifyTaskId', 'verify'],
    ['summarizeTaskId', 'summarize'],
  ]) {
    const taskId = stageIds[key];
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: relative(ctx.projectDir, join(vars.epochTemplateDir, 'tasks', phase, 'TASK.md')),
        vars: { ...sharedVars, ...stageIds, taskId },
      },
      { id: taskId },
    );
  }

  return ctx.loop.stop();
}
