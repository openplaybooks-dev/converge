/**
 * WBS: Background Reference Sheets
 *
 * For each background in backgrounds.json, generate locked background reference sheets
 * using Nano-banana (Gemini 2.5 Flash Image).
 * Output: backgrounds/{id}/ref.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const backgroundsPath = join(projectDir, 'assets', 'backgrounds.json');
  const backgrounds = JSON.parse(readFileSync(backgroundsPath, 'utf-8'));

  if (!backgrounds.length) {
    console.log('  backgrounds.json is empty — nothing to generate');
    return;
  }

  console.log(`  Generating reference sheets for ${backgrounds.length} background(s)`);

  const scriptPath = join(projectDir, 'scripts', 'generate_background_ref.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  for (let i = 0; i < backgrounds.length; i++) {
    const bg = backgrounds[i];
    const prefix = String(i + 1).padStart(3, '0');

    console.log(`    - ${bg.id}: ${bg.name}`);

    try {
      const cmd = `"${pythonBin}" "${scriptPath}" "${bg.id}" "${bg.name}" "${bg.description}" "${bg.parallax_layer}"`;

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
      console.error(`    Failed to generate ref for ${bg.name}: ${err.message}`);
    }
  }

  console.log(`  Generated ${backgrounds.length} background reference sheet(s)`);
}
