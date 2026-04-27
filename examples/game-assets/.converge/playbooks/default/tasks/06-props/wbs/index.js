/**
 * WBS: Props & Hazards Generation
 *
 * For each prop in objects.json, spawn:
 *   - {obj_id}-01-spec
 *   - {obj_id}-spritesheet-{state}  (one per animation state)
 *
 * Mirrors 03-characters/03-generation. Per-state leaves are inlined here
 * rather than nested in their own WBS parent: template-ref expansion strips
 * the inner parent's `wbs:` frontmatter, so the inner parent silently
 * auto-completes without spawning. See the 03-generation index.js for the
 * same constraint.
 *
 * Gated by vars.stop_after — skips entirely when stop_after === "characters".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PHASE = '06-props';
const WBS_ROOT = '.converge/playbooks/default/tasks/06-props/wbs/templates';

const ALLOWED_MODES = new Set(['sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  const objectsPath = join(projectDir, 'assets', 'objects.json');
  let objects;
  try {
    objects = JSON.parse(readFileSync(objectsPath, 'utf-8'));
  } catch (err) {
    console.log(`  No objects.json found (${err.code || err.message}) — skipping props`);
    return;
  }

  if (!objects?.length) {
    console.log('  objects.json is empty — no props to generate');
    return;
  }

  console.log(`  Spawning pipelines for ${objects.length} prop(s)\n`);

  for (const obj of objects) {
    const objId = obj.id;
    const category = obj.category || obj.type || 'item';
    console.log(`  📦 ${obj.name} (${objId}, ${category})`);

    const baseVars = {
      obj_id: objId,
      obj_name: obj.name,
      obj_description: obj.description || `Prop: ${obj.name}`,
      obj_category: category,
      states: JSON.stringify(obj.states || ['idle']),
    };

    // 1. Spec
    const specTaskId = `${objId}-01-spec`;
    await ctx.spawn(
      { _type: 'template-ref', path: `${WBS_ROOT}/prop/01-spec/TASK.md`, vars: baseVars },
      { id: specTaskId }
    );
    console.log(`    ✓ ${specTaskId}`);

    // 2..N. One spritesheet leaf per state, inlined.
    const states = obj.states || ['idle'];
    for (const state of states) {
      const stateTaskId = `${objId}-spritesheet-${state}`;
      const stateVars = {
        ...baseVars,
        state_name: state,
        state_description: `${state.charAt(0).toUpperCase() + state.slice(1)} animation sprite sheet for ${obj.name}`,
      };
      await ctx.spawn(
        {
          _type: 'template-ref',
          path: `${WBS_ROOT}/prop/02-spritesheets/state/TASK.md`,
          vars: stateVars,
        },
        { id: stateTaskId }
      );
      console.log(`    ✓ ${stateTaskId}`);
    }

    console.log('');
  }

  console.log(`  ✅ Spawned ${objects.length} prop pipeline(s)`);
}
