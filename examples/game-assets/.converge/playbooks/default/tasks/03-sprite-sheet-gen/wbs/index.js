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

import { existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');

  if (!existsSync(spritesPath)) {
    console.log('  assets/sprites.json not found — skipping sprite sheet generation');
    return;
  }

  let sprites;
  try {
    sprites = JSON.parse(require('fs').readFileSync(spritesPath, 'utf-8'));
  } catch (err) {
    console.error(`  Failed to read assets/sprites.json: ${err.message}`);
    return;
  }

  if (!sprites || !sprites.length) {
    console.log('  sprites.json is empty — nothing to generate');
    return;
  }

  console.log(`  Generating sprite sheets from templates (AI-based)`);

  // Ensure templates exist
  const templateDir = join(projectDir, 'assets', 'global', 'templates');
  const defaultTemplate = join(templateDir, '4x4.png');

  if (!existsSync(defaultTemplate)) {
    console.log('    Creating default 4x4 template...');
    const createScript = join(projectDir, 'scripts', 'create_templates.py');
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

    await new Promise((resolve, reject) => {
      const child = spawn(pythonBin, [createScript, '--cols', '4', '--rows', '4', '--resolution', '128'], {
        cwd: projectDir,
        env: { ...process.env },
        stdio: 'inherit',
        shell: true,
      });
      child.on('close', (code) => code === 0 ? resolve() : reject(new Error(`exit ${code}`)));
      child.on('error', reject);
    });
  }

  const scriptPath = join(projectDir, 'scripts', 'generate_sprite_sheet_from_template.py');
  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  let successCount = 0;
  let failCount = 0;

  for (const sprite of sprites) {
    const animationStates = sprite.animation_states || ['idle'];
    const framesPerState = sprite.frames_per_state || 4;
    const spritesPerRow = sprite.sprites_per_row || 4;

    for (const state of animationStates) {
      console.log(`    - ${sprite.id}/${state}: ${sprite.name} (${framesPerState} frames, ${spritesPerRow}/row)`);

      try {
        const args = [scriptPath, sprite.id, state, '--template', `${spritesPerRow}x${Math.ceil(framesPerState / spritesPerRow)}`];

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
        console.error(`    Failed to generate sprite sheet for ${sprite.name}/${state}: ${err.message}`);
        failCount++;
      }
    }
  }

  if (failCount > 0) {
    console.error(`  Generated ${successCount} sheet(s), ${failCount} failed`);
  } else {
    console.log(`  Generated ${successCount} sprite sheet(s)`);
  }
}