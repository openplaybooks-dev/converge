/**
 * WBS: Export Ready — Slice sprite sheets, generate atlas metadata
 *
 * For each character, export frame metadata and atlas JSON
 * in engine-specific formats (raw, godot, unity).
 * Output: assets/characters/{char_id}/{state}/frames.json + atlas files
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  console.log(`  Exporting sprite sheets and generating atlas metadata`);

  const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');

  // Build env with explicit GEMINI_API_KEY
  const env = { ...process.env, GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' };

  // Step 1: Export frame metadata (slice sprite sheets, generate frames.json)
  const exportScript = join(projectDir, 'scripts', 'export_frames_meta.py');

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const animationStates = sprite.animation_states || ['idle'];

    console.log(`    - ${sprite.id}: ${sprite.name}`);

    // Check if spritesheets exist
    const spritesheetDir = join(projectDir, 'assets', 'characters', sprite.id);
    if (!existsSync(spritesheetDir)) {
      console.log(`      assets/characters/${sprite.id}/ not found — skipping`);
      continue;
    }

    try {
      const cmd = `"${pythonBin}" "${exportScript}" "${sprite.id}"`;

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
      console.error(`      Failed to export frames for ${sprite.name}: ${err.message}`);
    }
  }

  // Step 2: Export atlas metadata for each character
  const exportMetaScript = join(projectDir, 'scripts', 'export_metadata.py');

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const charDir = join(projectDir, 'assets', 'characters', sprite.id);

    if (!existsSync(charDir)) {
      continue;
    }

    console.log(`    - ${sprite.id}: generating atlas files`);

    try {
      const cmd = `"${pythonBin}" "${exportMetaScript}" "${sprite.id}" characters --engine godot --engine unity --engine raw`;

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
      console.error(`      Failed to export atlas for ${sprite.name}: ${err.message}`);
    }
  }

  console.log(`  Export complete`);
}