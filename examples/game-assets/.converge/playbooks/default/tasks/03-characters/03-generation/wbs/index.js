/**
 * WBS: Character Generation
 *
 * For each character in sprites.json, spawn a complete pipeline:
 * 1. Spec validation
 * 2. Angle references
 * 3. Pose variations (WBS)
 * 4. Animation states (WBS)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const WBS_ROOT = '.converge/playbooks/default/tasks/05-character-generation/wbs/templates';

export async function run(ctx) {
  const { projectDir } = ctx;

  const spritesPath = join(projectDir, 'assets', 'sprites.json');
  const sprites = JSON.parse(readFileSync(spritesPath, 'utf-8'));

  if (!sprites.length) {
    console.log('  No characters in sprites.json');
    return;
  }

  console.log(`  Spawning pipelines for ${sprites.length} character(s)\n`);

  for (const sprite of sprites) {
    const charId = sprite.id;

    console.log(`  📦 ${sprite.name} (${charId})`);

    // Common variables for all tasks
    const baseVars = {
      char_id: charId,
      char_name: sprite.name,
      char_description: sprite.description || `Character: ${sprite.name}`,
      palette: sprite.palette,
      animation_states: JSON.stringify(sprite.animation_states || ['idle', 'walk']),
    };

    const basePath = `.converge/playbooks/default/tasks/05-character-generation/tasks/${charId}`;

    // Task 1: Spec
    const specTaskId = `${charId}-01-spec`;
    const specTemplatePath = `${WBS_ROOT}/character/01-spec/TASK.md`;
    const specWritePath = `${basePath}/${specTaskId}/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: specTemplatePath, vars: baseVars },
      { id: specTaskId, writeToPath: specWritePath }
    );
    console.log(`    ✓ ${specTaskId}`);

    // Task 2: Angles
    const anglesTaskId = `${charId}-02-angles`;
    const anglesTemplatePath = `${WBS_ROOT}/character/02-angles/TASK.md`;
    const anglesWritePath = `${basePath}/${anglesTaskId}/TASK.md`;

    await ctx.spawn(
      { _type: 'template-ref', path: anglesTemplatePath, vars: baseVars },
      { id: anglesTaskId, writeToPath: anglesWritePath }
    );
    console.log(`    ✓ ${anglesTaskId}`);

    // Task 3: Poses (WBS)
    const posesTaskId = `${charId}-03-poses`;
    const posesWbsPath = `${WBS_ROOT}/character/03-poses/wbs/index.js`;
    const posesWritePath = `${basePath}/${posesTaskId}/TASK.md`;

    await ctx.spawn(
      {
        _type: 'wbs-ref',
        path: posesWbsPath,
        vars: baseVars,
        title: `Generate ${sprite.name} poses`,
        description: 'Generate pose variations (attack, defend, jump)',
      },
      { id: posesTaskId, writeToPath: posesWritePath }
    );
    console.log(`    ✓ ${posesTaskId} (WBS)`);

    // Task 4: States (WBS)
    const statesTaskId = `${charId}-04-states`;
    const statesWbsPath = `${WBS_ROOT}/character/04-states/wbs/index.js`;
    const statesWritePath = `${basePath}/${statesTaskId}/TASK.md`;

    await ctx.spawn(
      {
        _type: 'wbs-ref',
        path: statesWbsPath,
        vars: baseVars,
        title: `Generate ${sprite.name} animation states`,
        description: 'Generate sprite sheets for each animation state',
      },
      { id: statesTaskId, writeToPath: statesWritePath }
    );
    console.log(`    ✓ ${statesTaskId} (WBS)`);

    console.log('');
  }

  console.log(`  ✅ Spawned ${sprites.length} character pipeline(s)`);
}
