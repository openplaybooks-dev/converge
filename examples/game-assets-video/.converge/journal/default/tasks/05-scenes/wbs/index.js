/**
 * WBS: Scenes
 *
 * Reads assets/scenes.json and spawns one full per-scene pipeline per entry.
 * Each scene WBS expands to 5 sequential stages (concept → background →
 * tiles → props → manifest) — see scene/wbs/index.js.
 *
 * If assets/scenes.json is missing, synthesize a single default scene from
 * the existing manifests (game.json, backgrounds.json, tile_maps.json,
 * objects.json, REGISTRY.json) and write it to disk so downstream scripts
 * that re-read scenes.json directly (decompose_scene.py, 04-props sub-WBS)
 * find it.
 *
 * Gated by vars.stop_after — skipped when "characters". The same gate
 * lives at the per-scene-stage level so partial reruns are easy.
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PHASE = '05-scenes';
const WBS_ROOT = '.converge/playbooks/default/tasks/05-scenes/wbs/templates';

const ALLOWED_MODES = new Set(['sprites', 'export', 'full']);

function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function synthesizeScenes(projectDir) {
  const game = readJsonIfExists(join(projectDir, 'assets', 'game.json')) || {};
  const backgrounds = readJsonIfExists(join(projectDir, 'assets', 'backgrounds.json')) || [];
  const tileMaps = readJsonIfExists(join(projectDir, 'assets', 'tile_maps.json')) || [];
  const objects = readJsonIfExists(join(projectDir, 'assets', 'objects.json')) || [];
  const registry = readJsonIfExists(join(projectDir, 'assets', 'REGISTRY.json')) || {};

  const sharedPropIds = new Set(
    (registry.shared_props || []).map((p) => p.id),
  );
  const sceneOnlyProps = objects
    .filter((o) => !sharedPropIds.has(o.id))
    .map((o) => ({
      id: o.id,
      name: o.name || o.id,
      states: o.animation_states || ['idle'],
      category: o.category || 'item',
    }));

  const bgLayers = backgrounds.map((b, i) => ({
    id: b.parallax_layer || b.id || `layer-${i}`,
    transparent: i > 0,
    transition_below: i > 0
      ? (backgrounds[i - 1].parallax_layer || backgrounds[i - 1].id)
      : null,
  }));

  const declaredTileVariants = tileMaps[0]?.tiles?.length
    ? tileMaps[0].tiles
    : (game.asset_categories?.tilemap?.default_variants || []);
  const tilemap = {
    tile_variants: declaredTileVariants.map((t) => ({ id: t.id })),
    sheet_grid: game.asset_categories?.tilemap?.sheet_grid || [4, 4],
    working_resolution: game.asset_categories?.tilemap?.working_resolution || 128,
  };

  const sceneId = tileMaps[0]?.id || backgrounds[0]?.id || 'default';
  return [
    {
      id: sceneId,
      name: tileMaps[0]?.name || backgrounds[0]?.name || 'Default Scene',
      biome: tileMaps[0]?.id || 'default',
      description:
        tileMaps[0]?.description ||
        backgrounds[0]?.description ||
        'Default scene synthesized from project manifests.',
      background: { layers: bgLayers },
      tilemap,
      scene_props: sceneOnlyProps,
    },
  ];
}

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    throw new Error(
      `${PHASE}: vars.stop_after="${mode}" excludes scenes, but the WBS still ran. ` +
      `Set vars.stop_after to one of: ${[...ALLOWED_MODES].join(', ')}, ` +
      `or gate this task with a dependency/skip rule in the playbook.`,
    );
  }

  const scenesPath = join(projectDir, 'assets', 'scenes.json');
  let scenes;
  if (existsSync(scenesPath)) {
    try {
      scenes = JSON.parse(readFileSync(scenesPath, 'utf-8'));
    } catch (err) {
      throw new Error(
        `${PHASE}: failed to parse assets/scenes.json (${err.message}).`,
      );
    }
  } else {
    console.log(`  assets/scenes.json missing — synthesizing default scene from manifests`);
    scenes = synthesizeScenes(projectDir);
    writeFileSync(scenesPath, JSON.stringify(scenes, null, 2), 'utf-8');
    console.log(`  ✓ wrote ${scenesPath}`);
  }

  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new Error(
      `${PHASE}: assets/scenes.json is empty or not an array. ` +
      `At least one scene entry is required.`,
    );
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
