/**
 * Per-scene tile WBS:
 *   - One leaf per `tile_variant_ids[i]` running generate_tile.py with
 *     --scene-id (so the tile config comes from scenes.json[scene].tilemap)
 *     and --out-root assets/scenes/{scene_id}/tilesheet.
 *   - One composite leaf that depends on tag:scene-{scene_id}-tile and runs
 *     build_tilesheet.py with the same --scene-id / --out-root.
 */

const TILE_TEMPLATE = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/03-tiles/wbs/templates/tile/TASK.md';
const COMPOSITE_TEMPLATE = '.converge/playbooks/default/tasks/05-scenes/wbs/templates/scene/wbs/templates/03-tiles/wbs/templates/composite/TASK.md';

export async function run(ctx) {
  const { vars } = ctx;
  const sceneId = vars.scene_id;
  let tileIds = [];
  try {
    tileIds = JSON.parse(vars.tile_variant_ids || '[]');
  } catch (err) {
    console.log(`  ⚠️  could not parse tile_variant_ids (${err.message}) — skipping`);
    return;
  }
  if (!tileIds.length) {
    console.log('  tile_variant_ids empty — no tiles to generate for this scene');
    return;
  }

  const batchTag = `scene-${sceneId}-tile`;
  for (const tileId of tileIds) {
    const taskId = `scene-${sceneId}-tile-${tileId}`;
    await ctx.spawn(
      {
        _type: 'template-ref',
        path: TILE_TEMPLATE,
        vars: { scene_id: sceneId, tile_id: tileId, tile_batch_tag: batchTag },
      },
      { id: taskId }
    );
    console.log(`    ✓ ${taskId}`);
  }

  const compositeId = `scene-${sceneId}-tilesheet`;
  await ctx.spawn(
    {
      _type: 'template-ref',
      path: COMPOSITE_TEMPLATE,
      vars: { scene_id: sceneId, tile_batch_tag: batchTag, tile_count: String(tileIds.length) },
    },
    { id: compositeId }
  );
  console.log(`    ✓ ${compositeId} (depends on tag:${batchTag})`);
}
