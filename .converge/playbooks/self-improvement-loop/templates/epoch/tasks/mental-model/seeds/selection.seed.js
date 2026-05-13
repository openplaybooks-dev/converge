/**
 * Deterministic mental model selection.
 * Reads metrics.jsonl (past audits) and escalated.json (blocked areas),
 * picks the lowest-index model not recently audited and not blocked.
 * No AI needed — runs in milliseconds.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return null; }
}

function readJsonl(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8')
    .split('\n').filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

export async function run(ctx) {
  const vars = ctx.vars;
  const artifactsRoot = vars.artifactsDir || join(ctx.projectDir, '.converge', 'artifacts', 'self-improvement-loop');
  const artifactsRel = vars.artifactsRel || join('.converge', 'artifacts', 'self-improvement-loop', 'epochs', vars.epoch);
  const epoch = vars.epoch;

  // Read prior audit history
  const metricsPath = join(artifactsRoot, 'metrics.jsonl');
  const metrics = readJsonl(metricsPath);
  const recentModels = metrics.slice(-2).map(m => m.mental_model || '').filter(Boolean);
  const allAudited = new Set(metrics.map(m => m.mental_model || ''));

  // Read escalated bugs
  const escalatedPath = join(artifactsRoot, 'escalated.json');
  const escalated = readJson(escalatedPath) || [];

  // Map escalated files to model indices
  const escalatedModels = new Set();
  const modelFilePatterns = {
    5:  ['dag', 'select', 'spawn'],           // DAG Determinism — overlaps select-parent bug
    10: ['lock', 'resume', 'retry', 'crash'],  // Resume/Retry — overlaps hooks-throw-timeout
  };
  for (const entry of escalated) {
    for (const [idx, patterns] of Object.entries(modelFilePatterns)) {
      if (patterns.some(p => (entry.reason || '').toLowerCase().includes(p) ||
          (entry.files || []).some(f => f.toLowerCase().includes(p)))) {
        escalatedModels.add(Number(idx));
      }
    }
  }

  // Select: lowest index not in last 2 epochs, not escalated, not already audited
  let selected = null;
  for (const model of MODELS) {
    if (recentModels.includes(model.name)) continue;  // anti-repeat
    if (allAudited.has(model.name)) continue;          // already covered? skip for round-robin but allow restart
    if (escalatedModels.has(model.index)) continue;    // blocked by escalation
    selected = model;
    break;
  }

  // If all covered, restart round-robin from #1 (skip last 2 and escalated)
  if (!selected) {
    for (const model of MODELS) {
      if (recentModels.includes(model.name)) continue;
      if (escalatedModels.has(model.index)) continue;
      selected = model;
      break;
    }
  }

  // If still nothing, all are escalated — escalate
  if (!selected) {
    selected = { index: -1, name: 'escalate-all-models-blocked', source: 'N/A' };
  }

  const blockedIndices = [...new Set([...escalatedModels, ...MODELS.filter(m => recentModels.includes(m.name)).map(m => m.index)])].sort();

  // Write selection.json
  const outDir = join(artifactsRel, 'mental-model');
  const absDir = join(ctx.projectDir, outDir);
  mkdirSync(absDir, { recursive: true });

  const selection = {
    epoch: String(parseInt(epoch, 10)),
    model: selected.name,
    model_index: selected.index,
    source_file: selected.source,
    reason: selected.index === -1
      ? 'All models are escalated or blocked — human maintainer needed'
      : `Model #${selected.index} selected — not recently audited (${recentModels.length ? 'last audited: ' + recentModels.join(', ') : 'no prior epochs'}), not blocked by escalation, lowest uncovered index`,
    escalation_check: selected.index === -1 ? 'all-blocked' : 'clean',
    blocked_models: blockedIndices,
    escalation_note: selected.index === -1 ? 'ALL_MODELS_BLOCKED' : null,
  };

  writeFileSync(join(absDir, 'selection.json'), JSON.stringify(selection, null, 2) + '\n');

  return ctx.loop.stop();
}
