/**
 * WBS: Sprite Sheet Generation
 *
 * For each character × animation_state, generate sprite sheets
 * using Nano-banana (Gemini 2.5 Flash Image).
 * Output: spritesheets/{char_id}/{state}.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  let totalGenerated = 0;

  console.log(`  🎬 Generating sprite sheets`);

  // Use Python script for image generation
  const scriptPath = join(projectDir, 'scripts', 'generate_sprite_sheet.py');

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const animationStates = sprite.animation_states || ['idle'];

    for (let j = 0; j < animationStates.length; j++) {
      const state = animationStates[j];
      const prefix = String(totalGenerated + 1).padStart(3, '0');

      console.log(`    - ${sprite.id}/${state}: ${sprite.name}`);

      try {
        // Call the Python script to generate the sprite sheet
        const cmd = `/Users/minh/.pyenv/versions/3.9.2/bin/python3 "${scriptPath}" "${sprite.id}" "${sprite.name}" "${state}" "${sprite.palette}"`;

        execSync(cmd, {
          cwd: projectDir,
          env: { ...process.env },
          stdio: 'inherit',
        });
      } catch (err) {
        console.error(`    ❌ Failed to generate sprite sheet for ${sprite.name}/${state}: ${err.message}`);
      }

      totalGenerated++;
    }
  }

  console.log(`  ✅ Generated ${totalGenerated} sprite sheet(s)`);
}
