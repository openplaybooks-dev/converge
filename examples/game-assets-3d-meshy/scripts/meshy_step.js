#!/usr/bin/env node
/**
 * Generic dispatcher for one Meshy step on one character.
 *
 * Reads characters.json, loads the active backend, calls generate(), updates
 * meshy.json with the task_id chain so downstream steps can pass input_task_id.
 *
 * Differs from playable-mvp-3d's version in two ways:
 *   1. Reads characters.json (not specs/<slug>/spec.json)
 *   2. Preview uses image-to-3D (image_path → reference.png) instead of text-to-3D
 *
 * Usage:
 *   node scripts/meshy_step.js <id> preview
 *   node scripts/meshy_step.js <id> refine
 *   node scripts/meshy_step.js <id> rig
 *   node scripts/meshy_step.js <id> animate <action_name>
 */

import './_load_env.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { pathToFileURL } from 'url';

const [, , id, step, action] = process.argv;
if (!id || !step) {
  console.error('usage: meshy_step.js <id> <preview|refine|rig|animate> [action_name]');
  process.exit(1);
}

// Look up the asset in characters.json OR props.json. Props (kind: 'prop',
// humanoid: false) live under assets/props/<id>/, characters under
// assets/characters/<id>/. The dispatcher works for both, but rig/animate
// steps short-circuit for non-humanoids.
function loadAsset(id) {
  const characters = JSON.parse(readFileSync('assets/characters.json', 'utf-8'));
  const ch = characters.find(c => c.id === id);
  if (ch) return { entry: ch, dir: `assets/characters/${id}`, kind: 'character' };
  if (existsSync('assets/props.json')) {
    const props = JSON.parse(readFileSync('assets/props.json', 'utf-8'));
    const p = props.find(x => x.id === id);
    if (p) return { entry: p, dir: `assets/props/${id}`, kind: 'prop' };
  }
  console.error(`no asset with id "${id}" in characters.json or props.json`);
  process.exit(1);
}

const { entry: ch, dir: charDir } = loadAsset(id);
const ledgerPath = `${charDir}/meshy.json`;
const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf-8')) : {};

function loadBackend(skillName) {
  const skillDir = `.converge/skills/${skillName}`;
  const active = readFileSync(`${skillDir}/backends/ACTIVE`, 'utf-8').trim();
  const entry = `${skillDir}/backends/${active}/generate.js`;
  if (!existsSync(entry)) throw new Error(`backend ${active} not found at ${entry}`);
  return import(pathToFileURL(resolve(entry)).href).then(m => ({ generate: m.generate, active }));
}

function saveLedger() {
  mkdirSync(dirname(ledgerPath), { recursive: true });
  writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2) + '\n');
}

// Meshy library action_id map (illustrative — real ids in Meshy's animation library docs).
const ACTION_IDS = {
  Idle: 1001, Walk: 2001, Run: 2010, Jump: 3001, PickUp: 4012,
  Attack: 5001, CastSpell: 5002, BowDraw: 5003, Death: 5099,
};

async function run() {
  if (step === 'preview') {
    const refPath = `${charDir}/reference.png`;
    if (!existsSync(refPath)) throw new Error(`${id}: reference.png missing — run 03-references first`);

    const { generate, active } = await loadBackend('meshy-generate');
    console.log(`  ${id} preview (image-to-3D, backend: ${active})`);

    // Live-mode note: real Meshy needs a public URL for image_url. For local
    // PNGs, upload to a temp host first or run with the stub backend. The
    // stub doesn't read image_url at all.
    const image_url = active === 'meshy'
      ? `file://${resolve(refPath)}`   // placeholder; real Meshy needs HTTP(S) — see README
      : refPath;

    const r = await generate({
      mode: 'preview',
      asset_slug: id,
      output_path: `${charDir}/preview.glb`,
      image_url,
      ai_model: 'meshy-6',
      model_type: 'lowpoly',
      topology: 'quad',
      target_polycount: 8000,
    });
    ledger.preview_task_id = r.task_id;
    ledger.preview_model = r.model;
    ledger.preview_cost = r.cost_credits;
    saveLedger();
    console.log(`✓ ${id}: preview (${r.cost_credits}cr)`);
    return;
  }

  if (step === 'refine') {
    const { generate, active } = await loadBackend('meshy-generate');
    if (!ledger.preview_task_id) throw new Error(`${id}: no preview_task_id — run preview first`);
    console.log(`  ${id} refine (backend: ${active}, preview=${ledger.preview_task_id})`);
    const r = await generate({
      mode: 'refine',
      asset_slug: id,
      output_path: `${charDir}/model.glb`,
      preview_task_id: ledger.preview_task_id,
      enable_pbr: true,
    });
    ledger.refine_task_id = r.task_id;
    ledger.refine_cost = r.cost_credits;
    saveLedger();
    console.log(`✓ ${id}: refine (${r.cost_credits}cr)`);
    return;
  }

  if (step === 'rig') {
    if (!ch.humanoid) {
      console.log(`✓ ${id}: not humanoid, skipping rig`);
      return;
    }
    const { generate, active } = await loadBackend('meshy-rig');
    console.log(`  ${id} rig (backend: ${active})`);
    const r = await generate({
      asset_slug: id,
      input_glb: `${charDir}/model.glb`,
      input_task_id: ledger.refine_task_id,
      output_path: `${charDir}/rigged.glb`,
    });
    ledger.rig_task_id = r.rig_task_id;
    saveLedger();
    console.log(`✓ ${id}: rig`);
    return;
  }

  if (step === 'animate') {
    if (!ch.humanoid) {
      console.log(`✓ ${id}: not humanoid, skipping animate`);
      return;
    }
    if (!action) throw new Error(`animate requires action name`);
    if (!ch.animations.includes(action)) {
      throw new Error(`${id}: action "${action}" not in characters.json animations: [${ch.animations.join(', ')}]`);
    }
    if (!ledger.rig_task_id) throw new Error(`${id}: no rig_task_id — run rig first`);
    const action_id = ACTION_IDS[action];
    if (!action_id) throw new Error(`unknown action_id for "${action}" — extend ACTION_IDS in scripts/meshy_step.js`);

    const { generate, active } = await loadBackend('meshy-animate');
    console.log(`  ${id} animate ${action} (backend: ${active})`);
    const r = await generate({
      asset_slug: id,
      rig_task_id: ledger.rig_task_id,
      action_name: action,
      action_id,
      rigged_glb: `${charDir}/rigged.glb`,
      output_path: `${charDir}/anims/${action}.glb`,
    });
    ledger.animations = ledger.animations || {};
    ledger.animations[action] = { task_id: r.task_id, cost: r.cost_credits };
    saveLedger();
    console.log(`✓ ${id}: ${action} (${r.cost_credits}cr)`);
    return;
  }

  throw new Error(`unknown step "${step}"`);
}

run().catch(e => { console.error('meshy_step:', e.message); process.exit(1); });
