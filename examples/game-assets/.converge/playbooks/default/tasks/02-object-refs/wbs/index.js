/**
 * WBS: Object Reference Sheets
 *
 * For each object in objects.json, generate locked object reference sheets
 * using Nano-banana (Gemini 2.5 Flash Image).
 * Output: objects/{id}/ref.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const objectsPath = join(projectDir, 'assets', 'objects.json');
  const objects = JSON.parse(readFileSync(objectsPath, 'utf-8'));

  if (!objects.length) {
    console.log('  objects.json is empty — nothing to generate');
    return;
  }

  console.log(`  Generating reference sheets for ${objects.length} object(s)`);

  const scriptPath = join(projectDir, 'scripts', 'generate_object_ref.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];

    console.log(`    - ${obj.id}: ${obj.name}`);

    try {
      const cmd = `"${pythonBin}" "${scriptPath}" "${obj.id}" "${obj.name}" "${obj.description}" "${obj.type}"`;

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
      console.error(`    Failed to generate ref for ${obj.name}: ${err.message}`);
      failCount++;
    }
  }

  if (failCount > 0) {
    console.error(`  Generated ${successCount} sheet(s), ${failCount} failed`);
  } else {
    console.log(`  Generated ${successCount} object reference sheet(s)`);
  }
}
