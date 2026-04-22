/**
 * WBS: Character Reference Sheets
 *
 * For each character in sprites.json, generate locked character reference sheets
 * by calling the Python script directly (characters/{id}/ref.png).
 *
 * Uses Nano-banana (Gemini 2.5 Flash Image) for image generation.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  if (!sprites.length) {
    console.log('  ⚠️  sprites.json is empty — nothing to generate');
    return;
  }

  console.log(`  🎭 Generating reference sheets for ${sprites.length} character(s)`);

  // Use Python script for image generation
  const scriptPath = join(projectDir, 'scripts', 'generate_character_ref.py');

  for (let i = 0; i < sprites.length; i++) {
    const sprite = sprites[i];
    const prefix = String(i + 1).padStart(3, '0');

    console.log(`    - ${sprite.id}: ${sprite.name}`);

    try {
      // Call the Python script to generate the character ref
      const charDescription = sprite.description || `Character: ${sprite.name}`;
      const cmd = `/Users/minh/.pyenv/versions/3.9.2/bin/python3 "${scriptPath}" "${sprite.id}" "${sprite.name}" "${charDescription}" "${sprite.palette}"`;

      execSync(cmd, {
        cwd: projectDir,
        env: { ...process.env },
        stdio: 'inherit',
      });
    } catch (err) {
      console.error(`    ❌ Failed to generate ref for ${sprite.name}: ${err.message}`);
    }
  }

  console.log(`  ✅ Generated ${sprites.length} character reference sheet(s)`);
}
