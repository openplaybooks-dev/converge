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

const PHASE = '03-shared-props';
const WBS_ROOT = '.converge/playbooks/default/tasks/03-shared-props/wbs/templates';

const ALLOWED_MODES = new Set(['sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  // Prefer objects-shared.json (new scene-driven layout); fall back to
  // objects.json for back-compat with projects that haven't migrated.
  const candidates = [
    join(projectDir, 'assets', 'objects-shared.json'),
    join(projectDir, 'assets', 'objects.json'),
  ];
  let objects;
  let manifestPath = null;
  for (const p of candidates) {
    try {
      objects = JSON.parse(readFileSync(p, 'utf-8'));
      manifestPath = p;
      break;
    } catch (_) {
      // try next candidate
    }
  }
  if (!objects) {
    console.log('  No objects-shared.json or objects.json found — skipping shared props');
    return;
  }
  console.log(`  reading ${manifestPath.replace(projectDir + '/', '')}`);

  if (!objects?.length) {
    console.log('  manifest is empty — no shared props to generate');
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
