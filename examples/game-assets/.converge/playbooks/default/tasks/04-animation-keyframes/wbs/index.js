/**
 * WBS: Animation Keyframes
 *
 * For each character × animation_state × frame, generate
 * animation keyframes using Nano-banana (Gemini 2.5 Flash Image).
 * Output: keyframes/{char_id}/{state}_{frame}.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  let totalGenerated = 0;

  console.log(`  🎞️  Generating animation keyframes`);

  // Use Python script for image generation
  const scriptPath = join(projectDir, 'scripts', 'generate_keyframes.py');

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const animationStates = sprite.animation_states || ['idle'];

    for (let j = 0; j < animationStates.length; j++) {
      const state = animationStates[j];

      console.log(`    - ${sprite.id}/${state}: ${sprite.name}`);

      try {
        // Call the Python script to generate keyframes
        const cmd = `/Users/minh/.pyenv/versions/3.9.2/bin/python3 "${scriptPath}" "${sprite.id}" "${sprite.name}" "${state}" "${sprite.palette}"`;

        execSync(cmd, {
          cwd: projectDir,
          env: { ...process.env },
          stdio: 'inherit',
        });
      } catch (err) {
        console.error(`    ❌ Failed to generate keyframes for ${sprite.name}/${state}: ${err.message}`);
      }

      totalGenerated++;
    }
  }

  console.log(`  ✅ Generated ${totalGenerated} animation sequence(s)`);
}
