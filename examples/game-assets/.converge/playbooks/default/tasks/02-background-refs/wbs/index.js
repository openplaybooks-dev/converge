/**
 * WBS: Background Reference Sheets
 *
 * For each background in backgrounds.json, spawn subtasks to generate
 * locked background reference sheets (backgrounds/{id}/ref.png).
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export async function run(ctx) {
  const { projectDir } = ctx;

  const backgroundsPath = join(projectDir, 'backgrounds.json');
  const backgrounds = JSON.parse(readFileSync(backgroundsPath, 'utf-8'));

  if (!backgrounds.length) {
    console.log('  ⚠️  backgrounds.json is empty — nothing to generate');
    return;
  }

  console.log(`  🏞️  Spawning reference pipelines for ${backgrounds.length} background(s)`);

  for (let i = 0; i < backgrounds.length; i++) {
    const bg = backgrounds[i];
    const prefix = String(i + 1).padStart(3, '0');
    const bgTaskId = `${prefix}-${bg.id}`;

    const vars = {
      bgId: bg.id,
      bgName: bg.name,
      bgDescription: bg.description,
      parallaxLayer: bg.parallax_layer,
      resolution: JSON.stringify(bg.resolution || []),
    };

    await ctx.spawn({
      id: bgTaskId,
      title: `Background: ${bg.name}`,
      dependencies: [],
      tags: ['background', 'reference-sheet'],
      vars,
      body: `Generate locked reference sheet for ${bg.name} (${bg.id}). Layer: ${bg.parallax_layer}.`,
    });

    console.log(`    - ${bgTaskId}: ${bg.name}`);
  }

  console.log(`  ✅ Spawned ${backgrounds.length} background pipeline(s)`);
}
