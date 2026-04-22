/**
 * WBS: Export Ready — Slice sprite sheets, generate atlas metadata
 *
 * For each character, export frame metadata and atlas JSON
 * in engine-specific formats (raw, godot, unity).
 * Output: assets/characters/{char_id}/{state}/frames.json + atlas files
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');
  
  if (!existsSync(spritesPath)) {
    console.log('  assets/sprites.json not found — skipping export');
    return;
  }

  let sprites;
  try {
    sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));
  } catch (err) {
    console.error(`  Failed to read assets/sprites.json: ${err.message}`);
    return;
  }

  if (!sprites || !sprites.length) {
    console.log('  sprites.json is empty — nothing to export');
    return;
  }

  console.log(`  Spawning export tasks for ${sprites.length} character(s)`);

  let taskIndex = 0;

  for (const sprite of sprites) {
    taskIndex++;
    const taskId = String(taskIndex).padStart(3, '0') + `-${sprite.id}`;

    console.log(`    - Spawning task: ${taskId} (${sprite.name})`);

    await ctx.spawn({
      id: taskId,
      title: `Export Atlas: ${sprite.name}`,
      vars: {
        id: taskId,
        charId: sprite.id,
        charName: sprite.name,
        animationStates: (sprite.animation_states || ['idle']).join(','),
      },
    });
  }

  console.log(`  Spawned ${taskIndex} export task(s)`);
}
