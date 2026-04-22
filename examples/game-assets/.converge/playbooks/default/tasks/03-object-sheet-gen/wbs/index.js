/**
 * WBS: Object Sheet Generation
 *
 * For each object × state, generate object sheets using Nano-banana.
 * Output: objectsheets/{obj_id}/{state}.png
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const objectsPath = join(projectDir, 'objects.json');
  const objects = JSON.parse(readFileSync(objectsPath, 'utf-8'));

  let totalGenerated = 0;

  console.log(`  📦 Generating object sheets`);

  // Use Python script for image generation
  const scriptPath = join(projectDir, 'scripts', 'generate_object_sheet.py');

  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    const states = obj.states || ['idle'];

    for (let j = 0; j < states.length; j++) {
      const state = states[j];

      console.log(`    - ${obj.id}/${state}: ${obj.name}`);

      try {
        // Call the Python script to generate the object sheet
        const cmd = `/Users/minh/.pyenv/versions/3.9.2/bin/python3 "${scriptPath}" "${obj.id}" "${obj.name}" "${obj.type}" "${state}"`;

        execSync(cmd, {
          cwd: projectDir,
          env: { ...process.env },
          stdio: 'inherit',
        });
      } catch (err) {
        console.error(`    ❌ Failed to generate object sheet for ${obj.name}/${state}: ${err.message}`);
      }

      totalGenerated++;
    }
  }

  console.log(`  ✅ Generated ${totalGenerated} object sheet(s)`);
}
