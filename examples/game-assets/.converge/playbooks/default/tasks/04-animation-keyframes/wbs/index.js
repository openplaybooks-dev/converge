/**
 * WBS: Animation Keyframes
 *
 * For each character × animation_state, spawn a subtask to generate
 * animation keyframes using Nano-banana (Gemini 2.5 Flash Image).
 * Output: assets/characters/{char_id}/{state}/frames/*.png
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');

  if (!existsSync(spritesPath)) {
    console.log('  assets/sprites.json not found — skipping animation keyframes generation');
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
    console.log('  sprites.json is empty — nothing to generate');
    return;
  }

  console.log(`  Spawning animation keyframe tasks for ${sprites.length} character(s)`);

  let taskIndex = 0;

  for (const sprite of sprites) {
    const animationStates = sprite.animation_states || ['idle'];

    for (const state of animationStates) {
      taskIndex++;
      const taskId = String(taskIndex).padStart(3, '0') + `-${sprite.id}-${state}`;

      console.log(`    - Spawning task: ${taskId} (${sprite.name}/${state})`);

      await ctx.spawn({
        id: taskId,
        title: `Animation Keyframes: ${sprite.name} - ${state}`,
        vars: {
          id: taskId,
          charId: sprite.id,
          charName: sprite.name,
          state: state,
          palette: sprite.palette || '16-bit retro, limited to 16 colors',
        },
      });
    }
  }

  console.log(`  Spawned ${taskIndex} animation keyframe task(s)`);
}
