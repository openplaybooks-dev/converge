/**
 * WBS: Animation Keyframes
 *
 * For each character × animation_state × frame, generate
 * animation keyframes using Nano-banana (Gemini 2.5 Flash Image).
 * Output: keyframes/{char_id}/{state}_{frame}.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  let totalGenerated = 0;

  console.log(`  Generating animation keyframes`);

  const scriptPath = join(projectDir, 'scripts', 'generate_keyframes.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  // Explicitly pass GEMINI_API_KEY — on Windows, spawn with shell:true doesn't inherit process.env correctly
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const animationStates = sprite.animation_states || ['idle'];

    for (let j = 0; j < animationStates.length; j++) {
      const state = animationStates[j];

      console.log(`    - ${sprite.id}/${state}: ${sprite.name}`);

      try {
        const cmd = `"${pythonBin}" "${scriptPath}" "${sprite.id}" "${sprite.name}" "${state}" "${sprite.palette}"`;

        await new Promise((resolve, reject) => {
          spawn(cmd, {
            cwd: projectDir,
            env,
            stdio: 'inherit',
            shell: true,
          }).on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`python exited ${code}`));
          }).on('error', reject);
        });
      } catch (err) {
        console.error(`    Failed to generate keyframes for ${sprite.name}/${state}: ${err.message}`);
      }

      totalGenerated++;
    }
  }

  console.log(`  Generated ${totalGenerated} animation sequence(s)`);
}
