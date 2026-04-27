/**
 * WBS: Scenes
 *
 * Reads assets/scenes.json and spawns one full per-scene pipeline per entry.
 * Each scene WBS expands to 5 sequential stages (concept → background →
 * tiles → props → manifest) — see scene/wbs/index.js.
 *
 * Gated by vars.stop_after — skipped when "characters". The same gate
 * lives at the per-scene-stage level so partial reruns are easy.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PHASE = '05-scenes';
const WBS_ROOT = '.converge/playbooks/default/tasks/05-scenes/wbs/templates';

const ALLOWED_MODES = new Set(['sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  const scenesPath = join(projectDir, 'assets', 'scenes.json');
  let scenes;
  try {
    scenes = JSON.parse(readFileSync(scenesPath, 'utf-8'));
  } catch (err) {
    console.log(`  No scenes.json found (${err.code || err.message}) — skipping scenes`);
    return;
  }
  if (!scenes?.length) {
    console.log('  scenes.json is empty — no scenes to generate');
    return;
  }
  console.log(`  Spawning ${scenes.length} scene pipeline(s)\n`);

  for (const scene of scenes) {
    const sceneId = scene.id;
    const sceneVars = {
      scene_id: sceneId,
      scene_name: scene.name || sceneId,
      scene_biome: scene.biome || '',
      scene_description: scene.description || '',
      bg_layers: JSON.stringify(scene.background?.layers || []),
      tile_variant_ids: JSON.stringify(
        (scene.tilemap?.tile_variants || []).map((v) => v.id),
      ),
      scene_prop_ids: JSON.stringify(
        (scene.scene_props || []).map((p) => p.id),
      ),
    };
    const taskId = `scene-${sceneId}`;
    await ctx.spawn(
      { _type: 'template-ref', path: `${WBS_ROOT}/scene/TASK.md`, vars: sceneVars },
      { id: taskId }
    );
    console.log(`    ✓ ${taskId} (biome=${scene.biome || '?'})`);
  }
  console.log(`\n  ✅ Spawned ${scenes.length} scene(s)`);
}
