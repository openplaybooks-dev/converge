/**
 * WBS: Sprite Sheet Generation (Template-Based)
 *
 * For each character × animation_state, generate sprite sheets using AI
 * with template + atlas spec + ref image.
 *
 * New flow:
 * 1. Create template if not exists (4x4 grid)
 * 2. AI fills template according to sprites.json atlas spec
 * 3. Output: spritesheets/{char_id}/{state}.png
 *
 * Reference: scripts/generate_sprite_sheet_from_template.py
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');

  if (!existsSync(spritesPath)) {
    console.log('  assets/sprites.json not found — skipping sprite sheet generation');
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

  console.log(`  Spawning sprite sheet generation tasks for ${sprites.length} character(s)`);

  let taskIndex = 0;

  for (const sprite of sprites) {
    const animationStates = sprite.animation_states || ['idle'];
    const framesPerState = sprite.frames_per_state || 4;
    const spritesPerRow = sprite.sprites_per_row || 4;

    for (const state of animationStates) {
      taskIndex++;
      const taskId = String(taskIndex).padStart(3, '0') + `-${sprite.id}-${state}`;
      const template = `${spritesPerRow}x${Math.ceil(framesPerState / spritesPerRow)}`;

      console.log(`    - Spawning task: ${taskId} (${sprite.name}/${state})`);

      await ctx.spawn({
        id: taskId,
        title: `Sprite Sheet: ${sprite.name} - ${state}`,
        vars: {
          id: taskId,
          charId: sprite.id,
          charName: sprite.name,
          state: state,
          framesPerState: String(framesPerState),
          spritesPerRow: String(spritesPerRow),
          template: template,
        },
      });
    }
  }

  console.log(`  Spawned ${taskIndex} sprite sheet generation task(s)`);
}