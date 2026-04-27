/**
 * WBS: Tile Map Generation
 *
 * Per tilemap in tile_maps.json:
 *   - One {tilemap_id}-tile-{variant_id} leaf per tile_variant entry.
 *     Each is tagged `tile-{tilemap_id}` so the composite step can depend
 *     on the whole batch via `tag:tile-{tilemap_id}`.
 *   - One {tilemap_id}-tilesheet leaf that composites everything.
 *
 * Gated by vars.stop_after — skipped when "characters".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const PHASE = '04-tile-maps';
const WBS_ROOT = '.converge/playbooks/default/tasks/04-tile-maps/wbs/templates';

const ALLOWED_MODES = new Set(['sprites', 'export', 'full']);

export async function run(ctx) {
  const { projectDir, vars } = ctx;
  const mode = vars?.stop_after ?? 'sprites';

  if (!ALLOWED_MODES.has(mode)) {
    console.log(`  Skipped (${PHASE}, stop_after=${mode})`);
    return;
  }

  const tmPath = join(projectDir, 'assets', 'tile_maps.json');
  let tileMaps;
  try {
    tileMaps = JSON.parse(readFileSync(tmPath, 'utf-8'));
  } catch (err) {
    console.log(`  No tile_maps.json found (${err.code || err.message}) — skipping`);
    return;
  }

  if (!tileMaps?.length) {
    console.log('  tile_maps.json is empty — no tilemaps to generate');
    return;
  }

  console.log(`  Spawning pipelines for ${tileMaps.length} tilemap(s)\n`);

  for (const tm of tileMaps) {
    const tmId = tm.id;
    const variants = tm.tile_variants
      ?? (tm.layers || []).map((layer, i) => ({
        id: `tile-${i}`,
        layer,
        description: layer,
      }));

    if (!variants.length) {
      console.log(`  ⚠️  ${tmId}: no tile_variants — skipping`);
      continue;
    }

    console.log(`  📦 ${tm.name || tmId} (${variants.length} tile variants)`);

    const baseTmVars = {
      tilemap_id: tmId,
      tilemap_name: tm.name || tmId,
      terrain_type: tm.terrain_type || 'generic',
      working_resolution: String(tm.working_resolution || 128),
    };

    // Per-tile leaves
    const tileBatchTag = `tile-${tmId}`;
    for (const variant of variants) {
      const tileTaskId = `${tmId}-tile-${variant.id}`;
      const tileVars = {
        ...baseTmVars,
        tile_id: variant.id,
        tile_layer: variant.layer || 'base',
        tile_description: variant.description || variant.id,
        tile_batch_tag: tileBatchTag,
      };
      await ctx.spawn(
        { _type: 'template-ref', path: `${WBS_ROOT}/tile/TASK.md`, vars: tileVars },
        { id: tileTaskId }
      );
      console.log(`    ✓ ${tileTaskId}`);
    }

    // Composite leaf — depends on the whole tile batch via tag.
    const compositeTaskId = `${tmId}-tilesheet`;
    const compositeVars = {
      ...baseTmVars,
      tile_batch_tag: tileBatchTag,
      tile_count: String(variants.length),
    };
    await ctx.spawn(
      { _type: 'template-ref', path: `${WBS_ROOT}/composite/TASK.md`, vars: compositeVars },
      { id: compositeTaskId }
    );
    console.log(`    ✓ ${compositeTaskId} (depends on tag:${tileBatchTag})`);
    console.log('');
  }

  console.log(`  ✅ Spawned ${tileMaps.length} tilemap pipeline(s)`);
}
