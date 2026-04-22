/**
 * WBS: Object Sheet Generation
 *
 * For each object × state, generate object sheets using Nano-banana.
 * Output: objectsheets/{obj_id}/{state}.png
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

  console.log(`  Generating object sheets`);

  const scriptPath = join(projectDir, 'scripts', 'generate_object_sheet.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const states = obj.states || ['idle'];

    for (let j = 0; j < states.length; j++) {
      const state = states[j];

      console.log(`    - ${obj.id}/${state}: ${obj.name}`);

      try {
        const args = [scriptPath, obj.id, obj.name, obj.type, state];

        await new Promise((resolve, reject) => {
          const child = spawn(pythonBin, args, {
            cwd: projectDir,
            env,
            stdio: 'inherit',
            shell: true,
          });
          child.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`python exited ${code}`));
          });
          child.on('error', reject);
        });
        successCount++;
      } catch (err) {
        console.error(`    Failed to generate object sheet for ${obj.name}/${state}: ${err.message}`);
        failCount++;
      }
    }
  }

  if (failCount > 0) {
    console.error(`  Generated ${successCount} sheet(s), ${failCount} failed`);
  } else {
    console.log(`  Generated ${successCount} object sheet(s)`);
  }
}
