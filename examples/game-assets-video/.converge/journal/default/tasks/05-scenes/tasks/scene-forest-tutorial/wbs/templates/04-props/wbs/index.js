/**
 * Per-scene-prop WBS:
 *   - Reads scenes.json[scene].scene_props to get each prop's states.
 *   - One leaf per (prop_id, state) running generate_prop_spritesheet.py
 *     in --scene-id mode.
 *
 * `scene_prop_ids` (the var we get from the parent) is just the IDs;
 * states live on the prop entry in scenes.json, so we re-read it here.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const STATE_TEMPLATE = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/04-props/wbs/templates/state/TASK.md';

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const sceneId = vars.scene_id;
  let propIds = [];
  try {
    propIds = JSON.parse(vars.scene_prop_ids || '[]');
  } catch (err) {
    console.log(`  ⚠️  could not parse scene_prop_ids (${err.message}) — skipping`);
    return;
  }
  if (!propIds.length) {
    console.log('  No scene-only props — skipping');
    return;
  }

  let scenes;
  try {
    scenes = JSON.parse(readFileSync(join(projectDir, 'assets', 'scenes.json'), 'utf-8'));
  } catch (err) {
    console.log(`  ⚠️  could not read scenes.json (${err.code || err.message})`);
    return;
  }
  const scene = scenes.find((s) => s.id === sceneId);
  if (!scene) {
    console.log(`  ⚠️  scene ${sceneId} not found in scenes.json`);
    return;
  }
  const sceneProps = scene.scene_props || [];
  const byId = new Map(sceneProps.map((p) => [p.id, p]));

  for (const propId of propIds) {
    const prop = byId.get(propId);
    if (!prop) {
      console.log(`  ⚠️  ${propId} not found in scene ${sceneId} scene_props — skipping`);
      continue;
    }
    const states = prop.states || ['idle'];
    for (const state of states) {
      const taskId = `scene-${sceneId}-prop-${propId}-${state}`;
      await ctx.spawn(
        {
          _type: 'template-ref',
          path: STATE_TEMPLATE,
          vars: {
            scene_id: sceneId,
            prop_id: propId,
            prop_name: prop.name || propId,
            state_name: state,
            obj_category: prop.category || prop.type || 'item',
          },
        },
        { id: taskId }
      );
      console.log(`    ✓ ${taskId}`);
    }
  }
}
