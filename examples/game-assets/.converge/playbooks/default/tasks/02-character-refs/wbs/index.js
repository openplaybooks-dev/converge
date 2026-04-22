/**
 * WBS: Character Reference Sheets
 *
 * For each character in sprites.json, generate locked character reference sheets
 * using Nano-banana (Gemini 2.5 Flash Image).
 * Output: characters/{id}/ref.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  if (!sprites.length) {
    console.log('  sprites.json is empty — nothing to generate');
    return;
  }

  console.log(`  Generating reference sheets for ${sprites.length} character(s)`);

  const scriptPath = join(projectDir, 'scripts', 'generate_character_ref.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  // Explicitly pass GEMINI_API_KEY — on Windows, spawn with shell:true doesn't inherit process.env correctly
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];

    console.log(`    - ${sprite.id}: ${sprite.name}`);

    try {
      const charDescription = sprite.description || `Character: ${sprite.name}`;
      const cmd = `"${pythonBin}" "${scriptPath}" "${sprite.id}" "${sprite.name}" "${charDescription}" "${sprite.palette}"`;

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
      successCount++;
    } catch (err) {
      console.error(`    Failed to generate ref for ${sprite.name}: ${err.message}`);
      failCount++;
    }
  }

  if (failCount > 0) {
    console.error(`  Generated ${successCount} sheet(s), ${failCount} failed`);
  } else {
    console.log(`  Generated ${successCount} character reference sheet(s)`);
  }
}
